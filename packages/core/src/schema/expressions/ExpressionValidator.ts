import { ExpressionParser } from "./parser";
import type { ExpressionValidationResult, WorkflowContext } from "./validator-types";

/**
 * GitHub Actions expression validator
 */
export class ExpressionValidator {
	private parser = new ExpressionParser();

	/**
	 * Validate an expression against a workflow context
	 */
	validateExpression(expression: string, context: WorkflowContext): ExpressionValidationResult {
		const components = this.parser.parseExpression(expression);
		const errors: string[] = [];
		const suggestions: string[] = [];

		// Check for unknown contexts using the full pattern extractor
		// This catches contexts like "invalid_context.property" that wouldn't be extracted
		// by the standard parser (which only extracts known contexts)
		const allPotentialContexts = this.parser.extractAllPotentialContexts(expression);
		for (const ctx of allPotentialContexts) {
			if (!this.isValidContext(ctx.name)) {
				errors.push(`Unknown context '${ctx.name}'`);
				suggestions.push(
					`Valid contexts: github, env, job, runner, steps, needs, strategy, matrix, secrets, vars, inputs`
				);
			}
		}

		// Check for common mistakes
		if (components.cleaned.includes("github.event.pull_request") && context.eventType !== "pull_request") {
			errors.push(`Context 'github.event.pull_request' not available in ${context.eventType} event`);
			suggestions.push(`This context is only available in pull_request events`);
		}

		// Check function usage
		for (const func of components.functions) {
			const funcValidation = this.validateFunction(func);
			errors.push(...funcValidation.errors);
			suggestions.push(...funcValidation.suggestions);
		}

		// Check for security issues
		if (this.hasSecurityIssues(components.cleaned)) {
			errors.push("Potential security issue: untrusted input used in script context");
			suggestions.push("Use environment variables or intermediate steps for untrusted input");
		}

		return {
			valid: errors.length === 0,
			errors,
			suggestions,
			components,
		};
	}

	private isValidContext(name: string): boolean {
		const validContexts = [
			"github",
			"env",
			"job",
			"runner",
			"steps",
			"needs",
			"strategy",
			"matrix",
			"secrets",
			"vars",
			"inputs",
		];
		return validContexts.includes(name);
	}

	private validateFunction(func: { name: string }): { errors: string[]; suggestions: string[] } {
		const errors: string[] = [];
		const suggestions: string[] = [];

		const knownFunctions = ["contains", "startsWith", "endsWith", "format", "fromJSON", "toJSON", "join"];

		if (!knownFunctions.includes(func.name)) {
			errors.push(`Unknown function '${func.name}'`);
			suggestions.push(`Available functions: ${knownFunctions.join(", ")}`);
		}

		return { errors, suggestions };
	}

	private hasSecurityIssues(expression: string): boolean {
		// Check for potentially dangerous patterns when used in script context
		// For now, we'll be conservative and only flag when it's clearly dangerous
		const dangerousPatterns = [
			/github\.event\.issue\.title.*run:/,
			/github\.event\.issue\.body.*run:/,
			/github\.event\.comment\.body.*run:/,
		];

		return dangerousPatterns.some((pattern) => pattern.test(expression));
	}
}
