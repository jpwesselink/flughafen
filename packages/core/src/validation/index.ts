/**
 * Comprehensive workflow validation system
 *
 * This module provides validation for GitHub Actions workflows including:
 * - Schema validation (syntax, structure, TypeScript compilation)
 * - Security validation (vulnerabilities, hardcoded secrets, injection risks)
 */

export type {
	ValidationContext,
	ValidationOptions,
	ValidationRule,
	ValidatorFunction,
	WorkflowValidationError,
	WorkflowValidationError as ValidationError,
	WorkflowValidationResult,
	// Export with convenience aliases
	WorkflowValidationResult as ValidationResult,
	WorkflowValidationWarning,
	WorkflowValidationWarning as ValidationWarning,
} from "./types";
export { SecurityValidator } from "./validators/SecurityValidator";
export { StructureValidator } from "./validators/StructureValidator";
export { SyntaxValidator } from "./validators/SyntaxValidator";
export { TypeScriptValidator } from "./validators/TypeScriptValidator";
export { VulnerabilityValidator } from "./validators/VulnerabilityValidator";
export { WorkflowValidator } from "./WorkflowValidator";
