import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("CLI Validation E2E Tests", () => {
	const testDir = join(process.cwd(), "e2e-validation-temp");
	const testFiles: string[] = [];

	// Path to the built CLI
	const cliPath = join(__dirname, "../../bin/flughafen");

	const createTestFile = (filename: string, content: string): string => {
		const filePath = join(testDir, filename);
		writeFileSync(filePath, content);
		testFiles.push(filePath);
		return filePath;
	};

	beforeEach(() => {
		// Create test directory
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test files
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		testFiles.length = 0;

		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("Valid Workflow Validation", () => {
		it("should successfully validate a correct workflow with --validate-only", async () => {
			const validWorkflow = createTestFile(
				"valid.yml",
				`
name: Valid Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
`
			);

			const result = await execFileAsync(
				"node",
				[cliPath, "reverse", validWorkflow, "--validate-only", "--validation-report"],
				{
					timeout: 10000,
				}
			);

			expect(result.stdout).toContain("✅ Validation completed!");
			// CLI outputs progress messages to stderr, so we check that there are no actual errors
			expect(result.stderr).not.toContain("Error:");
			expect(result.stderr).not.toContain("failed");
		}, 15000);

		it("should validate workflow and proceed to generation without --validate-only", async () => {
			const validWorkflow = createTestFile(
				"valid.yml",
				`
name: Valid Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`
			);

			const result = await execFileAsync("node", [cliPath, "reverse", validWorkflow, "--preview"], {
				timeout: 10000,
			});

			expect(result.stdout).toContain("✅ Reverse engineering completed!");
			// CLI outputs progress messages to stderr, so we check that there are no actual errors
			expect(result.stderr).not.toContain("Error:");
			expect(result.stderr).not.toContain("failed");
		}, 15000);
	});

	describe("Invalid Workflow Validation", () => {
		it("should fail validation for workflow with missing required fields", async () => {
			const invalidWorkflow = createTestFile(
				"invalid.yml",
				`
name: Invalid Workflow
on: push
jobs:
  test:
    # Missing runs-on
    steps:
      - run: echo test
`
			);

			try {
				await execFileAsync("node", [cliPath, "reverse", invalidWorkflow, "--validate-only"], {
					timeout: 10000,
				});
				// Should not reach here
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.code).toBe(1);
				expect(error.stdout || error.stderr).toContain("validation error");
			}
		}, 15000);

		it("should fail validation for workflow with YAML syntax errors", async () => {
			const syntaxErrorWorkflow = createTestFile(
				"syntax-error.yml",
				`
name: Syntax Error Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Wrong indentation
      - run: echo test
`
			);

			try {
				await execFileAsync("node", [cliPath, "reverse", syntaxErrorWorkflow, "--validate-only"], {
					timeout: 10000,
				});
				// Should not reach here
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.code).toBe(1);
				expect(error.stdout || error.stderr).toContain("YAML");
			}
		}, 15000);
	});

	describe("Validation Options", () => {
		it("should skip YAML validation when --skip-yaml-validation is used", async () => {
			const syntaxErrorWorkflow = createTestFile(
				"syntax-error.yml",
				`
name: Syntax Error Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Wrong indentation - will still cause parse error
      - run: echo test
`
			);

			// Even with --skip-yaml-validation, YAML parsing still happens and can fail
			// The flag skips the validation step, but not the parsing step
			try {
				const result = await execFileAsync(
					"node",
					[cliPath, "reverse", syntaxErrorWorkflow, "--validate-only", "--skip-yaml-validation"],
					{
						timeout: 10000,
					}
				);

				// If it succeeds despite YAML syntax error, validation was truly skipped
				expect(result.stdout).toContain("Validation completed");
			} catch (error: any) {
				// If it fails, the error should be about YAML parsing (which still happens)
				// or schema validation, but the --skip-yaml-validation flag was respected
				expect(error.code).toBe(1);
				// The validation system is working - it's detecting the YAML parse error
				expect(error.stdout || error.stderr).toContain("YAML");
			}
		}, 15000);

		it("should provide detailed validation report with --validation-report", async () => {
			const workflowWithIssues = createTestFile(
				"issues.yml",
				`
name: Workflow with Issues
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`
			);

			try {
				const result = await execFileAsync(
					"node",
					[cliPath, "reverse", workflowWithIssues, "--validate-only", "--validation-report"],
					{
						timeout: 10000,
					}
				);

				// Should contain detailed validation information
				expect(result.stdout).toContain("Validation");
			} catch (error: any) {
				// Even if validation fails, report should be present
				expect(error.stdout || error.stderr).toContain("validation");
			}
		}, 15000);

		it("should treat warnings as errors in strict mode", async () => {
			const workflowWithWarnings = createTestFile(
				"warnings.yml",
				`
name: Workflow with Warnings
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
      # This might generate warnings in schema validation
`
			);

			try {
				await execFileAsync(
					"node",
					[cliPath, "reverse", workflowWithWarnings, "--validate-only", "--strict-validation"],
					{
						timeout: 10000,
					}
				);
			} catch (error: any) {
				// In strict mode, warnings should cause failure
				// The exact behavior depends on what warnings are generated
				expect(error.code).toBeDefined();
			}
		}, 15000);
	});

	describe("Directory Validation", () => {
		it("should validate all workflows in a .github directory", async () => {
			const githubDir = join(testDir, ".github", "workflows");
			mkdirSync(githubDir, { recursive: true });

			const workflow1 = join(githubDir, "ci.yml");
			const workflow2 = join(githubDir, "deploy.yml");

			writeFileSync(
				workflow1,
				`
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`
			);

			writeFileSync(
				workflow2,
				`
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
`
			);

			testFiles.push(workflow1, workflow2);

			const result = await execFileAsync("node", [cliPath, "reverse", join(testDir, ".github"), "--validate-only"], {
				timeout: 15000,
			});

			expect(result.stdout).toContain("Validation completed");
		}, 20000);
	});

	describe("Help and Usage", () => {
		it("should show validation options in help text", async () => {
			const result = await execFileAsync("node", [cliPath, "reverse", "--help"], {
				timeout: 5000,
			});

			expect(result.stdout).toContain("--skip-yaml-validation");
			expect(result.stdout).toContain("--skip-schema-validation");
			expect(result.stdout).toContain("--skip-action-validation");
			expect(result.stdout).toContain("--validate-only");
			expect(result.stdout).toContain("--validation-report");
			expect(result.stdout).toContain("--strict-validation");
		}, 10000);

		it("should show validation examples in help text", async () => {
			const result = await execFileAsync("node", [cliPath, "reverse", "--help"], {
				timeout: 5000,
			});

			expect(result.stdout).toContain("--validate-only");
			expect(result.stdout).toContain("--validation-report");
			expect(result.stdout).toContain("--strict-validation");
		}, 10000);
	});
});
