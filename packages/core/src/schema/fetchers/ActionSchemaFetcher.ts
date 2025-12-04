import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";
import type { ActionReference } from "../managers/WorkflowScanner";

/**
 * Represents a GitHub Action's input definition
 */
export interface ActionInput {
	/** Input description */
	description?: string;
	/** Whether the input is required */
	required?: boolean;
	/** Default value */
	default?: string | number | boolean;
	/** Input type hint (not always present in action.yml) */
	type?: "string" | "number" | "boolean" | "choice";
	/** Allowed choices for choice inputs */
	options?: string[];
}

/**
 * Represents a GitHub Action's output definition
 */
export interface ActionOutput {
	/** Output description */
	description?: string;
}

/**
 * Raw action.yml input definition (before parsing)
 */
interface ActionInputDef {
	description?: string;
	required?: boolean | string;
	default?: string | number | boolean;
	type?: string;
	options?: string[];
	choices?: string[];
}

/**
 * Represents a GitHub Action's complete schema
 */
export interface ActionSchema {
	/** Action reference */
	action: string;
	/** Action name */
	name?: string;
	/** Action description */
	description?: string;
	/** Input definitions */
	inputs?: Record<string, ActionInput>;
	/** Output definitions */
	outputs?: Record<string, ActionOutput>;
	/** Whether the action runs using Node.js, Docker, or composite */
	runs?: {
		using: "node16" | "node18" | "node20" | "docker" | "composite";
	};
	/** Raw action.yml content for debugging */
	raw?: Record<string, unknown>;
}

/**
 * Configuration for the schema fetcher
 */
export interface SchemaFetcherConfig {
	/** GitHub token for API access (optional for public repos) */
	githubToken?: string;
	/** Custom GitHub API base URL (for GitHub Enterprise) */
	githubApiUrl?: string;
	/** Cache directory for storing fetched schemas */
	cacheDir?: string;
	/** Cache TTL in milliseconds (default: 1 hour) */
	cacheTtl?: number;
	/** Request timeout in milliseconds */
	timeout?: number;
}

/**
 * Fetches GitHub Action schemas from repositories
 */
export class ActionSchemaFetcher {
	private config: Required<SchemaFetcherConfig>;
	private cache = new Map<string, { schema: ActionSchema; timestamp: number }>();

	constructor(config: SchemaFetcherConfig = {}) {
		// Resolve cache directory to absolute path from current working directory
		const cacheDir = config.cacheDir || ".flughafen-cache";
		const absoluteCacheDir = path.isAbsolute(cacheDir) ? cacheDir : path.resolve(process.cwd(), cacheDir);

		this.config = {
			githubToken: config.githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "",
			githubApiUrl: config.githubApiUrl || "https://api.github.com",
			cacheDir: absoluteCacheDir,
			cacheTtl: config.cacheTtl || 60 * 60 * 1000, // 1 hour
			timeout: config.timeout || 10000, // 10 seconds
		};
	}

	/**
	 * Fetch schemas for multiple action references
	 */
	async fetchSchemas(actionRefs: ActionReference[]): Promise<ActionSchema[]> {
		const schemas: ActionSchema[] = [];

		for (const actionRef of actionRefs) {
			try {
				const schema = await this.fetchSchema(actionRef);
				if (schema) {
					schemas.push(schema);
				}
			} catch (error) {
				console.warn(`⚠️  Failed to fetch schema for ${actionRef.action}:`, error);
				// Create a minimal schema as fallback
				schemas.push(this.createFallbackSchema(actionRef));
			}
		}

		return schemas;
	}

	/**
	 * Fetch schema for a single action reference
	 */
	async fetchSchema(actionRef: ActionReference): Promise<ActionSchema | null> {
		const cacheKey = actionRef.action;

		// Check in-memory cache first
		const memCached = this.cache.get(cacheKey);
		if (memCached && Date.now() - memCached.timestamp < this.config.cacheTtl) {
			return memCached.schema;
		}

		// Check disk cache
		const diskCached = this.readDiskCache(cacheKey);
		if (diskCached && Date.now() - diskCached.timestamp < this.config.cacheTtl) {
			// Populate memory cache from disk
			this.cache.set(cacheKey, diskCached);
			return diskCached.schema;
		}

		try {
			// Fetch action.yml from GitHub API
			const actionYml = await this.fetchActionYml(actionRef);
			if (!actionYml) {
				return null;
			}

			// Parse the YAML content
			const schema = this.parseActionYml(actionRef, actionYml);

			// Cache the result (memory and disk)
			const cacheEntry = { schema, timestamp: Date.now() };
			this.cache.set(cacheKey, cacheEntry);
			this.writeDiskCache(cacheKey, cacheEntry);

			return schema;
		} catch (error) {
			console.error(`Failed to fetch schema for ${actionRef.action}:`, error);
			return null;
		}
	}

	/**
	 * Get the disk cache file path for a cache key
	 */
	private getDiskCachePath(cacheKey: string): string {
		// Sanitize the cache key for use as filename
		const safeKey = cacheKey.replace(/[^a-zA-Z0-9@-]/g, "_");
		return path.join(this.config.cacheDir, `${safeKey}.json`);
	}

