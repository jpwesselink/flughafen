/**
 * High-level programmatic operations for flughafen
 *
 * These functions provide a clean API for common workflows without CLI concerns.
 */

export { type GenerateTypesOptions, type GenerateTypesResult, generateTypes } from "./generate-types";
export { type SynthOptions, type SynthResult, synth } from "./synth";
export { type ValidateWorkflowOptions, type ValidateWorkflowResult, validate } from "./validate";
