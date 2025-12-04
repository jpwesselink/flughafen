import { describe, expect, it } from "vitest";
import {
	BuilderConfigurationError,
	CompilationError,
	createBuilderConfigurationError,
	createCompilationError,
	createFileNotFoundError,
	createSandboxExecutionError,
	ErrorCode,
	FileSystemError,
	FlughafenError,
	FlughafenValidationError,
	NetworkError,
	ProcessingError,
	SandboxExecutionError,
} from "../index";

describe("ErrorCode", () => {
	it("should define all error codes", () => {
		expect(ErrorCode.BUILDER_CONFIGURATION_ERROR).toBe("BUILDER_CONFIGURATION_ERROR");
		expect(ErrorCode.INVALID_JOB_CONFIGURATION).toBe("INVALID_JOB_CONFIGURATION");
		expect(ErrorCode.INVALID_STEP_CONFIGURATION).toBe("INVALID_STEP_CONFIGURATION");
		expect(ErrorCode.INVALID_ACTION_CONFIGURATION).toBe("INVALID_ACTION_CONFIGURATION");
		expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe("MISSING_REQUIRED_FIELD");
		expect(ErrorCode.TYPESCRIPT_COMPILATION_ERROR).toBe("TYPESCRIPT_COMPILATION_ERROR");
		expect(ErrorCode.SYNTAX_ERROR).toBe("SYNTAX_ERROR");
		expect(ErrorCode.MODULE_RESOLUTION_ERROR).toBe("MODULE_RESOLUTION_ERROR");
		expect(ErrorCode.FILE_NOT_FOUND).toBe("FILE_NOT_FOUND");
		expect(ErrorCode.FILE_READ_ERROR).toBe("FILE_READ_ERROR");
		expect(ErrorCode.FILE_WRITE_ERROR).toBe("FILE_WRITE_ERROR");
		expect(ErrorCode.DIRECTORY_CREATE_ERROR).toBe("DIRECTORY_CREATE_ERROR");
		expect(ErrorCode.PERMISSION_ERROR).toBe("PERMISSION_ERROR");
		expect(ErrorCode.WORKFLOW_PROCESSING_ERROR).toBe("WORKFLOW_PROCESSING_ERROR");
		expect(ErrorCode.INVALID_WORKFLOW_EXPORT).toBe("INVALID_WORKFLOW_EXPORT");
		expect(ErrorCode.CIRCULAR_DEPENDENCY).toBe("CIRCULAR_DEPENDENCY");
		expect(ErrorCode.SCHEMA_FETCH_ERROR).toBe("SCHEMA_FETCH_ERROR");
		expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
		expect(ErrorCode.SCHEMA_PARSE_ERROR).toBe("SCHEMA_PARSE_ERROR");
		expect(ErrorCode.WORKFLOW_VALIDATION_ERROR).toBe("WORKFLOW_VALIDATION_ERROR");
		expect(ErrorCode.YAML_PARSE_ERROR).toBe("YAML_PARSE_ERROR");
		expect(ErrorCode.SCHEMA_VALIDATION_ERROR).toBe("SCHEMA_VALIDATION_ERROR");
		expect(ErrorCode.SANDBOX_EXECUTION_ERROR).toBe("SANDBOX_EXECUTION_ERROR");
		expect(ErrorCode.SANDBOX_TIMEOUT).toBe("SANDBOX_TIMEOUT");
		expect(ErrorCode.SANDBOX_PERMISSION_ERROR).toBe("SANDBOX_PERMISSION_ERROR");
	});
});

