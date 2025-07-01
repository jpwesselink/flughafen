import { WorkflowValidator } from "../validation";
import type { ValidationOptions, WorkflowValidationResult } from "../validation";

/**
 * Options for the validate operation
 */
export interface ValidateWorkflowOptions extends ValidationOptions {
	/** Files to validate (if not provided, all workflow files will be validated) */
	files?: string[];
}

/**
 * Result of the validate operation
 */
export interface ValidateWorkflowResult {
	/** Total number of files validated */
	filesValidated: number;
	/** Number of files that passed validation */
	filesPassed: number;
	/** Number of files that failed validation */
	filesFailed: number;
	/** Total number of errors across all files */
	totalErrors: number;
	/** Total number of warnings across all files */
	totalWarnings: number;
	/** Detailed validation results for each file */
	results: WorkflowValidationResult[];
	/** Overall validation success */
	success: boolean;
}

/**
 * Validate workflow files
 *
 * This is a programmatic API for validating workflow files. For CLI usage,
 * use the @flughafen/cli package instead.
 */
export async function validate(options: ValidateWorkflowOptions = {}): Promise<ValidateWorkflowResult> {
	const { files = [], ...validationOptions } = options;

	const validator = new WorkflowValidator();
	const results = await validator.validateFiles(files, validationOptions);

	// Calculate summary statistics
	const filesValidated = results.length;
	const filesPassed = results.filter(r => r.valid).length;
	const filesFailed = filesValidated - filesPassed;
	const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
	const success = filesFailed === 0;

	return {
		filesValidated,
		filesPassed,
		filesFailed,
		totalErrors,
		totalWarnings,
		results,
		success,
	};
}