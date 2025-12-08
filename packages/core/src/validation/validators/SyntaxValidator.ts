import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

/**
 * Syntax validator
 * Validates basic TypeScript/JavaScript syntax and workflow patterns
 */
export class SyntaxValidator {
	/**
	 * Validate syntax
	 */
	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		const { content, filePath } = context;

		// Skip YAML files - this validator is for TypeScript/JavaScript only
		if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
			return;
		}

		try {
			// Basic check for common syntax issues
			if (content.trim().length === 0) {
				result.warnings.push({
					path: filePath,
					message: "File is empty",
					severity: "warning",
					rule: "schema",
				});
				return;
			}

			// Check for basic TypeScript/JavaScript patterns
			if (!content.includes("createWorkflow") && !content.includes("export")) {
				result.warnings.push({
					path: filePath,
					message: "File does not appear to contain a workflow definition",
					severity: "warning",
					rule: "schema",
				});
			}

			// Check for default export
			if (!content.includes("export default")) {
				result.warnings.push({
					path: filePath,
					message: "Workflow file should have a default export",
					severity: "warning",
					rule: "schema",
				});
			}

			// Check for unclosed parentheses/brackets/braces
			const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
			const bracketCount = (content.match(/\[/g) || []).length - (content.match(/\]/g) || []).length;
			const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;

			if (parenCount !== 0) {
				result.errors.push({
					path: filePath,
					message: `Unmatched parentheses detected (${parenCount > 0 ? "unclosed" : "extra closing"})`,
					severity: "error",
					rule: "schema",
				});
			}

			if (bracketCount !== 0) {
				result.errors.push({
					path: filePath,
					message: `Unmatched brackets detected (${bracketCount > 0 ? "unclosed" : "extra closing"})`,
					severity: "error",
					rule: "schema",
				});
			}

			if (braceCount !== 0) {
				result.errors.push({
					path: filePath,
					message: `Unmatched braces detected (${braceCount > 0 ? "unclosed" : "extra closing"})`,
					severity: "error",
					rule: "schema",
				});
			}

			// Check for common import/require patterns
			const hasImports = content.includes("import ") || content.includes("require(");
			const hasFlughafenImport = content.includes("@flughafen/core") || content.includes("createWorkflow");

			if (!hasImports && content.includes("createWorkflow")) {
				result.warnings.push({
					path: filePath,
					message: "Missing import statement for @flughafen/core",
					severity: "warning",
					rule: "schema",
				});
			}

			if (hasImports && !hasFlughafenImport && content.includes("createWorkflow")) {
				result.warnings.push({
					path: filePath,
					message: "createWorkflow used but @flughafen/core not imported",
					severity: "warning",
					rule: "schema",
				});
			}
		} catch (error) {
			result.errors.push({
				path: context.filePath,
				message: `Syntax validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "schema",
			});
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateSyntax: ValidatorFunction = (context, result) => {
	const validator = new SyntaxValidator();
	validator.validate(context, result);
};
