import { BuilderConfigurationError } from "./BuilderConfigurationError";
import { CompilationError } from "./CompilationError";
import { ErrorCode } from "./error-codes";
import { FileSystemError } from "./FileSystemError";
import { SandboxExecutionError } from "./SandboxExecutionError";

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
	value: unknown,
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