describe("FlughafenError", () => {
	// Create a concrete implementation for testing
	class TestError extends FlughafenError {
		constructor(message: string, code: ErrorCode, context?: any, suggestions?: string[], cause?: Error) {
			super(message, code, context, suggestions, cause);
		}
	}

	it("should create error with basic properties", () => {
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR);

		expect(error.message).toBe("Test error");
		expect(error.code).toBe(ErrorCode.BUILDER_CONFIGURATION_ERROR);
		expect(error.name).toBe("TestError");
		expect(error.context).toBeUndefined();
		expect(error.suggestions).toBeUndefined();
		expect(error.cause).toBeUndefined();
	});

	it("should create error with context", () => {
		const context = { field: "name", value: 123 };
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, context);

		expect(error.context).toEqual(context);
	});

	it("should create error with suggestions", () => {
		const suggestions = ["Check the documentation", "Verify the field name"];
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create error with cause", () => {
		const cause = new Error("Original error");
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});

	it("should create error with all properties", () => {
		const context = { field: "name", value: 123 };
		const suggestions = ["Check the documentation", "Verify the field name"];
		const cause = new Error("Original error");
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, context, suggestions, cause);

		expect(error.message).toBe("Test error");
		expect(error.code).toBe(ErrorCode.BUILDER_CONFIGURATION_ERROR);
		expect(error.context).toEqual(context);
		expect(error.suggestions).toEqual(suggestions);
		expect(error.cause).toBe(cause);
	});

	it("should format error without context or suggestions", () => {
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR);
		const formatted = error.toString();

		expect(formatted).toBe("TestError: Test error");
	});

	it("should format error with context", () => {
		const context = { field: "name", value: 123 };
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, context);
		const formatted = error.toString();

		expect(formatted).toContain("TestError: Test error");
		expect(formatted).toContain("Context:");
		expect(formatted).toContain('"field": "name"');
		expect(formatted).toContain('"value": 123');
	});

	it("should format error with suggestions", () => {
		const suggestions = ["Check the documentation", "Verify the field name"];
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, undefined, suggestions);
		const formatted = error.toString();

		expect(formatted).toContain("TestError: Test error");
		expect(formatted).toContain("Suggestions:");
		expect(formatted).toContain("  - Check the documentation");
		expect(formatted).toContain("  - Verify the field name");
	});

	it("should format error with context and suggestions", () => {
		const context = { field: "name" };
		const suggestions = ["Check the documentation"];
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, context, suggestions);
		const formatted = error.toString();

		expect(formatted).toContain("TestError: Test error");
		expect(formatted).toContain("Context:");
		expect(formatted).toContain("Suggestions:");
	});

	it("should format error with empty context object", () => {
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, {});
		const formatted = error.toString();

		// Empty context should not be included
		expect(formatted).toBe("TestError: Test error");
	});

	it("should format error with empty suggestions array", () => {
		const error = new TestError("Test error", ErrorCode.BUILDER_CONFIGURATION_ERROR, undefined, []);
		const formatted = error.toString();

		// Empty suggestions should not be included
		expect(formatted).toBe("TestError: Test error");
	});
});

