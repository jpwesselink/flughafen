import * as fs from "node:fs/promises";
import * as path from "node:path";
import { extractModuleExports } from "../../utils/module-extractor";
import { compileTypeScriptFile } from "../../utils/typescript-compiler";
import { type ActionSchema, ActionSchemaFetcher } from "./ActionSchemaFetcher";
import { type GeneratedInterface, TypeGenerator } from "./TypeGenerator";
import { type ActionReference, WorkflowScanner } from "./WorkflowScanner";

/**
 * Configuration for the schema manager
 */
export interface SchemaManagerConfig {
	/** Directory to scan for workflow files */
	workflowDir?: string;
	/** Output path for the generated types file */
	typesFilePath?: string;
	/** Whether to watch for changes and auto-regenerate */
	watch?: boolean;
	/** GitHub token for API access */
	githubToken?: string;
	/** Whether to include JSDoc comments */
	includeJSDoc?: boolean;
	/** Cache directory for schemas */
	cacheDir?: string;
}

/**
 * Result of a schema generation operation
 */
export interface GenerationResult {
	/** Number of actions processed */
	actionsProcessed: number;
	/** Number of schemas fetched successfully */
	schemasFetched: number;
	/** Number of interfaces generated */
	interfacesGenerated: number;
	/** Path to the generated types file */
	typesFilePath: string;
	/** List of actions that failed to fetch */
	failedActions: string[];
	/** Generated interfaces */
	interfaces: GeneratedInterface[];
}

/**
 * Orchestrates the entire schema-to-types workflow
 */
export class SchemaManager {
	private config: Required<SchemaManagerConfig>;
	private scanner: WorkflowScanner;
	private fetcher: ActionSchemaFetcher;
	private generator: TypeGenerator;

	constructor(config: SchemaManagerConfig = {}) {
		this.config = {
			workflowDir: config.workflowDir || process.cwd(),
			typesFilePath: config.typesFilePath || "./flughafen-actions.d.ts",
			watch: config.watch || false,
			githubToken: config.githubToken || process.env.GITHUB_TOKEN || "",
			includeJSDoc: config.includeJSDoc ?? true,
			cacheDir: config.cacheDir || ".flughafen-cache",
		};

		this.scanner = new WorkflowScanner();
		this.fetcher = new ActionSchemaFetcher({
			githubToken: this.config.githubToken,
			cacheDir: this.config.cacheDir,
		});
		this.generator = new TypeGenerator({
			includeJSDoc: this.config.includeJSDoc,
		});
	}

	/**
	 * Generate types from workflow files in the specified directory
	 */
	async generateTypesFromWorkflowFiles(): Promise<GenerationResult> {
		const workflowFiles = await this.findWorkflowFiles();
		const actionRefs = await this.scanWorkflowFiles(workflowFiles);

		return this.generateTypesFromActions(actionRefs);
	}

	/**
	 * Generate types from a list of action references
	 */
	async generateTypesFromActions(actionRefs: ActionReference[]): Promise<GenerationResult> {
		const uniqueActions = this.deduplicateActions(actionRefs);

		console.log(`🔍 Processing ${uniqueActions.length} unique actions...`);

		// Fetch schemas
		const schemas: ActionSchema[] = [];
		const failedActions: string[] = [];

		for (const actionRef of uniqueActions) {
			try {
				const schema = await this.fetcher.fetchSchema(actionRef);
				if (schema) {
					schemas.push(schema);
					console.log(`✅ Fetched schema for ${actionRef.action}`);
				} else {
					failedActions.push(actionRef.action);
					console.log(`❌ Failed to fetch schema for ${actionRef.action}`);
				}
			} catch (error) {
				failedActions.push(actionRef.action);
				console.log(`❌ Error fetching ${actionRef.action}:`, error);
			}
		}

		// Generate interfaces
		const interfaces = this.generator.generateInterfaces(schemas);
		console.log(`🏗️  Generated ${interfaces.length} TypeScript interfaces`);

		// Write types file
		await this.writeTypesFile(interfaces);
		console.log(`📄 Types written to ${this.config.typesFilePath}`);

		return {
			actionsProcessed: uniqueActions.length,
			schemasFetched: schemas.length,
			interfacesGenerated: interfaces.length,
			typesFilePath: this.config.typesFilePath,
			failedActions,
			interfaces,
		};
	}

	/**
	 * Generate types from workflow builders (in-memory)
	 */
	async generateTypesFromWorkflows(workflows: any[]): Promise<GenerationResult> {
		const allActionRefs: ActionReference[] = [];

		for (const workflow of workflows) {
			const actionRefs = this.scanner.scanWorkflow(workflow);
			allActionRefs.push(...actionRefs);
		}

		return this.generateTypesFromActions(allActionRefs);
	}

	/**
	 * Generate types from specific workflow files
	 */
	async generateTypesFromSpecificFiles(files: string[]): Promise<GenerationResult> {
		// Resolve file paths relative to current working directory
		const resolvedFiles = files.map((file) => path.resolve(file));

		// Check that all files exist
		for (const file of resolvedFiles) {
			try {
				await fs.access(file);
			} catch {
				throw new Error(`File not found: ${file}`);
			}
		}

		const actionRefs = await this.scanWorkflowFiles(resolvedFiles);
		return this.generateTypesFromActions(actionRefs);
	}

