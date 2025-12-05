import type { GeneratedInterface } from "../generators/TypeGenerator";
import { ExpressionValidator } from "./ExpressionValidator";
import type { EnhancedWorkflowContext, ExpressionValidationResult } from "./validator-types";

/**
 * Type-aware expression validation context
 */
export interface TypeAwareValidationContext extends EnhancedWorkflowContext {
	/** Generated action interfaces from the type system */
	actionInterfaces?: GeneratedInterface[];
	/** Current action being validated (if in action context) */
	currentAction?: {
		name: string;
		interface?: GeneratedInterface;
	};
}

/**
 * Enhanced validation result with type information
 */
export interface TypeAwareValidationResult extends ExpressionValidationResult {
	/** Type-related errors specific to action inputs */
	typeErrors: string[];
	/** Type-aware suggestions for better expressions */
	typeSuggestions: string[];
}

/**
 * Expression validator that understands generated action types
 * Provides type-safe validation for action input expressions
 */
export class TypeAwareExpressionValidator extends ExpressionValidator {
	/**
	 * Validate expression with type awareness for action inputs
	 */
	validateExpressionWithTypes(expression: string, context: TypeAwareValidationContext): TypeAwareValidationResult {
		// Get base validation result
		const baseResult = this.validateExpression(expression, context);

		// Enhanced type-aware validation
		const typeErrors: string[] = [];
		const typeSuggestions: string[] = [];

		// If we're in an action context, validate against action types
		if (context.currentAction?.interface) {
			const typeValidation = this.validateActionInputExpression(expression, context.currentAction.interface, context);
			typeErrors.push(...typeValidation.errors);
			typeSuggestions.push(...typeValidation.suggestions);
		}

		// Look for action references in expressions and validate them
		const actionReferences = this.extractActionReferences(expression);
		for (const actionRef of actionReferences) {
			const actionInterface = this.findActionInterface(actionRef, context.actionInterfaces);
			if (actionInterface) {
				const actionValidation = this.validateActionReference(actionRef, actionInterface, expression, context);
				typeErrors.push(...actionValidation.errors);
				typeSuggestions.push(...actionValidation.suggestions);
			}
		}

		return {
			...baseResult,
			typeErrors,
			typeSuggestions,
			errors: [...baseResult.errors, ...typeErrors],
			suggestions: [...baseResult.suggestions, ...typeSuggestions],
		};
	}

	/**
	 * Validate an expression used as an action input value
	 */
	private validateActionInputExpression(
		expression: string,
		actionInterface: GeneratedInterface,
		context: TypeAwareValidationContext
	): { errors: string[]; suggestions: string[] } {
		const errors: string[] = [];
		const suggestions: string[] = [];

		// Parse the action interface to understand expected types
		const inputTypes = this.parseActionInterfaceTypes(actionInterface);

		// Check if expression produces compatible types
		const expressionType = this.inferExpressionType(expression, context);

		// Example validation: check for type mismatches
		if (expressionType && inputTypes.length > 0) {
			const isCompatible = inputTypes.some((expectedType) => this.isTypeCompatible(expressionType, expectedType));

			if (!isCompatible) {
				errors.push(
					`Expression type '${expressionType}' is not compatible with expected types: ${inputTypes.join(" | ")}`
				);
				suggestions.push(`Consider using a type conversion function or providing a ${inputTypes[0]} value`);
			}
		}

		return { errors, suggestions };
	}

	/**
	 * Extract action references from expression (e.g., steps.setup.outputs.version)
	 */
	private extractActionReferences(expression: string): string[] {
		const references: string[] = [];

		// Look for patterns like steps.{step_id}.outputs.{output_name}
		const stepOutputPattern = /steps\.([a-zA-Z_][a-zA-Z0-9_-]*)\./g;
		let match: RegExpExecArray | null = stepOutputPattern.exec(expression);
		while (match !== null) {
			references.push(match[1]); // step ID
			match = stepOutputPattern.exec(expression);
		}

		return references;
	}

