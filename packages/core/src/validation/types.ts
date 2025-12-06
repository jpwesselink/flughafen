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

export interface ValidationOptions {
	/** Enable strict validation mode */
	strict?: boolean;
	/** Enable verbose output */
	verbose?: boolean;
	/** Silent mode - suppress non-essential output */
	silent?: boolean;
	/** Skip vulnerability checks against GitHub Advisory Database */
	skipVulnerabilityCheck?: boolean;
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
