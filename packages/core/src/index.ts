/**
 * Main exports for the flughafen GitHub Actions workflow builder
 */

// Force async module initialization before exports
// This ensures WorkflowValidator and other async-dependent classes are ready
import "./validation/WorkflowValidator";

// Core builders (main API)
export * from "./core/builders";
// Funding configuration
export * from "./funding";
// High-level programmatic operations
export * from "./operations";
// Processing utilities
export * from "./processing";
// Schema management
export * from "./schema";
// Utilities
export * from "./utils";
// Validation system
export * from "./validation";

// Type definitions
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

// Type exports
export type * from "./types";
