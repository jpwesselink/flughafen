import { type ExpressionComponents, ExpressionParser } from "./parser";

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

		// Check for unknown contexts
		for (const ctx of components.contexts) {
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

/**
 * Enhanced validation with workflow-specific context
 */
export class WorkflowExpressionValidator {
	private validator = new ExpressionValidator();

	/**
	 * Validate expressions in the context of a specific workflow
	 */
	validateInWorkflow(expression: string, workflowContext: EnhancedWorkflowContext): EnhancedExpressionValidationResult {
		const baseResult = this.validator.validateExpression(expression, workflowContext);

		// Add workflow-specific validations
		const additionalChecks = this.performWorkflowSpecificChecks(baseResult.components!, workflowContext);

		return {
			...baseResult,
			workflowSpecific: additionalChecks,
			suggestions: [...baseResult.suggestions, ...additionalChecks.suggestions],
		};
	}

	private performWorkflowSpecificChecks(
		components: ExpressionComponents,
		context: EnhancedWorkflowContext
	): WorkflowSpecificChecks {
		const suggestions: string[] = [];
		const optimizations: string[] = [];
		const securityIssues: string[] = [];

		// Check job dependencies
		for (const ctx of components.contexts) {
			if (ctx.name === "needs") {
				const jobName = ctx.path[0];
				if (!context.availableJobs.includes(jobName)) {
					suggestions.push(`Job '${jobName}' is not defined in this workflow`);
				}
			}
		}

		// Check step references
		if (context.currentJob) {
			for (const ctx of components.contexts) {
				if (ctx.name === "steps") {
					const stepId = ctx.path[0];
					if (!context.availableSteps.includes(stepId)) {
						suggestions.push(`Step '${stepId}' not found in current job`);
					}
				}
			}
		}

		// Performance optimizations
		if (components.contexts.some((ctx) => ctx.name === "matrix")) {
			optimizations.push("Consider using fail-fast: false for better feedback in matrix builds");
		}

		// Security checks
		if (
			components.contexts.some(
				(ctx) =>
					ctx.fullPath.includes("github.event.issue.title") || ctx.fullPath.includes("github.event.pull_request.title")
			)
		) {
			securityIssues.push("Untrusted input detected - consider using environment variables");
		}

		return {
			suggestions,
			optimizations,
			securityIssues,
		};
	}
}

// Types
export interface WorkflowContext {
	eventType: string;
	availableJobs: string[];
	currentJob?: string;
	environment?: string;
}

export interface EnhancedWorkflowContext extends WorkflowContext {
	availableSteps: string[];
	matrixStrategy?: any;
	permissions?: Record<string, string>;
}

export interface ExpressionValidationResult {
	valid: boolean;
	errors: string[];
	suggestions: string[];
	components?: ExpressionComponents;
}

export interface EnhancedExpressionValidationResult extends ExpressionValidationResult {
	workflowSpecific: WorkflowSpecificChecks;
}

export interface WorkflowSpecificChecks {
	suggestions: string[];
	optimizations: string[];
	securityIssues: string[];
}
