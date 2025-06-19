/**
 * Main exports for the flughafen GitHub Actions workflow builder
 */

export { WorkflowBuilder, createWorkflow } from './lib/builders/WorkflowBuilder';
export { JobBuilder, createJob } from './lib/builders/JobBuilder';
export { StepBuilder } from './lib/builders/StepBuilder';
export { ActionBuilder } from './lib/builders/ActionBuilder';
export { LocalActionBuilder, createLocalAction } from './lib/builders/LocalActionBuilder';

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
  actions: Record<string, string>;   // filename -> content
}

export interface ProcessorOptions {
  outputDir?: string;
  basePath?: string;     // e.g., '.github' - base path for actions/workflows
  workflowsDir?: string; // e.g., '.github/workflows'
  actionsDir?: string;   // e.g., '.github/actions'
  defaultFilename?: string;
}

// Re-export types
export type * from './types/builder-types';
export type * from './generated/github-actions';
export type * from './types';

// Schema analysis and type generation
export { WorkflowScanner } from './lib/schema/WorkflowScanner';
export { ActionSchemaFetcher } from './lib/schema/ActionSchemaFetcher';
export { TypeGenerator } from './lib/schema/TypeGenerator';
export { SchemaManager } from './lib/schema/SchemaManager';

// Export types for schema analysis
export type { ActionReference } from './lib/schema/WorkflowScanner';
export type { ActionSchema, ActionInput, ActionOutput } from './lib/schema/ActionSchemaFetcher';
export type { GeneratedInterface, TypeGeneratorConfig } from './lib/schema/TypeGenerator';
export type { SchemaManagerConfig, GenerationResult } from './lib/schema/SchemaManager';

// Default export
export default {
  WorkflowBuilder: require('./lib/builders/WorkflowBuilder').WorkflowBuilder,
  createWorkflow: require('./lib/builders/WorkflowBuilder').createWorkflow,
};
