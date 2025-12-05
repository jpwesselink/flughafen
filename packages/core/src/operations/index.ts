/**
 * High-level programmatic operations for flughafen
 *
 * These functions provide a clean API for common workflows without CLI concerns.
 */

export { type GenerateTypesOptions, type GenerateTypesResult, generateTypes } from "./generate-types";
export type {
	ActionUsage,
	LocalActionAnalysis,
	ReverseError,
	ReverseOptions,
	ReverseResult,
	WorkflowAnalysis,
} from "./reverse";
export { ReverseApi, reverse, WorkflowParser, YamlAnalyzer } from "./reverse";
export { compareYaml, hashYaml, normalizeYaml, type RoundtripValidationResult } from "./roundtrip-validator";
export { type SynthOptions, type SynthResult, synth } from "./synth";
export { type ValidateWorkflowOptions, type ValidateWorkflowResult, validate } from "./validate";
