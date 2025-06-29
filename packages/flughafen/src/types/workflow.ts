/**
 * Workflow domain types
 * 
 * Custom workflow configuration types that extend GitHub's base types
 */

// Import all types from builders.ts
export type * from './builders';

// Additional workflow-specific types
export interface RepositoryDispatchConfig {
	types?: string[];
}