	/**
	 * Find all workflow files in the configured directory
	 */
	private async findWorkflowFiles(): Promise<string[]> {
		const workflowFiles: string[] = [];

		// Common workflow directories
		const searchPaths = [
			path.join(this.config.workflowDir, ".github/workflows"),
			path.join(this.config.workflowDir, "workflows"),
			path.join(this.config.workflowDir, "src"),
			this.config.workflowDir,
		];

		for (const searchPath of searchPaths) {
			try {
				const exists = await fs
					.access(searchPath)
					.then(() => true)
					.catch(() => false);
				if (!exists) continue;

				const entries = await fs.readdir(searchPath, { withFileTypes: true });

				for (const entry of entries) {
					if (entry.isFile()) {
						const filePath = path.join(searchPath, entry.name);

						// Look for TypeScript/JavaScript files that might contain workflows
						if (/\.(ts|js|yml|yaml)$/.test(entry.name)) {
							workflowFiles.push(filePath);
						}
					}
				}
			} catch (_error) {
				// Ignore directories that don't exist or can't be read
			}
		}

		return workflowFiles;
	}

	/**
	 * Scan workflow files for action references
	 */
	private async scanWorkflowFiles(filePaths: string[]): Promise<ActionReference[]> {
		const allActionRefs: ActionReference[] = [];

		for (const filePath of filePaths) {
			try {
				if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
					// For TypeScript/JavaScript files, compile and execute them to get workflow configs
					const actionRefs = await this.scanTypeScriptWorkflowFile(filePath);
					allActionRefs.push(...actionRefs);
				} else if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
					// Parse YAML workflow files
					const content = await fs.readFile(filePath, "utf-8");
					const actionRefs = this.scanner.scanWorkflowYaml(content);
					allActionRefs.push(...actionRefs);
				}
			} catch (error) {
				console.warn(`⚠️  Failed to scan ${filePath}:`, error);
			}
		}

		return allActionRefs;
	}

	/**
	 * Scan a TypeScript workflow file for action references
	 */
	private async scanTypeScriptWorkflowFile(filePath: string): Promise<ActionReference[]> {
		try {
			// Compile TypeScript to CommonJS
			const compiledCode = compileTypeScriptFile(filePath);

			// Execute in sandbox to get the workflow instance
			const flughafenModule = await this.loadFlughafenModule();
			const { moduleExports } = extractModuleExports(compiledCode, filePath, {
				additionalGlobals: {
					__preloadedFlughafen: flughafenModule,
				},
			});

			// Extract workflow from exports (could be default export or named export)
			let workflow = moduleExports.default || moduleExports.workflow;

			if (!workflow) {
				// Try to find any exported workflow builder
				for (const value of Object.values(moduleExports)) {
					if (value && typeof value === "object" && "build" in value && typeof (value as any).build === "function") {
						workflow = value;
						break;
					}
				}
			}

			if (!workflow) {
				console.warn(`⚠️  No workflow found in ${filePath}`);
				return [];
			}

			// Scan the workflow for actions
			return this.scanner.scanWorkflow(workflow);
		} catch (error) {
			console.warn(`⚠️  Failed to process TypeScript workflow ${filePath}:`, error);
			return [];
		}
	}

	/**
	 * Load the flughafen module dynamically with proper path resolution
	 */
	private async loadFlughafenModule(): Promise<any> {
		try {
			// Try different import paths depending on the environment
			const importPaths = [
				"../index.js", // From dist/cli/cli.mjs to dist/index.mjs
				"../../index.js", // From src to src/index.ts
				"flughafen", // Package import (if available)
			];

			for (const importPath of importPaths) {
				try {
					return await import(importPath);
				} catch (_error) {
					// Ignore import errors and try the next path
				}
			}

			throw new Error("Could not find flughafen module");
		} catch (error) {
			throw new Error(`Failed to load flughafen module: ${error}`);
		}
	}

	/**
	 * Deduplicate action references
	 */
	private deduplicateActions(actionRefs: ActionReference[]): ActionReference[] {
		const seen = new Set<string>();
		const unique: ActionReference[] = [];

		for (const actionRef of actionRefs) {
			if (!seen.has(actionRef.action)) {
				seen.add(actionRef.action);
				unique.push(actionRef);
			}
		}

		return unique;
	}

	/**
	 * Write the generated types to the output file
	 */
	private async writeTypesFile(interfaces: GeneratedInterface[]): Promise<void> {
		const dtsContent = this.generator.generateTypeFile(interfaces);

		// The generateTypeFile now includes everything - interfaces and module augmentation
		const fullContent = dtsContent;

		// Ensure the directory exists
		const dir = path.dirname(this.config.typesFilePath);
		await fs.mkdir(dir, { recursive: true });

		// Write the file
		await fs.writeFile(this.config.typesFilePath, fullContent, "utf-8");
	}

	/**
	 * Clear the schema cache
	 */
	clearCache(): void {
		this.fetcher.clearCache();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return this.fetcher.getCacheStats();
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<SchemaManagerConfig>): void {
		Object.assign(this.config, newConfig);

		// Update sub-components if needed
		if (newConfig.githubToken !== undefined) {
			this.fetcher = new ActionSchemaFetcher({
				githubToken: newConfig.githubToken,
				cacheDir: this.config.cacheDir,
			});
		}

		if (newConfig.includeJSDoc !== undefined) {
			this.generator = new TypeGenerator({
				includeJSDoc: newConfig.includeJSDoc,
			});
		}
	}
}

// Export convenience instance
export const schemaManager = new SchemaManager();
