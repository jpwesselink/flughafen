import { describe, expect, it } from "vitest";
import { GitHubSchemaValidator } from "../github-schema-validator.js";

describe("GitHubSchemaValidator", () => {
	const validator = new GitHubSchemaValidator();

	describe("validateWorkflowSchema", () => {
		it("should pass valid workflow with normal jobs", () => {
			const validWorkflow = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					test: {
						"runs-on": "ubuntu-latest",
						steps: [{ uses: "actions/checkout@v4" }, { run: "npm test" }],
					},
				},
			};

			const result = validator.validateWorkflowSchema(validWorkflow);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should pass valid workflow with workflow calls", () => {
			const workflowWithCall = {
				name: "Caller Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "./.github/workflows/deploy.yml",
						with: {
							environment: "production",
						},
						secrets: {
							token: "${{ secrets.TOKEN }}",
						},
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithCall);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect missing required fields", () => {
			const incompleteWorkflow = {
				name: "Incomplete Workflow",
				// Missing 'on' and 'jobs'
			};

			const result = validator.validateWorkflowSchema(incompleteWorkflow);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			const errorMessages = result.errors.map((e) => e.message);
			expect(errorMessages.some((msg) => msg.includes("jobs"))).toBe(true);
			expect(errorMessages.some((msg) => msg.includes("on"))).toBe(true);
		});

		it("should validate job structure for normal jobs", () => {
			const workflowWithInvalidJob = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					"invalid-job": {
						// Missing runs-on for normal job
						steps: [{ run: "echo hello" }],
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithInvalidJob);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("runs-on"))).toBe(true);
		});

		it("should validate workflow call job structure", () => {
			const workflowWithInvalidCall = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "./.github/workflows/deploy.yml",
						steps: [{ run: "echo hello" }], // Invalid - workflow calls cannot have steps
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithInvalidCall);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("steps"))).toBe(true);
		});

		it("should warn about workflow call with runs-on", () => {
			const workflowWithRedundantRunsOn = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "./.github/workflows/deploy.yml",
						"runs-on": "ubuntu-latest", // Warning - not needed for workflow calls
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithRedundantRunsOn);

			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.message.includes("runs-on"))).toBe(true);
		});

		it("should validate workflow path formats", () => {
			const workflowWithInvalidPath = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "invalid-path-format", // Invalid format
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithInvalidPath);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("workflow path"))).toBe(true);
		});

		it("should accept various trigger formats", () => {
			const workflows = [
				{ name: "Test", on: "push", jobs: { test: { "runs-on": "ubuntu-latest", steps: [] } } },
				{ name: "Test", on: ["push", "pull_request"], jobs: { test: { "runs-on": "ubuntu-latest", steps: [] } } },
				{
					name: "Test",
					on: { push: { branches: ["main"] } },
					jobs: { test: { "runs-on": "ubuntu-latest", steps: [] } },
				},
			];

			for (const workflow of workflows) {
				const result = validator.validateWorkflowSchema(workflow);
				expect(result.valid).toBe(true);
			}
		});

		it("should handle job with no steps as warning", () => {
			const workflowWithNoSteps = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					test: {
						"runs-on": "ubuntu-latest",
						// No steps
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithNoSteps);

			expect(result.warnings.some((w) => w.message.includes("no steps"))).toBe(true);
		});

		it("should validate external workflow path format", () => {
			const workflowWithExternalCall = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "owner/repo/.github/workflows/deploy.yml@v1",
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithExternalCall);

			expect(result.valid).toBe(true);
		});

		it("should detect invalid external workflow path", () => {
			const workflowWithInvalidExternal = {
				name: "Test Workflow",
				on: "push",
				jobs: {
					deploy: {
						uses: "owner/repo@v1@v2", // Invalid - multiple @ symbols
					},
				},
			};

			const result = validator.validateWorkflowSchema(workflowWithInvalidExternal);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("external workflow"))).toBe(true);
		});
	});
});
