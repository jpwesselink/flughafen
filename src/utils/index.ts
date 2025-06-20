/**
 * Workflow processing utilities
 *
 * This module provides utilities for compiling, executing, and processing workflow files
 * in a secure and controlled manner.
 */

// File writing
export {
	createWriteSummary,
	generateOutputPath,
	isSafeWriteDirectory,
	type WriteOptions,
	type WriteResult,
	writeWorkflowFile,
	writeWorkflowSynthResult,
} from "./file-writer";

// TypeScript compilation
export {
	type CompileOptions,
	compileTypeScriptFile,
	compileTypeScriptSource,
	isJavaScriptFile,
	isTypeScriptFile,
} from "./typescript-compiler";
// Main orchestrator
export {
	getWorkflowYaml,
	type ProcessResult,
	type ProcessWorkflowOptions,
	processWorkflowFile,
	validateWorkflowFile,
} from "./workflow-processor";
// VM sandbox execution
export {
	createWorkflowSandbox,
	executeWorkflowInSandbox,
	type SandboxOptions,
	type SandboxResult,
} from "./workflow-sandbox";
