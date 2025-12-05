import { type ActionSchema, ActionSchemaFetcher } from "../../../schema/fetchers/ActionSchemaFetcher";
import type { ActionReference } from "../../../schema/managers/WorkflowScanner";

export interface ActionValidationError {
	location: string;
	action: string;
	message: string;
	suggestion?: string;
}

export interface ActionValidationWarning {
	location: string;
	action: string;
	message: string;
	suggestion?: string;
}

export interface ActionValidationResult {
	valid: boolean;
	errors: ActionValidationError[];
	warnings: ActionValidationWarning[];
}

export interface WorkflowActionReference extends ActionReference {
	/** Input values provided in the workflow */
	inputs: Record<string, string | number | boolean>;
	/** Location in workflow for error reporting */
	location: string;
	/** Step name for context */
	stepName?: string;
	/** Job ID for context */
	jobId: string;
}

/**
 * Validates external GitHub Actions used in workflows
 * Reuses ActionSchemaFetcher infrastructure but adds validation-specific logic
 */
export class ExternalActionValidator {
	private actionFetcher: ActionSchemaFetcher;

	constructor(fetcher?: ActionSchemaFetcher) {
		// Use provided fetcher OR create our own with validation-optimized config
		this.actionFetcher =
			fetcher ||
			new ActionSchemaFetcher({
				cacheTtl: 60 * 60 * 1000, // 1 hour cache for validation
				timeout: 5000, // Shorter timeout for validation
			});
	}

