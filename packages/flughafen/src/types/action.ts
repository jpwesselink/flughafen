/**
 * Action domain types
 * 
 * Types specific to action configuration and processing
 */

// Re-export action-related types from builders.ts
export type {
  StepConfig
} from './builders';

// Re-export from builder-types.ts
export type {
  GitHubAction,
  ActionRuns,
  RunsJavascript,
  RunsComposite,
  RunsDocker
} from './builder-types';
