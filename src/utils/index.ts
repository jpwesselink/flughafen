/**
 * Workflow processing utilities
 * 
 * This module provides utilities for compiling, executing, and processing workflow files
 * in a secure and controlled manner.
 */

// Main orchestrator
export {
  processWorkflowFile,
  getWorkflowYaml,
  validateWorkflowFile,
  type ProcessWorkflowOptions,
  type ProcessResult
} from './workflow-processor';

// TypeScript compilation
export {
  compileTypeScriptFile,
  compileTypeScriptSource,
  isTypeScriptFile,
  isJavaScriptFile,
  type CompileOptions
} from './typescript-compiler';

// VM sandbox execution
export {
  executeWorkflowInSandbox,
  createWorkflowSandbox,
  type SandboxResult,
  type SandboxOptions
} from './workflow-sandbox';

// File writing
export {
  writeWorkflowSynthResult,
  writeWorkflowFile,
  generateOutputPath,
  isSafeWriteDirectory,
  createWriteSummary,
  type WriteOptions,
  type WriteResult
} from './file-writer';
