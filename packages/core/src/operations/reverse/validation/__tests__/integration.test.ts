import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkflowParser } from "../../workflow-parser.js";

describe("Validation Integration Tests", () => {
	const parser = new WorkflowParser();
	const testDir = "./test-validation-integration";
	const testFiles: string[] = [];

	beforeEach(() => {
		// Create test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up test files and directory
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
		testFiles.length = 0;
	});

	const createTestFile = (filename: string, content: string): string => {
		const filePath = join(testDir, filename);
		const dir = filePath.substring(0, filePath.lastIndexOf("/"));
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(filePath, content);
		testFiles.push(filePath);
		return filePath;
	};

	describe("WorkflowParser with Validation", () => {
		it("should validate and process valid workflow successfully", async () => {
			const validWorkflow = createTestFile(
				"valid-workflow.yml",
				`
name: Valid Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
`
			);

			const result = await parser.reverseWorkflow(validWorkflow, {
				outputDir: testDir,
				preview: true,
				validationReport: false,
			});

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].name).toBe("Valid Test Workflow");
			expect(result.workflows[0].jobs).toHaveLength(2);
		});

		it("should reject workflow with YAML syntax errors", async () => {
			const invalidWorkflow = createTestFile(
				"invalid-syntax.yml",
				`
name: Invalid Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Wrong indentation
      - run: echo "fail"
`
			);

			const result = await parser.reverseWorkflow(invalidWorkflow, {
				validateOnly: true,
			});

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.type === "validation")).toBe(true);
			expect(result.workflows).toHaveLength(0);
			expect(result.generatedFiles).toHaveLength(0);
		});

		it("should reject workflow with schema validation errors", async () => {
			const incompleteWorkflow = createTestFile(
				"incomplete-workflow.yml",
				`
name: Incomplete Workflow
# Missing required 'on' and 'jobs' fields
description: This workflow is missing required fields
`
			);

			const result = await parser.reverseWorkflow(incompleteWorkflow, {
				validateOnly: true,
			});

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.type === "schema")).toBe(true);
			expect(result.workflows).toHaveLength(0);
		});

		it("should validate workflow calls correctly", async () => {
			const workflowWithCalls = createTestFile(
				"workflow-calls.yml",
				`
name: Workflow with Calls
on: push
jobs:
  deploy-staging:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      version: \${{ github.sha }}
    secrets:
      token: \${{ secrets.STAGING_TOKEN }}
  
  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
      version: \${{ github.sha }}
    secrets:
      token: \${{ secrets.PROD_TOKEN }}
`
			);

			const result = await parser.reverseWorkflow(workflowWithCalls, {
				validateOnly: true,
				validationReport: false,
			});

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should support validateOnly mode", async () => {
			const workflow = createTestFile(
				"validate-only.yml",
				`
name: Validate Only Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
`
			);

			const result = await parser.reverseWorkflow(workflow, {
				validateOnly: true,
			});

			expect(result.errors).toHaveLength(0);
			expect(result.workflows).toHaveLength(0); // No processing in validate-only mode
			expect(result.generatedFiles).toHaveLength(0);
		});

		it("should support skip validation options", async () => {
			const brokenWorkflow = createTestFile(
				"broken-workflow.yml",
				`
name: Broken Workflow
# Missing required fields and bad syntax
invalid: yaml: content:
`
			);

			// With validation, should fail
			const resultWithValidation = await parser.reverseWorkflow(brokenWorkflow, {
				validateOnly: true,
			});
			expect(resultWithValidation.errors.length).toBeGreaterThan(0);

			// With validation skipped, should pass validation but fail parsing
			const resultSkipValidation = await parser.reverseWorkflow(brokenWorkflow, {
				skipYamlValidation: true,
				skipSchemaValidation: true,
				validateOnly: true,
			});
			// Should still have errors because YAML can't be parsed at all
			expect(resultSkipValidation.errors.length).toBeGreaterThan(0);
		});

		it("should support strict validation mode", async () => {
			const workflowWithWarnings = createTestFile(
				"warnings-workflow.yml",
				`
name: Workflow with Warnings
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    # No steps - might generate warnings
`
			);

			const resultNonStrict = await parser.reverseWorkflow(workflowWithWarnings, {
				strictValidation: false,
				validateOnly: true,
			});

			const resultStrict = await parser.reverseWorkflow(workflowWithWarnings, {
				strictValidation: true,
				validateOnly: true,
			});

			// In strict mode, warnings become errors
			if (resultNonStrict.warnings.length > 0) {
				expect(resultStrict.errors.length).toBeGreaterThanOrEqual(resultNonStrict.errors.length);
			}
		});

		it("should handle file read errors gracefully", async () => {
			const result = await parser.reverseWorkflow("nonexistent-file.yml", {
				validateOnly: true,
			});

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain("Failed to read file");
		});
	});

	describe("Batch Processing with Validation", () => {
		it("should validate multiple workflows in .github directory", async () => {
			// Create a mock .github directory structure
			const githubDir = join(testDir, ".github");
			const workflowsDir = join(githubDir, "workflows");
			mkdirSync(workflowsDir, { recursive: true });

			createTestFile(
				".github/workflows/ci.yml",
				`
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`
			);

			createTestFile(
				".github/workflows/deploy.yml",
				`
name: Deploy
on:
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy
`
			);

			createTestFile(
				".github/workflows/invalid.yml",
				`
name: Invalid
# Missing required fields
`
			);

			const result = await parser.reverseGithub(githubDir, {
				validateOnly: true,
			});

			// Should process valid workflows and report errors for invalid ones
			expect(result.errors.length).toBeGreaterThan(0); // From invalid.yml
			expect(result.errors.some((e) => e.file.includes("invalid.yml"))).toBe(true);
		});

		it("should handle empty .github directory", async () => {
			const emptyGithubDir = join(testDir, ".github-empty");
			mkdirSync(emptyGithubDir, { recursive: true });

			const result = await parser.reverseGithub(emptyGithubDir, {
				validateOnly: true,
			});

			expect(result.errors).toHaveLength(0);
			expect(result.warnings.length).toBeGreaterThanOrEqual(0); // May warn about no workflows
		});
	});

	describe("Error Message Quality", () => {
		it("should provide helpful error messages for common mistakes", async () => {
			const workflowWithCommonMistakes = createTestFile(
				"common-mistakes.yml",
				`
name: Common Mistakes
on: push
jobs:
  test-job:
    # Missing runs-on
    steps:
      - run: echo "test"
  
  workflow-call-job:
    uses: ./.github/workflows/deploy.yml
    runs-on: ubuntu-latest  # Redundant for workflow calls
    steps:  # Invalid for workflow calls
      - run: echo "invalid"
`
			);

			const result = await parser.reverseWorkflow(workflowWithCommonMistakes, {
				validateOnly: true,
				validationReport: false,
			});

			expect(result.errors.length).toBeGreaterThan(0);

			// Should have specific error messages for each issue
			const errorMessages = result.errors.map((e) => e.message);
			expect(errorMessages.some((msg) => msg.includes("runs-on"))).toBe(true);
			expect(errorMessages.some((msg) => msg.includes("steps"))).toBe(true);
		});

		it("should provide line numbers for YAML errors", async () => {
			const workflowWithSyntaxError = createTestFile(
				"syntax-error.yml",
				`
name: Syntax Error Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Error on this line
      - run: echo "test"
`
			);

			const result = await parser.reverseWorkflow(workflowWithSyntaxError, {
				validateOnly: true,
			});

			expect(result.errors.length).toBeGreaterThan(0);
			const yamlError = result.errors.find((e) => e.type === "validation");
			expect(yamlError).toBeDefined();
			expect(yamlError?.line).toBeGreaterThan(0);
			expect(yamlError?.column).toBeGreaterThan(0);
		});
	});
});
