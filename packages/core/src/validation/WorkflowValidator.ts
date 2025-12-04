import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { TypeAwareExpressionValidator, type TypeAwareValidationContext } from "../schema/expressions";
import type { ValidationContext, ValidationOptions, ValidatorFunction, WorkflowValidationResult } from "./types";
import { validateBestPractices } from "./validators/BestPracticesValidator";
import { validateSecurity } from "./validators/SecurityValidator";
import { validateStructure } from "./validators/StructureValidator";
import { validateSyntax } from "./validators/SyntaxValidator";
import { validateTypeScript } from "./validators/TypeScriptValidator";

/**
 * Main workflow validator that orchestrates all validation checks
 */
export class WorkflowValidator {
	private validators: ValidatorFunction[] = [];

	constructor() {
		// Register default validators
		this.registerValidator(validateSyntax);
		this.registerValidator(validateTypeScript);
		this.registerValidator(validateStructure);
		this.registerValidator(validateSecurity);
		this.registerValidator(validateBestPractices);
	}

	/**
	 * Register a custom validator function
	 */
	registerValidator(validator: ValidatorFunction): void {
		this.validators.push(validator);
	}

	/**
	 * Remove all registered validators
	 */
	clearValidators(): void {
		this.validators = [];
	}

	/**
	 * Validate a single workflow file
	 */
	async validateFile(filePath: string, options: ValidationOptions = {}): Promise<WorkflowValidationResult> {
		const result: WorkflowValidationResult = {
			file: filePath,
			valid: true,
			errors: [],
			warnings: [],
		};

		try {
			// Check if file exists
			if (!existsSync(filePath)) {
				result.valid = false;
				result.errors.push({
					path: filePath,
					message: "File does not exist",
					severity: "error",
					rule: "file-exists",
				});
				return result;
			}

			// Read file content
			const content = await readFile(filePath, "utf-8");

			// Create validation context
			const context: ValidationContext = {
				filePath,
				content,
				options,
			};

			// Run all registered validators
			for (const validator of this.validators) {
				await validator(context, result);
			}

			// Run expression validation if content has expressions
			await this.validateExpressions(context, result);

			// Determine if validation passed
			result.valid = result.errors.length === 0;
		} catch (error) {
			result.valid = false;
			result.errors.push({
				path: filePath,
				message: error instanceof Error ? error.message : "Unknown validation error",
				severity: "error",
				rule: "validation-error",
			});
		}

		return result;
	}

	/**
	 * Validate multiple workflow files
	 */
	async validateFiles(filePaths: string[], options: ValidationOptions = {}): Promise<WorkflowValidationResult[]> {
		const results: WorkflowValidationResult[] = [];

		for (const filePath of filePaths) {
			const result = await this.validateFile(filePath, options);
			results.push(result);
		}

		return results;
	}

	/**
	 * Validate GitHub Actions expressions in workflow content
	 */
	private async validateExpressions(context: ValidationContext, result: WorkflowValidationResult): Promise<void> {
		try {
			const expressionValidator = new TypeAwareExpressionValidator();

			// Extract all ${{ }} expressions from the content
			const expressionPattern = /\$\{\{([^}]+)\}\}/g;
			const expressions = [];
			let match: RegExpExecArray | null = expressionPattern.exec(context.content);

			while (match !== null) {
				expressions.push({
					full: match[0],
					expression: match[1].trim(),
					position: match.index,
				});
				match = expressionPattern.exec(context.content);
			}

			if (expressions.length === 0) {
				return; // No expressions to validate
			}

			// Create workflow context from content analysis
			const workflowContext = this.analyzeWorkflowContext(context.content);

			// Create type-aware context
			const typeContext: TypeAwareValidationContext = {
				...workflowContext,
				// Note: Full action interface data not available in validation context
				// For now, we use basic type-aware validation without full interface schemas
				actionInterfaces: undefined,
			};

			// Validate each expression
			for (const expr of expressions) {
				const validationResult = expressionValidator.validateExpressionWithTypes(expr.full, typeContext);

				// Add errors
				for (const error of validationResult.errors) {
					result.errors.push({
						path: context.filePath,
						message: `Expression "${expr.expression}": ${error}`,
						severity: "error",
						rule: "expression-validation",
					});
				}

				// Add suggestions as warnings
				const allSuggestions = [...validationResult.suggestions, ...validationResult.typeSuggestions];

				for (const suggestion of allSuggestions) {
					result.warnings.push({
						path: context.filePath,
						message: `Expression "${expr.expression}": ${suggestion}`,
						severity: "warning",
						rule: "expression-suggestion",
					});
				}
			}
		} catch (error) {
			result.errors.push({
				path: context.filePath,
				message: `Expression validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "expression-validation-error",
			});
		}
	}

	/**
	 * Analyze workflow content to create validation context
	 */
	private analyzeWorkflowContext(content: string): TypeAwareValidationContext {
		// Extract event type from triggers
		let eventType = "push"; // default
		const onMatch = content.match(/\.on\(['"]([^'"]+)['"]/);
		if (onMatch) {
			eventType = onMatch[1];
		}

		// Extract job names
		const jobMatches = content.match(/\.job\(['"]([^'"]+)['"]/g) || [];
		const availableJobs = jobMatches
			.map((match) => {
				const jobMatch = match.match(/\.job\(['"]([^'"]+)['"]/);
				return jobMatch ? jobMatch[1] : "";
			})
			.filter(Boolean);

		// Extract step IDs (basic extraction)
		const stepMatches = content.match(/\.id\(['"]([^'"]+)['"]/g) || [];
		const availableSteps = stepMatches
			.map((match) => {
				const stepMatch = match.match(/\.id\(['"]([^'"]+)['"]/);
				return stepMatch ? stepMatch[1] : "";
			})
			.filter(Boolean);

		return {
			eventType,
			availableJobs,
			availableSteps,
			currentJob: undefined, // Could be enhanced to track current job context
			environment: undefined,
		};
	}
}