describe("BuilderConfigurationError", () => {
	it("should create builder configuration error", () => {
		const error = new BuilderConfigurationError("Invalid name");

		expect(error.message).toBe("Invalid name");
		expect(error.code).toBe(ErrorCode.BUILDER_CONFIGURATION_ERROR);
		expect(error.name).toBe("BuilderConfigurationError");
	});

	it("should create builder configuration error with context", () => {
		const context = { field: "name", value: null };
		const error = new BuilderConfigurationError("Invalid name", context);

		expect(error.context).toEqual(context);
	});

	it("should create builder configuration error with suggestions", () => {
		const suggestions = ["Provide a valid name"];
		const error = new BuilderConfigurationError("Invalid name", undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create builder configuration error with cause", () => {
		const cause = new Error("Original error");
		const error = new BuilderConfigurationError("Invalid name", undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});
});

describe("CompilationError", () => {
	it("should create compilation error", () => {
		const error = new CompilationError("Failed to compile");

		expect(error.message).toBe("Failed to compile");
		expect(error.code).toBe(ErrorCode.TYPESCRIPT_COMPILATION_ERROR);
		expect(error.name).toBe("CompilationError");
	});

	it("should create compilation error with context", () => {
		const context = { filePath: "/path/to/file.ts" };
		const error = new CompilationError("Failed to compile", context);

		expect(error.context).toEqual(context);
	});

	it("should create compilation error with suggestions", () => {
		const suggestions = ["Check syntax"];
		const error = new CompilationError("Failed to compile", undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create compilation error with cause", () => {
		const cause = new Error("Syntax error");
		const error = new CompilationError("Failed to compile", undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});
});

describe("FileSystemError", () => {
	it("should create file system error", () => {
		const error = new FileSystemError("File not found", ErrorCode.FILE_NOT_FOUND, { filePath: "/path/to/file" });

		expect(error.message).toBe("File not found");
		expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
		expect(error.name).toBe("FileSystemError");
		expect(error.context).toEqual({ filePath: "/path/to/file" });
	});

	it("should create file system error with different error codes", () => {
		const readError = new FileSystemError("Cannot read", ErrorCode.FILE_READ_ERROR);
		expect(readError.code).toBe(ErrorCode.FILE_READ_ERROR);

		const writeError = new FileSystemError("Cannot write", ErrorCode.FILE_WRITE_ERROR);
		expect(writeError.code).toBe(ErrorCode.FILE_WRITE_ERROR);

		const permError = new FileSystemError("Permission denied", ErrorCode.PERMISSION_ERROR);
		expect(permError.code).toBe(ErrorCode.PERMISSION_ERROR);
	});
});

describe("ProcessingError", () => {
	it("should create processing error", () => {
		const error = new ProcessingError("Failed to process workflow");

		expect(error.message).toBe("Failed to process workflow");
		expect(error.code).toBe(ErrorCode.WORKFLOW_PROCESSING_ERROR);
		expect(error.name).toBe("ProcessingError");
	});

	it("should create processing error with context", () => {
		const context = { workflow: "test.ts" };
		const error = new ProcessingError("Failed to process", context);

		expect(error.context).toEqual(context);
	});

	it("should create processing error with suggestions", () => {
		const suggestions = ["Check workflow structure"];
		const error = new ProcessingError("Failed to process", undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create processing error with cause", () => {
		const cause = new Error("Invalid export");
		const error = new ProcessingError("Failed to process", undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});
});

describe("NetworkError", () => {
	it("should create network error", () => {
		const error = new NetworkError("Failed to fetch");

		expect(error.message).toBe("Failed to fetch");
		expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
		expect(error.name).toBe("NetworkError");
	});

	it("should create network error with context", () => {
		const context = { url: "https://example.com" };
		const error = new NetworkError("Failed to fetch", context);

		expect(error.context).toEqual(context);
	});

	it("should create network error with suggestions", () => {
		const suggestions = ["Check internet connection"];
		const error = new NetworkError("Failed to fetch", undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create network error with cause", () => {
		const cause = new Error("Connection timeout");
		const error = new NetworkError("Failed to fetch", undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});
});

describe("FlughafenValidationError", () => {
	it("should create validation error", () => {
		const error = new FlughafenValidationError("Validation failed", ErrorCode.WORKFLOW_VALIDATION_ERROR, {
			field: "name",
		});

		expect(error.message).toBe("Validation failed");
		expect(error.code).toBe(ErrorCode.WORKFLOW_VALIDATION_ERROR);
		expect(error.name).toBe("FlughafenValidationError");
		expect(error.context).toEqual({ field: "name" });
	});

	it("should create validation error with different error codes", () => {
		const yamlError = new FlughafenValidationError("YAML error", ErrorCode.YAML_PARSE_ERROR);
		expect(yamlError.code).toBe(ErrorCode.YAML_PARSE_ERROR);

		const schemaError = new FlughafenValidationError("Schema error", ErrorCode.SCHEMA_VALIDATION_ERROR);
		expect(schemaError.code).toBe(ErrorCode.SCHEMA_VALIDATION_ERROR);
	});
});

describe("SandboxExecutionError", () => {
	it("should create sandbox execution error", () => {
		const error = new SandboxExecutionError("Execution failed");

		expect(error.message).toBe("Execution failed");
		expect(error.code).toBe(ErrorCode.SANDBOX_EXECUTION_ERROR);
		expect(error.name).toBe("SandboxExecutionError");
	});

	it("should create sandbox execution error with context", () => {
		const context = { operation: "load" };
		const error = new SandboxExecutionError("Execution failed", context);

		expect(error.context).toEqual(context);
	});

	it("should create sandbox execution error with suggestions", () => {
		const suggestions = ["Check workflow export"];
		const error = new SandboxExecutionError("Execution failed", undefined, suggestions);

		expect(error.suggestions).toEqual(suggestions);
	});

	it("should create sandbox execution error with cause", () => {
		const cause = new Error("Module not found");
		const error = new SandboxExecutionError("Execution failed", undefined, undefined, cause);

		expect(error.cause).toBe(cause);
	});
});

describe("createFileNotFoundError", () => {
	it("should create file not found error with path", () => {
		const error = createFileNotFoundError("/path/to/missing.ts");

		expect(error).toBeInstanceOf(FileSystemError);
		expect(error.message).toBe("File not found: /path/to/missing.ts");
		expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
		expect(error.context).toEqual({ filePath: "/path/to/missing.ts" });
		expect(error.suggestions).toHaveLength(3);
		expect(error.suggestions?.[0]).toBe("Check that the file exists and the path is correct");
		expect(error.suggestions?.[1]).toBe("Verify you have read permissions for the file");
		expect(error.suggestions?.[2]).toBe("Use an absolute path if using a relative path");
	});

	it("should create file not found error with cause", () => {
		const cause = new Error("ENOENT");
		const error = createFileNotFoundError("/path/to/missing.ts", cause);

		expect(error.cause).toBe(cause);
	});
});

describe("createCompilationError", () => {
	it("should create compilation error with details", () => {
		const error = createCompilationError("/path/to/workflow.ts", "Syntax error on line 10");

		expect(error).toBeInstanceOf(CompilationError);
		expect(error.message).toBe("Failed to compile TypeScript file '/path/to/workflow.ts': Syntax error on line 10");
		expect(error.context).toEqual({
			filePath: "/path/to/workflow.ts",
			details: "Syntax error on line 10",
		});
		expect(error.suggestions).toHaveLength(3);
		expect(error.suggestions?.[0]).toBe("Check for TypeScript syntax errors in the file");
		expect(error.suggestions?.[1]).toBe("Verify all imports are available and correctly spelled");
		expect(error.suggestions?.[2]).toBe("Run TypeScript compiler directly to see detailed errors");
	});

	it("should create compilation error with cause", () => {
		const cause = new Error("TS2304");
		const error = createCompilationError("/path/to/workflow.ts", "Cannot find name 'foo'", cause);

		expect(error.cause).toBe(cause);
	});
});

describe("createBuilderConfigurationError", () => {
	it("should create builder configuration error with field and reason", () => {
		const error = createBuilderConfigurationError("name", null, "Name cannot be null");

		expect(error).toBeInstanceOf(BuilderConfigurationError);
		expect(error.message).toBe("Invalid configuration for 'name': Name cannot be null");
		expect(error.context).toEqual({
			field: "name",
			value: null,
			reason: "Name cannot be null",
		});
		expect(error.suggestions).toHaveLength(3);
		expect(error.suggestions?.[0]).toBe("Review the documentation for the 'name' property");
		expect(error.suggestions?.[1]).toBe("Check for typos in property names");
		expect(error.suggestions?.[2]).toBe("Verify the value type matches the expected type");
	});

	it("should create builder configuration error with different field", () => {
		const error = createBuilderConfigurationError("timeout", "not-a-number", "Must be a number");

		expect(error.message).toBe("Invalid configuration for 'timeout': Must be a number");
		expect(error.context).toEqual({
			field: "timeout",
			value: "not-a-number",
			reason: "Must be a number",
		});
		expect(error.suggestions?.[0]).toBe("Review the documentation for the 'timeout' property");
	});
});

describe("createSandboxExecutionError", () => {
	it("should create sandbox execution error with operation and details", () => {
		const error = createSandboxExecutionError("workflow load", "Invalid default export");

		expect(error).toBeInstanceOf(SandboxExecutionError);
		expect(error.message).toBe("Sandbox execution failed during workflow load: Invalid default export");
		expect(error.context).toEqual({
			operation: "workflow load",
			details: "Invalid default export",
		});
		expect(error.suggestions).toHaveLength(3);
		expect(error.suggestions?.[0]).toBe("Check that the workflow file exports a valid WorkflowBuilder");
		expect(error.suggestions?.[1]).toBe("Verify all imports are available in the sandbox context");
		expect(error.suggestions?.[2]).toBe("Review the workflow file for runtime errors");
	});

	it("should create sandbox execution error with cause", () => {
		const cause = new Error("Module resolution failed");
		const error = createSandboxExecutionError("module import", "Cannot resolve 'foo'", cause);

		expect(error.cause).toBe(cause);
	});
});
