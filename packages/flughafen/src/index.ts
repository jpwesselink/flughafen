/**
 * Main exports for the flughafen GitHub Actions workflow builder
 */

// Core builders (main API)
export * from "./core/builders";
// High-level programmatic operations
export * from "./operations";
// Processing utilities
export * from "./processing";
// Schema management
export * from "./schema";
// Validation system
export * from "./validation";
// Utilities
export * from "./utils";

// Type definitions (legacy compatibility)
export interface WorkflowProcessorResult {
	workflow: {
		filename: string;
		content: string;
	};
	actions: Record<string, string>; // filename -> content
}

export interface MultiWorkflowProcessorResult {
	workflows: Record<string, string>; // filename -> content
	actions: Record<string, string>; // filename -> content
}

export interface ProcessorOptions {
	outputDir?: string;
	basePath?: string; // e.g., '.github' - base path for actions/workflows
	workflowsDir?: string; // e.g., '.github/workflows'
	actionsDir?: string; // e.g., '.github/actions'
	defaultFilename?: string;
}

// Generated types
export type * from "../generated/types/github-workflow";

// Legacy type exports for backward compatibility
export type * from "./types";
