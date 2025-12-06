/**
 * Comprehensive workflow validation system
 *
 * This module provides validation for GitHub Actions workflows including:
 * - TypeScript compilation errors
 * - Workflow structure validation
 * - Security best practices
 * - Expression validation
 * - General best practices
 */

export type {
	ValidationContext,
	ValidationOptions,
	ValidatorFunction,
	WorkflowValidationError,
	WorkflowValidationError as ValidationError,
	WorkflowValidationResult,
	// Export with convenience aliases
	WorkflowValidationResult as ValidationResult,
	WorkflowValidationWarning,
	WorkflowValidationWarning as ValidationWarning,
} from "./types";
export { BestPracticesValidator } from "./validators/BestPracticesValidator";
export { SecurityValidator } from "./validators/SecurityValidator";
export { StructureValidator } from "./validators/StructureValidator";
export { SyntaxValidator } from "./validators/SyntaxValidator";
export { TypeScriptValidator } from "./validators/TypeScriptValidator";
export { VulnerabilityValidator } from "./validators/VulnerabilityValidator";
export { WorkflowValidator } from "./WorkflowValidator";
