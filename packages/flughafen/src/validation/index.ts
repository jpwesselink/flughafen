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
	WorkflowValidationResult,
	WorkflowValidationError,
	WorkflowValidationWarning,
	ValidatorFunction,
	// Export with convenience aliases
	WorkflowValidationResult as ValidationResult,
	WorkflowValidationError as ValidationError,
	WorkflowValidationWarning as ValidationWarning,
} from "./types";

export { WorkflowValidator } from "./WorkflowValidator";
export { TypeScriptValidator } from "./validators/TypeScriptValidator";
export { StructureValidator } from "./validators/StructureValidator";
export { SecurityValidator } from "./validators/SecurityValidator";
export { BestPracticesValidator } from "./validators/BestPracticesValidator";
export { SyntaxValidator } from "./validators/SyntaxValidator";