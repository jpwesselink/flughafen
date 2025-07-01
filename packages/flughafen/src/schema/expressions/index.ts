/**
 * GitHub Actions expression parsing and validation
 *
 * This module provides tools for parsing and validating GitHub Actions expressions (${{ }})
 * with context-aware validation, security checks, and performance optimization suggestions.
 */

export type {
	ContextReference,
	ExpressionComponents,
	FunctionCall,
	LiteralValue,
} from "./parser";
export { ExpressionParser } from "./parser";
export type {
	TypeAwareValidationContext,
	TypeAwareValidationResult,
} from "./type-aware-validator";
export { TypeAwareExpressionValidator } from "./type-aware-validator";

export type {
	EnhancedExpressionValidationResult,
	EnhancedWorkflowContext,
	ExpressionValidationResult,
	WorkflowContext,
	WorkflowSpecificChecks,
} from "./validator";
export { ExpressionValidator, WorkflowExpressionValidator } from "./validator";
