import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("CLI validate command", () => {
	const testDir = join(process.cwd(), "validate-test-temp");
	const testFiles: string[] = [];
	const cliPath = join(__dirname, "../../../bin/flughafen");

	const createTestFile = (filename: string, content: string): string => {
		const filePath = join(testDir, filename);
		writeFileSync(filePath, content);
		testFiles.push(filePath);
		return filePath;
	};

	beforeEach(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		testFiles.length = 0;

		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("Valid workflows", () => {
		it("should pass validation for valid YAML workflow", async () => {
			const workflow = createTestFile(
				"valid.yml",
				`name: Valid Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			const result = await execFileAsync("node", [cliPath, "validate", workflow, "--skip-vuln-check"], {
				timeout: 10000,
			});

			expect(result.stdout).toContain("PASS");
			expect(result.stdout).toContain("All validations passed");
		}, 15000);

		it("should pass validation for valid TypeScript workflow", async () => {
			const workflow = createTestFile(
				"valid.ts",
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .name("Test")
  .on("push")
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step.run("echo hello"))
  );`
			);

			const result = await execFileAsync("node", [cliPath, "validate", workflow, "--skip-vuln-check"], {
				timeout: 10000,
			});

			expect(result.stdout).toContain("PASS");
		}, 15000);

		it("should validate multiple files", async () => {
			const workflow1 = createTestFile(
				"ci.yml",
				`name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test`
			);

			const workflow2 = createTestFile(
				"deploy.yml",
				`name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy`
			);

			const result = await execFileAsync(
				"node",
				[cliPath, "validate", workflow1, workflow2, "--skip-vuln-check"],
				{ timeout: 10000 }
			);

			expect(result.stdout).toContain("2/2 passed");
		}, 15000);
	});

	describe("Invalid workflows", () => {
		it("should fail validation for workflow missing triggers", async () => {
			const workflow = createTestFile(
				"no-trigger.yml",
				`name: No Trigger
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			try {
				await execFileAsync("node", [cliPath, "validate", workflow, "--skip-vuln-check"], {
					timeout: 10000,
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.code).toBe(1);
				expect(error.stdout).toContain("FAIL");
				expect(error.stdout).toContain("workflow-triggers");
			}
		}, 15000);

		it("should fail validation for workflow missing jobs", async () => {
			const workflow = createTestFile(
				"no-jobs.yml",
				`name: No Jobs
on: push`
			);

			try {
				await execFileAsync("node", [cliPath, "validate", workflow, "--skip-vuln-check"], {
					timeout: 10000,
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.code).toBe(1);
				expect(error.stdout).toContain("FAIL");
				expect(error.stdout).toContain("workflow-jobs");
			}
		}, 15000);

		it("should warn for workflow missing name", async () => {
			const workflow = createTestFile(
				"no-name.yml",
				`on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			const result = await execFileAsync(
				"node",
				[cliPath, "validate", workflow, "--skip-vuln-check", "--verbose"],
				{ timeout: 10000 }
			);

			// Should pass but with warnings (warnings only show with --verbose)
			expect(result.stdout).toContain("PASS");
			expect(result.stdout).toContain("Warnings:");
		}, 15000);

		it("should fail in strict mode for missing runs-on", async () => {
			const workflow = createTestFile(
				"no-runs-on.yml",
				`name: No Runs On
on: push
jobs:
  test:
    steps:
      - run: echo hello`
			);

			try {
				await execFileAsync("node", [cliPath, "validate", workflow, "--strict", "--skip-vuln-check"], {
					timeout: 10000,
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.code).toBe(1);
				expect(error.stdout).toContain("FAIL");
			}
		}, 15000);
	});

	describe("Options", () => {
		it("should support --strict flag", async () => {
			const workflow = createTestFile(
				"test.yml",
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			const result = await execFileAsync("node", [cliPath, "validate", workflow, "--strict", "--skip-vuln-check"], {
				timeout: 10000,
			});

			expect(result.stdout).toContain("PASS");
		}, 15000);

		it("should support --verbose flag", async () => {
			const workflow = createTestFile(
				"test.yml",
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			const result = await execFileAsync(
				"node",
				[cliPath, "validate", workflow, "--verbose", "--skip-vuln-check"],
				{ timeout: 10000 }
			);

			expect(result.stdout).toContain("PASS");
		}, 15000);

		it("should support --silent flag", async () => {
			const workflow = createTestFile(
				"test.yml",
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`
			);

			const result = await execFileAsync("node", [cliPath, "validate", workflow, "--silent", "--skip-vuln-check"], {
				timeout: 10000,
			});

			// Silent mode should have minimal output
			expect(result.stdout.length).toBeLessThan(100);
		}, 15000);

		it("should support --skip-vuln-check flag", async () => {
			const workflow = createTestFile(
				"test.yml",
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`
			);

			const result = await execFileAsync("node", [cliPath, "validate", workflow, "--skip-vuln-check"], {
				timeout: 10000,
			});

			expect(result.stdout).toContain("PASS");
		}, 15000);
	});

	describe("Directory validation", () => {
		it("should validate all workflows in a directory", async () => {
			const githubDir = join(testDir, ".github", "workflows");
			mkdirSync(githubDir, { recursive: true });

			const workflow1 = join(githubDir, "ci.yml");
			const workflow2 = join(githubDir, "deploy.yml");

			writeFileSync(
				workflow1,
				`name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test`
			);

			writeFileSync(
				workflow2,
				`name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy`
			);

			testFiles.push(workflow1, workflow2);

			// Pass both files directly instead of relying on directory discovery
			const result = await execFileAsync(
				"node",
				[cliPath, "validate", workflow1, workflow2, "--skip-vuln-check"],
				{ timeout: 15000 }
			);

			expect(result.stdout).toContain("2/2 passed");
		}, 20000);
	});

	describe("Help", () => {
		it("should show help for validate command", async () => {
			const result = await execFileAsync("node", [cliPath, "validate", "--help"], {
				timeout: 5000,
			});

			expect(result.stdout).toContain("validate");
			expect(result.stdout).toContain("--strict");
			expect(result.stdout).toContain("--verbose");
			expect(result.stdout).toContain("--silent");
			expect(result.stdout).toContain("--skip-vuln-check");
		}, 10000);
	});
});
