import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

/**
 * Workflow structure validator
 * Validates workflow structure and configuration requirements
 */
export class StructureValidator {
	/**
	 * Validate workflow structure
	 */
	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		// Skip YAML files - these checks are for TypeScript builder patterns
		if (context.filePath.endsWith(".yml") || context.filePath.endsWith(".yaml")) {
			return;
		}

		try {
			const { content, filePath, options } = context;

			// Check for required workflow elements
			if (!content.includes(".name(")) {
				result.warnings.push({
					path: filePath,
					message: "Workflow should have a name",
					severity: "warning",
					rule: "workflow-name",
				});
			}

			if (!content.includes(".on(")) {
				result.errors.push({
					path: filePath,
					message: "Workflow must have trigger events",
					severity: "error",
					rule: "workflow-triggers",
				});
			}

			if (!content.includes(".job(")) {
				result.errors.push({
					path: filePath,
					message: "Workflow must have at least one job",
					severity: "error",
					rule: "workflow-jobs",
				});
			}

			// Strict mode validations
			if (options.strict) {
				if (!content.includes(".runsOn(")) {
					result.errors.push({
						path: filePath,
						message: "All jobs must specify runs-on in strict mode",
						severity: "error",
						rule: "strict-runs-on",
					});
				}
			}
		} catch (error) {
			result.errors.push({
				path: context.filePath,
				message: `Structure validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "structure-error",
			});
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateStructure: ValidatorFunction = (context, result) => {
	const validator = new StructureValidator();
	validator.validate(context, result);
};
