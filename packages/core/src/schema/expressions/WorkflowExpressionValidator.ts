import { ExpressionValidator } from "./ExpressionValidator";
import type { ExpressionComponents } from "./parser";
import type {
	EnhancedExpressionValidationResult,
	EnhancedWorkflowContext,
	WorkflowSpecificChecks,
} from "./validator-types";

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
