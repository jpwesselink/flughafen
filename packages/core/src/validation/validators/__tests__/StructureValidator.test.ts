import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ValidationContext, WorkflowValidationResult } from "../../types";
import { StructureValidator } from "../StructureValidator";

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
		it("should pass valid YAML workflow", async () => {
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

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should warn when workflow has no name", async () => {
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

			await validator.validate(context, result);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].rule).toBe("schema");
		});

		it("should error when workflow has no triggers", async () => {
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

			await validator.validate(context, result);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.rule === "schema" && e.message.includes("on"))).toBe(true);
		});

		it("should error when workflow has no jobs", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push`,
				"test.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.rule === "schema" && e.message.includes("jobs"))).toBe(true);
		});

		it("should warn when job has no steps (steps not required by schema)", async () => {
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

			await validator.validate(context, result);

			// Steps not required by JSON Schema, but validator warns
			expect(result.errors).toHaveLength(0);
			expect(result.warnings.some((w) => w.message.includes("steps"))).toBe(true);
		});

		it("should error when job has no runs-on", async () => {
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

			await validator.validate(context, result);

			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should handle multiple triggers", async () => {
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

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should handle object triggers", async () => {
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

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should skip validation on YAML parse errors", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test
on: push
  invalid: yaml: structure`,
				"test.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should not add structure errors when YAML is invalid
			// (SyntaxValidator handles YAML errors)
			expect(result.errors).toHaveLength(0);
		});

		it("should pass reusable workflow jobs without runs-on or steps", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Deploy
on: push
jobs:
  versioning:
    uses: org/repo/.github/workflows/versioning.yml@main
    with:
      version: "1.0.0"
  deploy:
    needs: versioning
    uses: org/repo/.github/workflows/deploy.yml@main`,
				"deploy.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should pass mixed jobs - regular and reusable workflow", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm build
  deploy:
    needs: build
    uses: org/repo/.github/workflows/deploy.yml@main`,
				"ci.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("should still error when regular job missing runs-on", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: CI
on: push
jobs:
  build:
    steps:
      - run: npm build
  deploy:
    uses: org/repo/.github/workflows/deploy.yml@main`,
				"ci.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should error for build job missing runs-on
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.message.includes("build") || e.message.includes("runs-on"))).toBe(true);
		});
	});

	describe("TypeScript validation", () => {
		// TypeScript validation uses synth to compile TS → YAML, then validates the YAML
		// These tests use actual workflow files from the project root since synth needs
		// real files with proper @flughafen/core imports
		// Path: __dirname = packages/core/src/validation/validators/__tests__
		// We need: project-root/flughafen/workflows

		const workflowsDir = resolve(__dirname, "../../../../../../flughafen/workflows");

		it("should pass valid TypeScript workflow", async () => {
			const validator = new StructureValidator();
			const filePath = resolve(workflowsDir, "ci.ts");
			const context = createContext("", filePath); // content not used for TS
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should pass another TypeScript workflow", async () => {
			const validator = new StructureValidator();
			const filePath = resolve(workflowsDir, "deploy-docs.ts");
			const context = createContext("", filePath);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should error when TypeScript file does not exist", async () => {
			const validator = new StructureValidator();
			const filePath = resolve(workflowsDir, "non-existent.ts");
			const context = createContext("", filePath);
			const result = createResult();

			await validator.validate(context, result);

			// Should error because synth will fail on non-existent file
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});
	});

	describe("File type detection", () => {
		it("should detect .yml as YAML", async () => {
			const validator = new StructureValidator();
			// Missing 'on' trigger should produce a schema error
			const context = createContext(
				"name: Test\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hello",
				"workflow.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should parse as YAML (missing 'on' triggers error)
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect .yaml as YAML", async () => {
			const validator = new StructureValidator();
			// Missing 'on' trigger should produce a schema error
			const context = createContext(
				"name: Test\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hello",
				"workflow.yaml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should parse as YAML (missing 'on' triggers error)
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should detect .ts as TypeScript and use synth-based validation", async () => {
			const validator = new StructureValidator();
			// Non-existent file should trigger synth error, proving TS validation is used
			const context = createContext("", "/fake/non-existent/workflow.ts");
			const result = createResult();

			await validator.validate(context, result);

			// Should error because synth fails on non-existent file
			expect(result.errors.some((e) => e.rule === "schema")).toBe(true);
		});

		it("should pass valid YAML with empty jobs (allowed by schema)", async () => {
			const validator = new StructureValidator();
			const context = createContext("name: Test\non: push\njobs: {}", "workflow.yml");
			const result = createResult();

			await validator.validate(context, result);

			// Empty jobs is allowed by JSON Schema
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("Action validation (action.yml/action.yaml)", () => {
		it("should validate valid composite action", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action
runs:
  using: composite
  steps:
    - run: echo hello
      shell: bash`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should validate valid JavaScript action", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action
inputs:
  name:
    description: Name to greet
    required: true
runs:
  using: node20
  main: dist/index.js`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors).toHaveLength(0);
		});

		it("should error when action missing name", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`description: A test action
runs:
  using: composite
  steps:
    - run: echo hello
      shell: bash`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.message.includes("name"))).toBe(true);
		});

		it("should error when action missing description", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
runs:
  using: composite
  steps:
    - run: echo hello
      shell: bash`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.message.includes("description"))).toBe(true);
		});

		it("should error when action missing runs", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.message.includes("runs"))).toBe(true);
		});

		it("should detect action.yaml extension", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action
runs:
  using: composite
  steps:
    - run: echo hello
      shell: bash`,
				"action.yaml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should validate as action, not workflow
			expect(result.errors).toHaveLength(0);
		});

		it("should warn when JavaScript action missing main", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action
runs:
  using: node20`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should error because node actions need main
			expect(result.errors.some((e) => e.message.includes("main"))).toBe(true);
		});

		it("should warn when composite action has no steps", async () => {
			const validator = new StructureValidator();
			const context = createContext(
				`name: Test Action
description: A test action
runs:
  using: composite`,
				"action.yml"
			);
			const result = createResult();

			await validator.validate(context, result);

			// Should warn about missing steps
			expect(result.warnings.some((w) => w.message.includes("steps"))).toBe(true);
		});
	});
});
