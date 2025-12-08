/**
 * Validation system types
 */

export interface ValidationContext {
	/** File path being validated */
	filePath: string;
	/** File content */
	content: string;
	/** Validation options */
	options: ValidationOptions;
}

/**
 * Validation categories that can be ignored
 *
 * - schema: JSON schema validation (syntax, structure, required fields)
 * - security: Security checks (vulnerabilities, hardcoded secrets, injection risks)
 */
export type ValidationRule = "schema" | "security";

export interface ValidationOptions {
	/** Rules to ignore (suppress errors/warnings for these rules) */
	ignore?: ValidationRule[];
	/** Enable verbose output */
	verbose?: boolean;
	/** Silent mode - suppress non-essential output */
	silent?: boolean;
}

export interface WorkflowValidationResult {
	/** File path that was validated */
	file: string;
	/** Whether validation passed */
	valid: boolean;
	/** Validation errors */
	errors: WorkflowValidationError[];
	/** Validation warnings */
	warnings: WorkflowValidationWarning[];
	/** Validation duration in milliseconds */
	durationMs?: number;
}

export interface WorkflowValidationError {
	/** File path where error occurred */
	path: string;
	/** Error message */
	message: string;
	/** Severity level */
	severity: "error";
	/** Rule that generated this error */
	rule?: string;
}

export interface WorkflowValidationWarning {
	/** File path where warning occurred */
	path: string;
	/** Warning message */
	message: string;
	/** Severity level */
	severity: "warning";
	/** Rule that generated this warning */
	rule?: string;
}

export type ValidatorFunction = (context: ValidationContext, result: WorkflowValidationResult) => Promise<void> | void;
