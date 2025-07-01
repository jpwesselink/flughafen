/**
 * Schema domain
 *
 * Handles schema fetching, management, and type generation
 */

export * from "./expressions";
export * from "./fetchers";
// Re-export types (avoiding duplicates by being selective)
export type {
	// Fetcher types
	ActionInput,
	ActionOutput,
	ActionSchema,
} from "./fetchers/types";
export * from "./generators";
export type {
	// Generator types
	GeneratedInterface,
	TypeGeneratorConfig,
} from "./generators/types";
export * from "./managers";
export type {
	ActionReference,
	GenerationResult,
	// Manager types
	SchemaManagerConfig,
} from "./managers/types";