	/**
	 * Find action interface by action name or step ID
	 */
	private findActionInterface(
		actionRef: string,
		actionInterfaces?: GeneratedInterface[]
	): GeneratedInterface | undefined {
		if (!actionInterfaces) return undefined;

		// Simple lookup - could be enhanced with step ID mapping
		return actionInterfaces.find(
			(iface) =>
				iface.actionName.includes(actionRef) || iface.interfaceName.toLowerCase().includes(actionRef.toLowerCase())
		);
	}

	/**
	 * Validate a specific action reference in context
	 */
	private validateActionReference(
		actionRef: string,
		actionInterface: GeneratedInterface,
		expression: string,
		context: TypeAwareValidationContext
	): { errors: string[]; suggestions: string[] } {
		const errors: string[] = [];
		const suggestions: string[] = [];

		// Check if the referenced step exists in workflow context
		if (context.availableSteps && !context.availableSteps.includes(actionRef)) {
			errors.push(`Step '${actionRef}' is not available in current job context`);
			suggestions.push(`Available steps: ${context.availableSteps.join(", ")}`);
		}

		// Check output references against action schema
		const outputPattern = new RegExp(`steps\\.${actionRef}\\.outputs\\.([a-zA-Z_][a-zA-Z0-9_-]*)`);
		const outputMatch = expression.match(outputPattern);
		if (outputMatch) {
			const outputName = outputMatch[1];
			const actionOutputs = this.parseActionOutputs(actionInterface);

			if (actionOutputs.length > 0 && !actionOutputs.includes(outputName)) {
				errors.push(`Output '${outputName}' is not defined for action ${actionInterface.actionName}`);
				if (actionOutputs.length > 0) {
					suggestions.push(`Available outputs: ${actionOutputs.join(", ")}`);
				}
			}
		}

		return { errors, suggestions };
	}

	/**
	 * Parse action interface to extract input type information
	 */
	private parseActionInterfaceTypes(actionInterface: GeneratedInterface): string[] {
		const types: string[] = [];

		// Parse the interface code to extract type information
		const typeMatches = actionInterface.interfaceCode.match(/:\s*([^;]+);/g);
		if (typeMatches) {
			for (const match of typeMatches) {
				const type = match.replace(/:\s*/, "").replace(/;$/, "").trim();
				if (!types.includes(type)) {
					types.push(type);
				}
			}
		}

		return types;
	}

	/**
	 * Parse action outputs from interface (basic implementation)
	 */
	private parseActionOutputs(_actionInterface: GeneratedInterface): string[] {
		// This would need enhancement based on how outputs are represented
		// For now, return empty as most actions don't have strongly typed outputs
		return [];
	}

	/**
	 * Infer the type that an expression will produce
	 */
	private inferExpressionType(expression: string, _context: TypeAwareValidationContext): string | null {
		const cleanExpr = expression.replace(/\$\{\{|\}\}/g, "").trim();

		// Basic type inference
		if (/^(['"].*['"]|`.*`)$/.test(cleanExpr)) {
			return "string";
		}

		if (/^\d+$/.test(cleanExpr)) {
			return "number";
		}

		if (/^(true|false)$/.test(cleanExpr)) {
			return "boolean";
		}

		// Check for common context patterns
		if (cleanExpr.includes("github.event")) {
			return "string"; // Most event properties are strings
		}

		if (cleanExpr.includes("steps.") && cleanExpr.includes(".outputs.")) {
			return "string"; // Step outputs are typically strings
		}

		if (cleanExpr.includes("env.")) {
			return "string"; // Environment variables are strings
		}

		// Default to unknown
		return null;
	}

	/**
	 * Check if two types are compatible
	 */
	private isTypeCompatible(actualType: string, expectedType: string): boolean {
		// Handle optional types
		const cleanExpected = expectedType.replace(/\?$/, "");

		// Exact match
		if (actualType === cleanExpected) {
			return true;
		}

		// String is compatible with most things in GitHub Actions
		if (cleanExpected === "string") {
			return true;
		}

		// Boolean can be converted to string
		if (actualType === "boolean" && cleanExpected === "string") {
			return true;
		}

		// Number can be converted to string
		if (actualType === "number" && cleanExpected === "string") {
			return true;
		}

		return false;
	}
}