	/**
	 * Validate all external actions used in a workflow
	 */
	async validateWorkflowActions(workflow: Record<string, unknown>): Promise<ActionValidationResult> {
		const errors: ActionValidationError[] = [];
		const warnings: ActionValidationWarning[] = [];

		try {
			// Extract action references from raw YAML workflow
			const actionRefs = this.extractActionReferences(workflow);

			if (actionRefs.length === 0) {
				return { valid: true, errors, warnings };
			}

			// Fetch schemas using existing infrastructure
			const schemas = await this.actionFetcher.fetchSchemas(
				actionRefs.map((ref) => ({
					action: ref.action,
					owner: ref.owner,
					name: ref.name,
					version: ref.version,
					usageContexts: [ref.location],
				}))
			);

			// Build schema map for O(1) lookup
			const schemaMap = new Map(schemas.map((s) => [s.action, s]));

			// Validate each action usage against its schema
			for (const actionRef of actionRefs) {
				const schema = schemaMap.get(actionRef.action);
				const result = this.validateSingleAction(actionRef, schema);

				errors.push(...result.errors);
				warnings.push(...result.warnings);
			}
		} catch (error) {
			errors.push({
				location: "workflow",
				action: "unknown",
				message: `Failed to validate external actions: ${error instanceof Error ? error.message : String(error)}`,
				suggestion: "Check network connection and GitHub API access",
			});
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Extract action references from raw YAML workflow
	 * Custom implementation for validation (vs. the existing one for type generation)
	 */
	private extractActionReferences(workflow: Record<string, unknown>): WorkflowActionReference[] {
		const actionRefs: WorkflowActionReference[] = [];

		if (!workflow || !workflow.jobs) {
			return actionRefs;
		}

		for (const [jobId, job] of Object.entries(workflow.jobs as Record<string, any>)) {
			// Skip workflow calls (jobs with 'uses' at job level)
			if (job.uses) {
				continue;
			}

			// Process normal jobs with steps
			if (job.steps && Array.isArray(job.steps)) {
				for (const [stepIndex, step] of job.steps.entries()) {
					if (step.uses && typeof step.uses === "string") {
						const actionRef = this.parseActionReference(step.uses);
						if (actionRef) {
							actionRefs.push({
								...actionRef,
								inputs: step.with || {},
								location: `jobs.${jobId}.steps[${stepIndex}]`,
								stepName: step.name,
								jobId,
								usageContexts: [`job:${jobId}`, `step:${step.name || stepIndex}`],
							});
						}
					}
				}
			}
		}

		return actionRefs;
	}

	/**
	 * Parse action reference string into components
	 */
	private parseActionReference(actionString: string): ActionReference | null {
		// Handle different formats:
		// - "actions/checkout@v4"
		// - "owner/repo@ref"
		// - "owner/repo/path@ref"
		// - "./local/path" (skip - local actions)

		if (actionString.startsWith("./") || actionString.startsWith("../")) {
			return null; // Local action, skip
		}

		const parts = actionString.split("@");
		if (parts.length !== 2) {
			return null; // Invalid format
		}

		const [actionPath, version] = parts;
		const pathParts = actionPath.split("/");

		if (pathParts.length < 2) {
			return null; // Need at least owner/name
		}

		const owner = pathParts[0];
		const name = pathParts[1];

		return {
			action: actionString,
			owner,
			name,
			version,
			usageContexts: [],
		};
	}

	/**
	 * Validate a single action usage against its schema
	 */
	private validateSingleAction(
		actionRef: WorkflowActionReference,
		schema: ActionSchema | undefined
	): ActionValidationResult {
		const errors: ActionValidationError[] = [];
		const warnings: ActionValidationWarning[] = [];

		// Check if schema was fetched successfully
		if (!schema) {
			errors.push({
				location: actionRef.location,
				action: actionRef.action,
				message: `Action '${actionRef.action}' not found or inaccessible`,
				suggestion: "Verify the action exists and the version/ref is correct",
			});
			return { valid: false, errors, warnings };
		}

		// Validate required inputs
		if (schema.inputs) {
			for (const [inputName, inputDef] of Object.entries(schema.inputs)) {
				// Required inputs with defaults don't need to be explicitly specified
				const hasDefault = inputDef.default !== undefined && inputDef.default !== null;
				if (inputDef.required && !hasDefault && !(inputName in actionRef.inputs)) {
					errors.push({
						location: actionRef.location,
						action: actionRef.action,
						message: `Missing required input '${inputName}' for action '${actionRef.action}'`,
						suggestion: `Add: with:\n  ${inputName}: <value>`,
					});
				}
			}
		}

		// Validate input types and unknown inputs
		for (const [inputName, inputValue] of Object.entries(actionRef.inputs)) {
			const inputDef = schema.inputs?.[inputName];

			if (!inputDef) {
				warnings.push({
					location: actionRef.location,
					action: actionRef.action,
					message: `Unknown input '${inputName}' for action '${actionRef.action}'`,
					suggestion: "Check action documentation for valid inputs",
				});
				continue;
			}

			// Type validation
			const typeError = this.validateInputType(inputName, inputValue, inputDef);
			if (typeError) {
				errors.push({
					location: actionRef.location,
					action: actionRef.action,
					message: typeError,
					suggestion: `Expected ${inputDef.type || "string"} value`,
				});
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate input value against expected type
	 */
	private validateInputType(
		inputName: string,
		value: string | number | boolean,
		inputDef: { type?: string; options?: string[]; default?: unknown; required?: boolean }
	): string | null {
		// Skip validation for expressions (GitHub expressions are strings at parse time)
		if (typeof value === "string" && (value.includes("${{") || value.includes("${{"))) {
			return null; // GitHub expression, can't validate at parse time
		}

		const expectedType = inputDef.type || "string";
		const actualType = typeof value;

		switch (expectedType) {
			case "boolean":
				// Boolean inputs often accept string values (e.g., "recursive" for submodules)
				// Since action.yml doesn't have a formal type system, accept strings
				if (actualType !== "boolean" && actualType !== "string") {
					return `Input '${inputName}' expects boolean or string, got ${actualType}`;
				}
				break;

			case "number":
				if (actualType !== "number" && Number.isNaN(Number(value))) {
					return `Input '${inputName}' expects number, got ${actualType}`;
				}
				break;

			case "choice":
				if (inputDef.options && !inputDef.options.includes(String(value))) {
					return `Input '${inputName}' must be one of: ${inputDef.options.join(", ")}`;
				}
				break;
			default:
				// String is most flexible, accept most types
				if (actualType === "object" && value !== null) {
					return `Input '${inputName}' expects string, got object`;
				}
				break;
		}

		return null; // Valid
	}

	/**
	 * Clear the action schema cache
	 */
	clearCache(): void {
		this.actionFetcher.clearCache();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return this.actionFetcher.getCacheStats();
	}
}
