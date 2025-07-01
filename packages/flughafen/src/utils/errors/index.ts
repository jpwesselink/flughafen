export enum ErrorCode {
	// Builder/Configuration Errors
	BUILDER_CONFIGURATION_ERROR = "BUILDER_CONFIGURATION_ERROR",
	INVALID_JOB_CONFIGURATION = "INVALID_JOB_CONFIGURATION",
	INVALID_STEP_CONFIGURATION = "INVALID_STEP_CONFIGURATION",
	INVALID_ACTION_CONFIGURATION = "INVALID_ACTION_CONFIGURATION",
	MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

	// Compilation Errors
	TYPESCRIPT_COMPILATION_ERROR = "TYPESCRIPT_COMPILATION_ERROR",
	SYNTAX_ERROR = "SYNTAX_ERROR",
	MODULE_RESOLUTION_ERROR = "MODULE_RESOLUTION_ERROR",

	// File System Errors
	FILE_NOT_FOUND = "FILE_NOT_FOUND",
	FILE_READ_ERROR = "FILE_READ_ERROR",
	FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
	DIRECTORY_CREATE_ERROR = "DIRECTORY_CREATE_ERROR",
	PERMISSION_ERROR = "PERMISSION_ERROR",

	// Processing Errors
	WORKFLOW_PROCESSING_ERROR = "WORKFLOW_PROCESSING_ERROR",
	INVALID_WORKFLOW_EXPORT = "INVALID_WORKFLOW_EXPORT",
	CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY",

	// Network/Schema Errors
	SCHEMA_FETCH_ERROR = "SCHEMA_FETCH_ERROR",
	NETWORK_ERROR = "NETWORK_ERROR",
	SCHEMA_PARSE_ERROR = "SCHEMA_PARSE_ERROR",

	// Validation Errors
	WORKFLOW_VALIDATION_ERROR = "WORKFLOW_VALIDATION_ERROR",
	YAML_PARSE_ERROR = "YAML_PARSE_ERROR",
	SCHEMA_VALIDATION_ERROR = "SCHEMA_VALIDATION_ERROR",

	// Sandbox Execution Errors
	SANDBOX_EXECUTION_ERROR = "SANDBOX_EXECUTION_ERROR",
	SANDBOX_TIMEOUT = "SANDBOX_TIMEOUT",
	SANDBOX_PERMISSION_ERROR = "SANDBOX_PERMISSION_ERROR",
}

export interface ErrorContext {
	[key: string]: any;
}

export abstract class FlughafenError extends Error {
	readonly code: ErrorCode;
	readonly context?: ErrorContext;
	readonly suggestions?: string[];
	readonly cause?: Error;

	constructor(message: string, code: ErrorCode, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.context = context;
		this.suggestions = suggestions;
		this.cause = cause;

		// Maintains proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	toString(): string {
		let result = `${this.name}: ${this.message}`;

		if (this.context && Object.keys(this.context).length > 0) {
			result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
		}

		if (this.suggestions && this.suggestions.length > 0) {
			result += `\nSuggestions:\n${this.suggestions.map((s) => `  - ${s}`).join("\n")}`;
		}

		return result;
	}
}

export class BuilderConfigurationError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.BUILDER_CONFIGURATION_ERROR, context, suggestions, cause);
	}
}

export class CompilationError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.TYPESCRIPT_COMPILATION_ERROR, context, suggestions, cause);
	}
}

export class FileSystemError extends FlughafenError {}

export class ProcessingError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.WORKFLOW_PROCESSING_ERROR, context, suggestions, cause);
	}
}

export class NetworkError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.NETWORK_ERROR, context, suggestions, cause);
	}
}

export class FlughafenValidationError extends FlughafenError {}

export class SandboxExecutionError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.SANDBOX_EXECUTION_ERROR, context, suggestions, cause);
	}
}

// Helper functions for creating common errors
export const createFileNotFoundError = (filePath: string, cause?: Error): FileSystemError => {
	return new FileSystemError(
		`File not found: ${filePath}`,
		ErrorCode.FILE_NOT_FOUND,
		{ filePath },
		[
			"Check that the file exists and the path is correct",
			"Verify you have read permissions for the file",
			"Use an absolute path if using a relative path",
		],
		cause
	);
};

export const createCompilationError = (filePath: string, details: string, cause?: Error): CompilationError => {
	return new CompilationError(
		`Failed to compile TypeScript file '${filePath}': ${details}`,
		{ filePath, details },
		[
			"Check for TypeScript syntax errors in the file",
			"Verify all imports are available and correctly spelled",
			"Run TypeScript compiler directly to see detailed errors",
		],
		cause
	);
};

export const createBuilderConfigurationError = (
	field: string,
	value: any,
	reason: string
): BuilderConfigurationError => {
	return new BuilderConfigurationError(`Invalid configuration for '${field}': ${reason}`, { field, value, reason }, [
		`Review the documentation for the '${field}' property`,
		"Check for typos in property names",
		"Verify the value type matches the expected type",
	]);
};

export const createSandboxExecutionError = (
	operation: string,
	details: string,
	cause?: Error
): SandboxExecutionError => {
	return new SandboxExecutionError(
		`Sandbox execution failed during ${operation}: ${details}`,
		{ operation, details },
		[
			"Check that the workflow file exports a valid WorkflowBuilder",
			"Verify all imports are available in the sandbox context",
			"Review the workflow file for runtime errors",
		],
		cause
	);
};
