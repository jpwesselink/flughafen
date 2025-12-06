import { describe, expect, it } from "vitest";
import { StructureValidator } from "../StructureValidator";
import type { ValidationContext, WorkflowValidationResult } from "../../types";

describe("StructureValidator", () => {
	const createContext = (content: string, filePath: string, options = {}): ValidationContext => ({
		content,
		filePath,
		options: { verbose: false, silent: false, ...options },
	});

	const createResult = (): WorkflowValidationResult => ({
		file: "",
		valid: true,
		errors: [],
		warnings: [],
	});

	describe("YAML validation", () => {
		it("should pass valid YAML workflow", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should warn when workflow has no name", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].rule).toBe("schema");
		});

		it("should error when workflow has no triggers", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should error when workflow has no jobs", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should error when job has no steps", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should error when job has no runs-on", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push
jobs:
  test:
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should handle multiple triggers", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should handle object triggers", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on:
  push:
    branches: [main]
  pull_request:
    types: [opened]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should skip validation on YAML parse errors", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push
  invalid: yaml: structure`,
				"test.yml"
			);
			const result = createResult();

			validator.validate(context, result);

			// Should not add structure errors when YAML is invalid
			// (SyntaxValidator handles YAML errors)
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("TypeScript validation", () => {
		it("should pass valid TypeScript workflow", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .name("Test")
  .on("push")
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step.run("echo hello"))
  );`,
				"test.ts"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should warn when TypeScript workflow has no name", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .on("push")
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step.run("echo hello"))
  );`,
				"test.ts"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].rule).toBe("schema");
		});

		it("should error when TypeScript workflow has no triggers", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .name("Test")
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step.run("echo hello"))
  );`,
				"test.ts"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should error when TypeScript workflow has no jobs", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .name("Test")
  .on("push");`,
				"test.ts"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});

		it("should error when TypeScript job has no runsOn", () => {
			const validator = new StructureValidator();
			const context = createContext(
				`import { createWorkflow } from '@flughafen/core';
export default createWorkflow()
  .name("Test")
  .on("push")
  .job("test", (job) => job
    .step((step) => step.run("echo hello"))
  );`,
				"test.ts"
			);
			const result = createResult();

			validator.validate(context, result);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rule).toBe("schema");
		});
	});

	describe("File type detection", () => {
		it("should detect .yml as YAML", () => {
			const validator = new StructureValidator();
			const context = createContext("name: Test\non: push\njobs: {}", "workflow.yml");
			const result = createResult();

			validator.validate(context, result);

			// Should parse as YAML (empty jobs object triggers error)
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect .yaml as YAML", () => {
			const validator = new StructureValidator();
			const context = createContext("name: Test\non: push\njobs: {}", "workflow.yaml");
			const result = createResult();

			validator.validate(context, result);

			// Should parse as YAML
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect .ts as TypeScript", () => {
			const validator = new StructureValidator();
			const context = createContext("createWorkflow().name('Test').on('push')", "workflow.ts");
			const result = createResult();

			validator.validate(context, result);

			// Should use regex detection (missing .job())
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});
	});
});
