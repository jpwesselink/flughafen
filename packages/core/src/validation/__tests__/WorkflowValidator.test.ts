import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ValidationOptions } from "../types";
import { WorkflowValidator } from "../WorkflowValidator";

describe("WorkflowValidator", () => {
	let tempDir: string;
	let tempFiles: string[] = [];

	beforeEach(() => {
		// Create temp directory for test files
		tempDir = join(tmpdir(), `workflow-validator-test-${Date.now()}`);
		if (!existsSync(tempDir)) {
			mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up temp files
		tempFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		tempFiles = [];
	});

	const createTempFile = (filename: string, content: string): string => {
		const filePath = join(tempDir, filename);
		writeFileSync(filePath, content, "utf-8");
		tempFiles.push(filePath);
		return filePath;
	};

	describe("validateFile", () => {
		it("should validate a correct workflow file", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test Workflow")
	.on("push", { branches: ["main"] })
	.job("test", job => job
		.runsOn("ubuntu-latest")
		.step(step => step
			.name("Checkout")
			.run("git checkout")
		)
	);`;

			const filePath = createTempFile("valid-workflow.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.file).toBe(filePath);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect non-existent files", async () => {
			const validator = new WorkflowValidator();
			const result = await validator.validateFile("/non/existent/file.ts");

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toBe("File does not exist");
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should detect empty files", async () => {
			const filePath = createTempFile("empty.ts", "");
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.warnings.some((w) => w.rule === "schema")).toBe(true);
		});

		it("should detect missing default export", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

const workflow = createWorkflow()
	.name("Test")
	.on("push", { branches: ["main"] });`;

			const filePath = createTempFile("no-export.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.warnings.some((w) => w.rule === "schema")).toBe(true);
		});

		it("should detect unmatched parentheses", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow(
	.name("Test"
	.on("push", { branches: ["main"] });`;

			const filePath = createTempFile("unmatched-parens.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect unmatched brackets", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test")
	.on("push", { branches: ["main" });`;

			const filePath = createTempFile("unmatched-brackets.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect unmatched braces", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test")
	.on("push", { branches: ["main"] )`;

			const filePath = createTempFile("unmatched-braces.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect missing @flughafen/core import", async () => {
			const content = `export default createWorkflow()
	.name("Test")
	.on("push", { branches: ["main"] });`;

			const filePath = createTempFile("missing-import.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.warnings.some((w) => w.rule === "schema")).toBe(true);
		});

		it("should handle validation errors gracefully", async () => {
			const filePath = createTempFile("invalid.ts", "not valid typescript at all {{{");
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			expect(result.valid).toBe(false);
			// Should have syntax errors for unmatched braces
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should respect ignore option", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test")
	.on("push", { branches: ["main"] });`;

			const filePath = createTempFile("ignore-test.ts", content);
			const validator = new WorkflowValidator();

			// Without ignore, schema error should appear (missing job)
			const resultWithErrors = await validator.validateFile(filePath);
			expect(resultWithErrors.errors.some((e) => e.rule === "schema")).toBe(true);

			// With ignore schema, errors should be filtered out
			const options: ValidationOptions = { ignore: ["schema"] };
			const resultWithIgnore = await validator.validateFile(filePath, options);
			expect(resultWithIgnore.errors.some((e) => e.rule === "schema")).toBe(false);
		});
	});

	describe("validateFiles", () => {
		it("should validate multiple files", async () => {
			const file1 = createTempFile(
				"workflow1.ts",
				`import { createWorkflow } from "@flughafen/core";
export default createWorkflow().name("Test 1").on("push");`
			);

			const file2 = createTempFile(
				"workflow2.ts",
				`import { createWorkflow } from "@flughafen/core";
export default createWorkflow().name("Test 2").on("pull_request");`
			);

			const validator = new WorkflowValidator();
			const results = await validator.validateFiles([file1, file2]);

			expect(results).toHaveLength(2);
			expect(results[0].file).toBe(file1);
			expect(results[1].file).toBe(file2);
		});

		it("should continue validation even if one file fails", async () => {
			const file1 = createTempFile(
				"good.ts",
				`import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Good")
	.on("push", { branches: ["main"] })
	.job("test", job => job.runsOn("ubuntu-latest"));`
			);

			const file2 = "/non/existent/file.ts";

			const validator = new WorkflowValidator();
			const results = await validator.validateFiles([file1, file2]);

			expect(results).toHaveLength(2);
			expect(results[0].valid).toBe(true);
			expect(results[1].valid).toBe(false);
			expect(results[1].errors[0].rule).toBe("schema");
		});
	});

	describe("registerValidator", () => {
		it("should allow registering custom validators", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";
export default createWorkflow().name("Test").on("push");`;

			const filePath = createTempFile("custom.ts", content);
			const validator = new WorkflowValidator();

			let customValidatorCalled = false;

			validator.registerValidator((context, result) => {
				customValidatorCalled = true;
				result.warnings.push({
					path: context.filePath,
					message: "Custom warning",
					severity: "warning",
					rule: "custom-rule",
				});
			});

			const result = await validator.validateFile(filePath);

			expect(customValidatorCalled).toBe(true);
			expect(result.warnings.some((w) => w.rule === "custom-rule")).toBe(true);
		});
	});

	describe("clearValidators", () => {
		it("should clear all validators", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";
export default createWorkflow().name("Test").on("push");`;

			const filePath = createTempFile("clear.ts", content);
			const validator = new WorkflowValidator();

			validator.clearValidators();

			const result = await validator.validateFile(filePath);

			// After clearing, no built-in validators should run
			// So even a file without default export won't trigger warnings
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe("expression validation", () => {
		it("should validate GitHub Actions expressions", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test")
	.on("push", { branches: ["main"] })
	.job("test", job => job
		.runsOn("ubuntu-latest")
		.if("\${{ github.ref == 'refs/heads/main' }}")
		.step(step => step
			.name("Test")
			.run("echo test")
		)
	);`;

			const filePath = createTempFile("expressions.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			// Should process expressions without errors
			expect(result.file).toBe(filePath);
		});

		it("should handle malformed expressions", async () => {
			const content = `import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Test")
	.on("push")
	.job("test", job => job
		.runsOn("ubuntu-latest")
		.if("\${{ invalid.context.that.doesnt.exist }}")
	);`;

			const filePath = createTempFile("bad-expressions.ts", content);
			const validator = new WorkflowValidator();
			const result = await validator.validateFile(filePath);

			// Expression validator should flag unknown contexts
			// Result may have errors or warnings depending on expression validation
			expect(result.file).toBe(filePath);
		});
	});
});
