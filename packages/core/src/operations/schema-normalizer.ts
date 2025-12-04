import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface JSONSchema {
	$ref?: string;
	type?: string | string[];
	oneOf?: JSONSchema[];
	anyOf?: JSONSchema[];
	properties?: Record<string, JSONSchema>;
	definitions?: Record<string, JSONSchema>;
	items?: JSONSchema;
	[key: string]: unknown;
}

interface NormalizationRule {
	path: string;
	expandStringToObject?: { wrapIn: string }; // e.g., "name"
	expandStringToArray?: boolean;
}

/**
 * Pre-computed normalization rules extracted from GitHub Actions schema
 */
class SchemaNormalizer {
	private rules: Map<string, NormalizationRule> = new Map();
	private schema: JSONSchema | null = null;

	constructor() {
		this.loadSchema();
		this.extractRules();
	}

	private loadSchema(): void {
		try {
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);

			// Try multiple paths to handle both source and bundled contexts
			const possiblePaths = [
				join(__dirname, "../../schemas/github-workflow.schema.json"), // From src/operations/
				join(__dirname, "../schemas/github-workflow.schema.json"), // From dist/
			];

			for (const schemaPath of possiblePaths) {
				try {
					const schemaContent = readFileSync(schemaPath, "utf-8");
					this.schema = JSON.parse(schemaContent);
					return;
				} catch {
					// Try next path
				}
			}

			// No path worked
			console.warn("Could not load GitHub Actions schema for normalization: schema file not found");
		} catch (error) {
			// Fallback: schema not available, use empty rules
			console.warn("Could not load GitHub Actions schema for normalization:", error);
		}
	}

	private extractRules(): void {
		if (!this.schema) return;

		// Extract rules from job properties
		const jobDef = this.resolveRef(this.schema, "#/definitions/normalJob");
		if (jobDef?.properties) {
			this.extractPropertyRules("jobs.*", jobDef.properties);
		}
	}

	private extractPropertyRules(basePath: string, properties: Record<string, JSONSchema>): void {
		for (const [propName, propSchema] of Object.entries(properties)) {
			const fullPath = `${basePath}.${propName}`;

			// Check for oneOf patterns
			if (propSchema.oneOf) {
				const rule = this.analyzeOneOf(fullPath, propSchema.oneOf);
				if (rule) {
					this.rules.set(propName, rule);
				}
			}

			// Handle $ref
			if (propSchema.$ref) {
				const resolved = this.resolveRef(this.schema ?? {}, propSchema.$ref);
				if (resolved?.oneOf) {
					const rule = this.analyzeOneOf(fullPath, resolved.oneOf);
					if (rule) {
						this.rules.set(propName, rule);
					}
				}
			}
		}
	}

	private analyzeOneOf(path: string, oneOf: JSONSchema[]): NormalizationRule | null {
		// Pattern 1: [string, array] → normalize string to array
		// Example: needs: "job" → needs: ["job"]
		const hasString = oneOf.some((s) => s.type === "string" || this.isStringRef(s));
		const hasArray = oneOf.some((s) => s.type === "array");

		if (hasString && hasArray) {
			return { path, expandStringToArray: true };
		}

		// Pattern 2: [string, object] → normalize string to {name: string}
		// Example: environment: "prod" → environment: {name: "prod"}
		const hasObject = oneOf.some((s) => s.type === "object" || this.isObjectRef(s));

		if (hasString && hasObject) {
			// Check if object has a "name" field (common pattern)
			const objectSchema = oneOf.find((s) => s.type === "object" || this.isObjectRef(s));
			if (objectSchema) {
				const resolved = objectSchema.$ref ? this.resolveRef(this.schema ?? {}, objectSchema.$ref) : objectSchema;
				if (resolved?.properties?.name) {
					return { path, expandStringToObject: { wrapIn: "name" } };
				}
			}
		}

		return null;
	}

	private isStringRef(schema: JSONSchema): boolean {
		if (!schema.$ref) return false;
		const resolved = this.resolveRef(this.schema ?? {}, schema.$ref);
		return resolved?.type === "string";
	}

	private isObjectRef(schema: JSONSchema): boolean {
		if (!schema.$ref) return false;
		const resolved = this.resolveRef(this.schema ?? {}, schema.$ref);
		return resolved?.type === "object";
	}

	private resolveRef(schema: JSONSchema, ref: string): JSONSchema | null {
		if (!ref.startsWith("#/definitions/")) return null;
		const defName = ref.substring("#/definitions/".length);
		return schema.definitions?.[defName] || null;
	}

	/**
	 * Check if a property accepts both string and object/array formats
	 * Returns the rule for this property, or null if no rule exists
	 */
	getRule(propertyName: string): NormalizationRule | null {
		return this.rules.get(propertyName) || null;
	}

	/**
	 * Check if a property can be either a string OR an object
	 */
	canBeStringOrObject(propertyName: string): boolean {
		const rule = this.rules.get(propertyName);
		return rule?.expandStringToObject !== undefined;
	}

	/**
	 * Check if a property can be either a string OR an array
	 */
	canBeStringOrArray(propertyName: string): boolean {
		const rule = this.rules.get(propertyName);
		return rule?.expandStringToArray !== undefined;
	}

	/**
	 * Normalize a workflow object according to extracted schema rules
	 */
	normalize(workflow: Record<string, unknown>): Record<string, unknown> {
		if (!workflow || typeof workflow !== "object") {
			return workflow;
		}

		const normalized = { ...workflow };

		// Normalize jobs
		if (normalized.jobs && typeof normalized.jobs === "object") {
			const normalizedJobs: Record<string, unknown> = {};

			for (const [jobId, job] of Object.entries(normalized.jobs as Record<string, unknown>)) {
				if (job && typeof job === "object") {
					normalizedJobs[jobId] = this.normalizeJob(job as Record<string, unknown>);
				} else {
					normalizedJobs[jobId] = job;
				}
			}

			normalized.jobs = normalizedJobs;
		}

		return normalized;
	}

	private normalizeJob(job: Record<string, unknown>): Record<string, unknown> {
		const normalized = { ...job };

		// Apply rules for each property
		for (const [propName, value] of Object.entries(normalized)) {
			const rule = this.rules.get(propName);
			if (!rule) continue;

			if (rule.expandStringToArray && typeof value === "string") {
				normalized[propName] = [value];
			} else if (rule.expandStringToObject && typeof value === "string") {
				normalized[propName] = { [rule.expandStringToObject.wrapIn]: value };
			}
		}

		return normalized;
	}
}

// Singleton instance - loaded once at module initialization
const normalizer = new SchemaNormalizer();

/**
 * Normalize workflow according to GitHub Actions schema
 * Uses pre-computed rules for performance
 */
export function normalizeWorkflowBySchema(workflow: Record<string, unknown>): Record<string, unknown> {
	return normalizer.normalize(workflow);
}

/**
 * Check if a property can accept both string and object formats
 * according to the GitHub Actions schema (oneOf pattern)
 */
export function canPropertyBeStringOrObject(propertyName: string): boolean {
	return normalizer.canBeStringOrObject(propertyName);
}

/**
 * Check if a property can accept both string and array formats
 * according to the GitHub Actions schema (oneOf pattern)
 */
export function canPropertyBeStringOrArray(propertyName: string): boolean {
	return normalizer.canBeStringOrArray(propertyName);
}

/**
 * Get the normalization rule for a property
 */
export function getPropertyRule(propertyName: string): NormalizationRule | null {
	return normalizer.getRule(propertyName);
}
