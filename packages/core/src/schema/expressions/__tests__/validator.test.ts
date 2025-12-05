import { describe, expect, it } from "vitest";
import { ExpressionValidator } from "../ExpressionValidator";
import { WorkflowExpressionValidator } from "../WorkflowExpressionValidator";

describe("ExpressionValidator", () => {
	const validator = new ExpressionValidator();

	describe("validateExpression", () => {
		const context = {
			eventType: "push",
			availableJobs: ["build", "test", "deploy"],
			currentJob: "test",
		};

		it("should validate correct expressions", () => {
			const result = validator.validateExpression('${{ github.event.ref == "refs/heads/main" }}', context);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect unknown contexts", () => {
			const result = validator.validateExpression("${{ invalid_context.property }}", context);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Unknown context 'invalid_context'");
			expect(result.suggestions[0]).toContain("Valid contexts:");
		});

		it("should detect event-specific context issues", () => {
			const result = validator.validateExpression("${{ github.event.pull_request.number }}", context);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Context 'github.event.pull_request' not available in push event");
		});

		it("should detect unknown functions", () => {
			const result = validator.validateExpression("${{ unknownFunction(github.event.ref) }}", context);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Unknown function 'unknownFunction'");
		});

		it("should not flag safe expressions as security issues", () => {
			const result = validator.validateExpression("${{ github.event.issue.title }}", context);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});

describe("WorkflowExpressionValidator", () => {
	const validator = new WorkflowExpressionValidator();

	describe("validateInWorkflow", () => {
		const context = {
			eventType: "pull_request",
			availableJobs: ["build", "test", "deploy"],
			currentJob: "test",
			availableSteps: ["checkout", "setup", "test"],
			environment: "production",
		};

		it("should validate job dependencies", () => {
			const result = validator.validateInWorkflow("${{ needs.nonexistent.result }}", context);

			expect(result.workflowSpecific.suggestions).toContain("Job 'nonexistent' is not defined in this workflow");
		});

		it("should validate step references", () => {
			const result = validator.validateInWorkflow("${{ steps.missing_step.outputs.value }}", context);

			expect(result.workflowSpecific.suggestions).toContain("Step 'missing_step' not found in current job");
		});

		it("should suggest performance optimizations", () => {
			const result = validator.validateInWorkflow('${{ matrix.os == "ubuntu-latest" }}', context);

			expect(result.workflowSpecific.optimizations).toContain(
				"Consider using fail-fast: false for better feedback in matrix builds"
			);
		});

		it("should identify security issues", () => {
			const result = validator.validateInWorkflow("${{ github.event.pull_request.title }}", context);

			expect(result.workflowSpecific.securityIssues).toContain(
				"Untrusted input detected - consider using environment variables"
			);
		});

		it("should provide comprehensive validation", () => {
			const expression = '${{ needs.build.result == "success" && contains(github.event.pull_request.title, "feat:") }}';
			const result = validator.validateInWorkflow(expression, context);

			expect(result.valid).toBe(true);
			expect(result.components).toBeDefined();
			expect(result.components?.contexts.map((c) => c.name)).toContain("needs");
			expect(result.components?.contexts.map((c) => c.name)).toContain("github");
			expect(result.components?.functions.map((f) => f.name)).toContain("contains");
		});
	});
});
