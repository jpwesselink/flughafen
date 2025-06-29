/**
 * Main exports for the flughafen GitHub Actions workflow builder
 */

export { ActionBuilder } from "./lib/builders/ActionBuilder";
export { createJob, JobBuilder } from "./lib/builders/JobBuilder";
export {
	createLocalAction,
	LocalActionBuilder,
} from "./lib/builders/LocalActionBuilder";
export { StepBuilder } from "./lib/builders/StepBuilder";
export {
	createWorkflow,
	WorkflowBuilder,
} from "./lib/builders/WorkflowBuilder";

// Type definitions (previously from workflow-processor, now inline)
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

export type * from "../generated/types/github-workflow";
export type {
	ActionInput,
	ActionOutput,
	ActionSchema,
} from "./lib/schema/ActionSchemaFetcher";
export { ActionSchemaFetcher } from "./lib/schema/ActionSchemaFetcher";
export type {
	GenerationResult,
	SchemaManagerConfig,
} from "./lib/schema/SchemaManager";
export { SchemaManager } from "./lib/schema/SchemaManager";
export type {
	GeneratedInterface,
	TypeGeneratorConfig,
} from "./lib/schema/TypeGenerator";
export { TypeGenerator } from "./lib/schema/TypeGenerator";

// Export types for schema analysis
export type { ActionReference } from "./lib/schema/WorkflowScanner";
// Schema analysis and type generation
export { WorkflowScanner } from "./lib/schema/WorkflowScanner";
// Re-export types
export type * from "./types/builder-types";

// Default export
export default {
	WorkflowBuilder: require("./lib/builders/WorkflowBuilder").WorkflowBuilder,
	createWorkflow: require("./lib/builders/WorkflowBuilder").createWorkflow,
};
