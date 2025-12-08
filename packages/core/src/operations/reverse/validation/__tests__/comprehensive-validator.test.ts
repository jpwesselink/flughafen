import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { ComprehensiveValidator } from "../comprehensive-validator.js";

describe("ComprehensiveValidator", () => {
	const validator = new ComprehensiveValidator();
	const testFiles: string[] = [];

	// Helper to create temporary test files
	const createTestFile = (filename: string, content: string): string => {
		writeFileSync(filename, content);
		testFiles.push(filename);
		return filename;
	};

	afterEach(() => {
		// Clean up test files
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		testFiles.length = 0;
	});

	describe("validateWorkflow", () => {
		it("should validate correct YAML workflow", async () => {
			const validYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`;

			const result = await validator.validateWorkflow(validYaml);

			expect(result.valid).toBe(true);
			expect(result.yamlErrors).toHaveLength(0);
			expect(result.schemaErrors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
			expect(result.parsedWorkflow).toBeDefined();
			expect((result.parsedWorkflow as { name?: string })?.name).toBe("Test Workflow");
		});

		it("should detect YAML syntax errors", async () => {
			const invalidYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Wrong indentation
      - uses: actions/checkout@v4
`;

			const result = await validator.validateWorkflow(invalidYaml);

			expect(result.valid).toBe(false);
			expect(result.yamlErrors).toHaveLength(1);
			expect(result.yamlErrors[0].line).toBeGreaterThan(0);
			expect(result.yamlErrors[0].column).toBeGreaterThan(0);
			expect(result.parsedWorkflow).toBeUndefined();
		});

		it("should detect schema validation errors", async () => {
			const invalidSchema = `
name: Incomplete Workflow
# Missing required 'on' and 'jobs' fields
`;

			const result = await validator.validateWorkflow(invalidSchema);

			expect(result.valid).toBe(false);
			expect(result.yamlErrors).toHaveLength(0); // YAML is valid
			expect(result.schemaErrors.length).toBeGreaterThan(0);
			expect(result.schemaErrors.some((e) => e.message.includes("jobs"))).toBe(true);
			expect(result.schemaErrors.some((e) => e.message.includes("on"))).toBe(true);
		});

		it("should validate workflow with reusable workflow calls", async () => {
			const workflowCall = `
name: Caller Workflow
on: push
jobs:
  deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
    secrets:
      token: \${{ secrets.TOKEN }}
`;

			const result = await validator.validateWorkflow(workflowCall);

			expect(result.valid).toBe(true);
			expect(result.yamlErrors).toHaveLength(0);
			expect(result.schemaErrors).toHaveLength(0);
			const workflow = result.parsedWorkflow as { jobs?: { deploy?: { uses?: string } } };
			expect(workflow?.jobs?.deploy?.uses).toBe("./.github/workflows/deploy.yml");
		});

		it("should handle skip YAML validation option", async () => {
			const invalidYaml = `
name: Test
on: push
invalid: yaml: syntax:
`;

			const result = await validator.validateWorkflow(invalidYaml, {
				skipYamlValidation: true,
			});

			// Should still fail because YAML can't be parsed, but no YAML validation errors
			expect(result.valid).toBe(false);
			expect(result.yamlErrors).toHaveLength(1); // Parse error, not validation error
		});

		it("should handle skip schema validation option", async () => {
			const incompleteWorkflow = `
name: Incomplete
# Missing required fields
`;

			const result = await validator.validateWorkflow(incompleteWorkflow, {
				skipSchemaValidation: true,
			});

			expect(result.valid).toBe(true); // No schema validation
			expect(result.yamlErrors).toHaveLength(0);
			expect(result.schemaErrors).toHaveLength(0);
			expect(result.parsedWorkflow).toBeDefined();
		});

		it("should continue on YAML error when requested", async () => {
			const invalidYaml = `
name: Test
invalid: yaml: syntax:
`;

			const result = await validator.validateWorkflow(invalidYaml, {
				continueOnYamlError: true,
			});

			expect(result.valid).toBe(false);
			expect(result.yamlErrors.length).toBeGreaterThan(0);
			// Should still fail because we can't parse the YAML
		});

		it("should handle empty content", async () => {
			const result = await validator.validateWorkflow("");

			// Empty content parses as null, which is valid YAML but invalid workflow schema
			expect(result.valid).toBe(false); // Invalid for workflow schema (missing required fields)
			expect(result.yamlErrors).toHaveLength(0); // YAML is technically valid (null)
			expect(result.schemaErrors.length).toBeGreaterThan(0); // Schema validation should fail
		});
	});

	describe("validateWorkflowFile", () => {
		it("should validate file from disk", async () => {
			const filename = createTestFile(
				"test-workflow.yml",
				`
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
`
			);

			const result = await validator.validateWorkflowFile(filename);

			expect(result.valid).toBe(true);
			expect(result.filePath).toBe(filename);
			expect(result.yamlErrors).toHaveLength(0);
			expect(result.schemaErrors).toHaveLength(0);
		});

		it("should handle file read errors", async () => {
			const result = await validator.validateWorkflowFile("nonexistent-file.yml");

			expect(result.valid).toBe(false);
			expect(result.yamlErrors).toHaveLength(1);
			expect(result.yamlErrors[0].message).toContain("Failed to read file");
		});

		it("should validate invalid file content", async () => {
			const filename = createTestFile(
				"invalid-workflow.yml",
				`
name: Invalid
on: push
jobs:
  test:
    # Missing runs-on
    steps: []
`
			);

			const result = await validator.validateWorkflowFile(filename);

			expect(result.valid).toBe(false);
			expect(result.schemaErrors.length).toBeGreaterThan(0);
		});
	});

	describe("formatValidationReport", () => {
		it("should format successful validation", () => {
			const result = {
				valid: true,
				yamlErrors: [],
				schemaErrors: [],
				actionErrors: [],
				warnings: [],
				actionWarnings: [],
			};

			const report = validator.formatValidationReport(result, "test.yml");

			expect(report).toContain("[ok] Validation passed");
			expect(report).toContain("test.yml");
		});

		it("should format YAML syntax errors", () => {
			const result = {
				valid: false,
				yamlErrors: [
					{
						line: 5,
						column: 10,
						message: "Invalid indentation",
						snippet: "line 5 content",
					},
				],
				schemaErrors: [],
				actionErrors: [],
				warnings: [],
				actionWarnings: [],
			};

			const report = validator.formatValidationReport(result, "test.yml");

			expect(report).toContain("[!!] Validation failed");
			expect(report).toContain("-- YAML Syntax Errors");
			expect(report).toContain("Line 5, Column 10");
			expect(report).toContain("Invalid indentation");
			expect(report).toContain("line 5 content");
		});

		it("should format schema validation errors", () => {
			const result = {
				valid: false,
				yamlErrors: [],
				schemaErrors: [
					{
						path: "jobs.test",
						message: "Missing runs-on field",
						expected: "string",
						actual: "undefined",
					},
				],
				actionErrors: [],
				warnings: [],
				actionWarnings: [],
			};

			const report = validator.formatValidationReport(result);

			expect(report).toContain("-- Schema Validation Errors");
			expect(report).toContain("jobs.test: Missing runs-on field");
			expect(report).toContain("Expected: string");
			expect(report).toContain("Actual: undefined");
		});

		it("should format warnings", () => {
			const result = {
				valid: true,
				yamlErrors: [],
				schemaErrors: [],
				actionErrors: [],
				warnings: [
					{
						path: "jobs.test",
						message: "No steps defined",
						suggestion: "Add steps array",
					},
				],
				actionWarnings: [],
			};

			const report = validator.formatValidationReport(result);

			expect(report).toContain("[!] 1 warning(s)");
			expect(report).toContain("jobs.test: No steps defined");
			expect(report).toContain("Suggestion: Add steps array");
		});

		it("should format combined errors and warnings", () => {
			const result = {
				valid: false,
				yamlErrors: [
					{
						line: 1,
						column: 1,
						message: "YAML error",
						snippet: "snippet",
					},
				],
				schemaErrors: [
					{
						path: "root",
						message: "Schema error",
						expected: "object",
						actual: "string",
					},
				],
				actionErrors: [],
				warnings: [
					{
						path: "jobs.test",
						message: "Warning message",
						suggestion: "Fix this",
					},
				],
				actionWarnings: [],
			};

			const report = validator.formatValidationReport(result, "complex.yml");

			expect(report).toContain("[!!] Validation failed in complex.yml");
			expect(report).toContain("-- YAML Syntax Errors");
			expect(report).toContain("-- Schema Validation Errors");
			expect(report).toContain("[!] Schema Warnings");
		});
	});
});
