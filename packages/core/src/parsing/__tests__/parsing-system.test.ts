import { describe, expect, it } from "vitest";
import { ParsingSystem } from "../parsing-system";
import { InMemoryPipeline } from "../pipeline/in-memory-pipeline";

describe("ParsingSystem", () => {
	describe("File Classification and Processing", () => {
		it("should classify and process a GitHub Actions workflow", () => {
			const system = ParsingSystem.createDefault();

			const workflowContent = {
				name: "Test Workflow",
				on: { push: { branches: ["main"] } },
				jobs: {
					test: {
						"runs-on": "ubuntu-latest",
						steps: [
							{ name: "Checkout", uses: "actions/checkout@v4" },
							{ name: "Run tests", run: "npm test" },
						],
					},
				},
			};

			const file = system.inMemory.createFile(
				InMemoryPipeline.createFileContext(".github/workflows/test.yml"),
				workflowContent
			);

			const result = system.inMemory.processSingleFile(file);

			expect(result.success).toBe(true);
			expect(result.kind).toBe("gha-workflow");
			expect(result.handler).toBe("WorkflowHandler");
			expect(result.output).toContain("export interface TestWorkflowWorkflowConfig");
			expect(result.output).toContain("export const testWorkflowWorkflowData");
			expect(result.output).toContain("export function createTestWorkflowWorkflow()");
		});

		it("should classify and process a GitHub Action", () => {
			const system = ParsingSystem.createDefault();

			const actionContent = {
				name: "My Test Action",
				description: "A test action",
				inputs: {
					message: {
						description: "Message to display",
						required: true,
					},
				},
				runs: {
					using: "composite",
					steps: [],
				},
			};

			const file = system.inMemory.createFile(
				InMemoryPipeline.createFileContext(".github/actions/test-action/action.yml"),
				actionContent
			);

			const result = system.inMemory.processSingleFile(file);

			expect(result.success).toBe(true);
			expect(result.kind).toBe("gha-action");
			expect(result.handler).toBe("ActionHandler");
			expect(result.output).toContain("export interface TestActionActionConfig");
			expect(result.output).toContain("export const testActionActionData");
			expect(result.output).toContain("export function createTestActionAction()");
		});

		it("should classify and process a GitHub funding config", () => {
			const system = ParsingSystem.createDefault();

			const fundingContent = {
				github: ["sponsor1", "sponsor2"],
				patreon: "mypatreon",
				ko_fi: "mykofi",
			};

			const file = system.inMemory.createFile(
				InMemoryPipeline.createFileContext(".github/FUNDING.yml"),
				fundingContent
			);

			const result = system.inMemory.processSingleFile(file);

			expect(result.success).toBe(true);
			expect(result.kind).toBe("github-funding");
			expect(result.handler).toBe("FundingHandler");
			expect(result.output).toContain("export interface FundingConfig");
			expect(result.output).toContain("export const fundingConfig");
			expect(result.output).toContain("export function getFundingUrls()");
		});

		it("should classify and process a Dependabot config", () => {
			const system = ParsingSystem.createDefault();

			const dependabotContent = {
				version: 2,
				updates: [
					{
						"package-ecosystem": "npm",
						directory: "/",
						schedule: {
							interval: "daily",
						},
					},
				],
			};

			const file = system.inMemory.createFile(
				InMemoryPipeline.createFileContext(".github/dependabot.yml"),
				dependabotContent
			);

			const result = system.inMemory.processSingleFile(file);

			expect(result.success).toBe(true);
			expect(result.kind).toBe("dependabot-config");
			expect(result.handler).toBe("DependabotHandler");
			expect(result.output).toContain("export interface DependabotConfig");
			expect(result.output).toContain("export const dependabotConfig");
			expect(result.output).toContain("export function getPackageEcosystems()");
		});

		it("should handle unknown file types gracefully", () => {
			const system = ParsingSystem.createDefault();

			const unknownContent = { some: "random content" };

			const file = system.inMemory.createFile(
				InMemoryPipeline.createFileContext("some/random/file.yml"),
				unknownContent
			);

			const result = system.inMemory.processSingleFile(file);

			expect(result.success).toBe(false);
			expect(result.kind).toBe("unknown");
			expect(result.error).toContain("No matching discriminator found");
		});
	});

	describe("Multiple File Processing", () => {
		it("should process multiple files of different types", () => {
			const system = ParsingSystem.createDefault();

			const files = [
				{
					context: InMemoryPipeline.createFileContext(".github/workflows/ci.yml"),
					content: {
						name: "CI",
						on: ["push"],
						jobs: { test: { "runs-on": "ubuntu-latest", steps: [] } },
					},
				},
				{
					context: InMemoryPipeline.createFileContext(".github/FUNDING.yml"),
					content: {
						github: "sponsor",
						patreon: "patron",
					},
				},
				{
					context: InMemoryPipeline.createFileContext(".github/dependabot.yml"),
					content: {
						version: 2,
						updates: [
							{
								"package-ecosystem": "npm",
								directory: "/",
								schedule: { interval: "weekly" },
							},
						],
					},
				},
			];

			const results = system.inMemory.processFiles(files);

			expect(results).toHaveLength(3);
			expect(results[0].kind).toBe("gha-workflow");
			expect(results[1].kind).toBe("github-funding");
			expect(results[2].kind).toBe("dependabot-config");
			expect(results.every((r) => r.success)).toBe(true);
		});
	});

	describe("Path-based Classification", () => {
		it("should correctly identify files by path patterns", () => {
			const system = ParsingSystem.createDefault();

			const testCases = [
				{
					path: ".github/workflows/deploy.yml",
					expectedKind: "gha-workflow",
				},
				{
					path: ".github/actions/setup/action.yaml",
					expectedKind: "gha-action",
				},
				{
					path: ".github/FUNDING.yml",
					expectedKind: "github-funding",
				},
				{
					path: ".github/dependabot.yml",
					expectedKind: "dependabot-config",
				},
			];

			for (const testCase of testCases) {
				const file = system.inMemory.createFile(InMemoryPipeline.createFileContext(testCase.path), {
					valid: "content",
				});

				const result = system.inMemory.processSingleFile(file);
				expect(result.kind).toBe(testCase.expectedKind);
			}
		});
	});
});
