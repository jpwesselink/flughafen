/**
 * Action domain types
 *
 * Types specific to action configuration and processing
 */

// Re-export from builder-types.ts
export type {
	ActionRuns,
	GitHubAction,
	RunsComposite,
	RunsDocker,
	RunsJavascript,
} from "./builder-types";
// Re-export action-related types from builders.ts
export type { StepConfig } from "./builders";