	/**
	 * Read schema from disk cache
	 */
	private readDiskCache(cacheKey: string): { schema: ActionSchema; timestamp: number } | null {
		try {
			const cachePath = this.getDiskCachePath(cacheKey);
			if (!fs.existsSync(cachePath)) {
				return null;
			}
			const content = fs.readFileSync(cachePath, "utf-8");
			const parsed = JSON.parse(content);
			// Validate the parsed data has the expected structure
			if (!parsed || typeof parsed !== "object" || !parsed.schema || typeof parsed.timestamp !== "number") {
				return null;
			}
			return parsed;
		} catch {
			return null;
		}
	}

	/**
	 * Write schema to disk cache
	 */
	private writeDiskCache(cacheKey: string, entry: { schema: ActionSchema; timestamp: number }): void {
		try {
			// Ensure cache directory exists
			if (!fs.existsSync(this.config.cacheDir)) {
				fs.mkdirSync(this.config.cacheDir, { recursive: true });
			}
			const cachePath = this.getDiskCachePath(cacheKey);
			fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
		} catch {
			// Ignore disk cache write errors
		}
	}

	/**
	 * Fetch action.yml content from GitHub API
	 */
	private async fetchActionYml(actionRef: ActionReference): Promise<any | null> {
		const { owner, name, version } = actionRef;

		// Try both action.yml and action.yaml
		const filenames = ["action.yml", "action.yaml"];

		for (const filename of filenames) {
			try {
				const url = `${this.config.githubApiUrl}/repos/${owner}/${name}/contents/${filename}?ref=${version}`;

				const headers: Record<string, string> = {
					Accept: "application/vnd.github.v3+json",
					"User-Agent": "Flughafen-Schema-Fetcher/1.0",
				};

				if (this.config.githubToken) {
					headers.Authorization = `Bearer ${this.config.githubToken}`;
				}

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

				const response = await fetch(url, {
					headers,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					if (response.status === 404) {
						continue; // Try the next filename
					}
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = (await response.json()) as any;

				if (data.content) {
					// Decode base64 content
					const content = atob(data.content.replace(/\s/g, ""));
					return this.parseYaml(content);
				}
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					throw new Error(`Request timeout for ${actionRef.action}`);
				}
				// Continue to next filename or rethrow if it's the last one
				if (filename === filenames[filenames.length - 1]) {
					throw error;
				}
			}
		}

		return null;
	}

	/**
	 * Parse YAML content using the yaml library
	 */
	private parseYaml(content: string): Record<string, unknown> {
		try {
			return yaml.parse(content) as Record<string, unknown>;
		} catch (error) {
			console.warn("Failed to parse YAML:", error);
			throw new Error(`Invalid YAML content: ${error}`);
		}
	}

	/**
	 * Parse action.yml content into ActionSchema
	 */
	private parseActionYml(actionRef: ActionReference, actionYml: Record<string, unknown>): ActionSchema {
		const schema: ActionSchema = {
			action: actionRef.action,
			name: actionYml.name as string | undefined,
			description: actionYml.description as string | undefined,
			inputs: {},
			outputs: {},
			runs: actionYml.runs as ActionSchema["runs"],
			raw: actionYml,
		};

		// Parse inputs
		if (actionYml.inputs && typeof actionYml.inputs === "object") {
			for (const [inputName, inputDef] of Object.entries(actionYml.inputs as Record<string, ActionInputDef>)) {
				schema.inputs![inputName] = {
					description: inputDef.description,
					required: inputDef.required === true || inputDef.required === "true",
					default: inputDef.default,
					type: this.inferInputType(inputDef),
				};
			}
		}

		// Parse outputs
		if (actionYml.outputs && typeof actionYml.outputs === "object") {
			for (const [outputName, outputDef] of Object.entries(
				actionYml.outputs as Record<string, { description?: string }>
			)) {
				schema.outputs![outputName] = {
					description: outputDef.description,
				};
			}
		}

		return schema;
	}

	/**
	 * Infer input type from action.yml definition
	 */
	private inferInputType(inputDef: ActionInputDef): "string" | "number" | "boolean" | "choice" {
		// Check for explicit type (some actions specify this)
		if (inputDef.type) {
			return inputDef.type as "string" | "number" | "boolean" | "choice";
		}

		// Infer from default value
		if (inputDef.default !== undefined) {
			if (typeof inputDef.default === "boolean") return "boolean";
			if (typeof inputDef.default === "number") return "number";
		}

		// Check for options/choices
		if (inputDef.options || inputDef.choices) {
			return "choice";
		}

		// Default to string
		return "string";
	}

	/**
	 * Create a fallback schema when fetching fails
	 */
	private createFallbackSchema(actionRef: ActionReference): ActionSchema {
		return {
			action: actionRef.action,
			name: actionRef.name,
			description: `${actionRef.owner}/${actionRef.name} action`,
			inputs: {},
			outputs: {},
		};
	}

	/**
	 * Clear the cache (memory and disk)
	 */
	clearCache(): void {
		this.cache.clear();
		// Clear disk cache
		try {
			if (fs.existsSync(this.config.cacheDir)) {
				const files = fs.readdirSync(this.config.cacheDir);
				for (const file of files) {
					if (file.endsWith(".json")) {
						fs.unlinkSync(path.join(this.config.cacheDir, file));
					}
				}
			}
		} catch {
			// Ignore disk cache clear errors
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}
}

// Export convenience instance
export const actionSchemaFetcher = new ActionSchemaFetcher();

// Type tests moved to separate test file to avoid top-level await in production build
