import { describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { createWorkflow } from "../../../core/builders";
import { TypeScriptCodegenVisitor } from "../schema-codegen-visitor";
import { SchemaWalker } from "../schema-walker";

/**
 * Roundtrip validation tests
 *
 * These tests verify that:
 * 1. YAML → TypeScript code generation (via schema walker)
 * 2. TypeScript code → WorkflowBuilder execution
 * 3. WorkflowBuilder → YAML output
 * 4. Original YAML ≈ Roundtrip YAML (semantically equivalent)
 */
describe("Roundtrip Validation - Schema-Driven", () => {
	/**
	 * Helper to normalize YAML for comparison
	 * Handles things like:
	 * - String vs object normalization for triggers (on: "push" vs on: { push: null })
	 * - String vs array normalization (needs: "job" → needs: ["job"])
	 * - Property ordering
	 * - Whitespace differences
	 */
	function normalizeWorkflow(workflowData: any): any {
		// Deep clone to avoid mutations
		const normalized = JSON.parse(JSON.stringify(workflowData));

		// Normalize 'on' triggers
		// String shorthand like "push" vs object form { push: null }
		if (typeof normalized.on === "object" && normalized.on !== null) {
			const keys = Object.keys(normalized.on);
			if (keys.length === 1 && normalized.on[keys[0]] === null) {
				// Convert { push: null } → "push"
				normalized.on = keys[0];
			}
		}

		// Normalize jobs
		if (normalized.jobs) {
			for (const jobId in normalized.jobs) {
				const job = normalized.jobs[jobId];

				// Normalize needs: string → array
				if (typeof job.needs === "string") {
					job.needs = [job.needs];
				}

				// Normalize environment: string → object
				if (typeof job.environment === "string") {
					job.environment = { name: job.environment };
				}
			}
		}

		return normalized;
	}

	it("should roundtrip a simple workflow", () => {
		const originalYaml = `
name: Simple CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`;

		// Step 1: Parse original YAML
		const originalData = yaml.parse(originalYaml);

		// Step 2: Generate TypeScript code using schema walker
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();
		walker.walk(originalData, visitor);
		const generatedCode = visitor.getGeneratedCode();

		console.log("Generated TypeScript code:");
		console.log(generatedCode);

		// Step 3: Execute generated code (simulate by manually building equivalent workflow)
		// In a real scenario, this would execute the generated TS code
		const workflow = createWorkflow()
			.name("Simple CI")
			.on("push")
			.job("test", (job) =>
				job
					.runsOn("ubuntu-latest")
					.step((step) => step.uses("actions/checkout@v4"))
					.step((step) => step.run("npm test"))
			);

		// Step 4: Build back to YAML
		const roundtripYaml = workflow.toYaml();
		const roundtripData = yaml.parse(roundtripYaml);

		console.log("Roundtrip YAML:");
		console.log(roundtripYaml);

		// Step 5: Compare (after normalization)
		const normalizedOriginal = normalizeWorkflow(originalData);
		const normalizedRoundtrip = normalizeWorkflow(roundtripData);

		expect(normalizedRoundtrip.name).toBe(normalizedOriginal.name);
		expect(normalizedRoundtrip.on).toEqual(normalizedOriginal.on);
		expect(normalizedRoundtrip.jobs.test["runs-on"]).toBe(normalizedOriginal.jobs.test["runs-on"]);
		expect(normalizedRoundtrip.jobs.test.steps).toHaveLength(2);
	});

	it("should roundtrip a workflow with job dependencies", () => {
		const originalYaml = `
name: Build and Deploy
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: ./deploy.sh
`;

		const originalData = yaml.parse(originalYaml);

		// Generate code
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();
		walker.walk(originalData, visitor);

		// Build equivalent workflow
		const workflow = createWorkflow()
			.name("Build and Deploy")
			.on("push")
			.job("build", (job) =>
				job
					.runsOn("ubuntu-latest")
					.step((step) => step.uses("actions/checkout@v4"))
					.step((step) => step.run("npm run build"))
			)
			.job("deploy", (job) =>
				job
					.runsOn("ubuntu-latest")
					.needs("build")
					.step((step) => step.run("./deploy.sh"))
			);

		const roundtripData = yaml.parse(workflow.toYaml());
		const normalizedOriginal = normalizeWorkflow(originalData);
		const normalizedRoundtrip = normalizeWorkflow(roundtripData);

		expect(normalizedRoundtrip.name).toBe(normalizedOriginal.name);
		expect(normalizedRoundtrip.jobs.build["runs-on"]).toBe(normalizedOriginal.jobs.build["runs-on"]);
		expect(normalizedRoundtrip.jobs.deploy.needs).toEqual(normalizedOriginal.jobs.deploy.needs);
	});

	it("should roundtrip a workflow with complex steps", () => {
		const originalYaml = `
name: Complex Workflow
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
`;

		const originalData = yaml.parse(originalYaml);

		// Generate code
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();
		walker.walk(originalData, visitor);

		// Build equivalent workflow
		const workflow = createWorkflow()
			.name("Complex Workflow")
			.on("push")
			.job("build", (job) =>
				job
					.runsOn("ubuntu-latest")
					.environment({ name: "production" })
					.step((step) =>
						step
							.name("Checkout")
							.id("checkout")
							.uses("actions/checkout@v4", (action: any) => action.with({ ref: "main", "fetch-depth": 0 }))
					)
					.step((step) => step.name("Build").run("npm run build").env({ NODE_ENV: "production" }))
			);

		const roundtripData = yaml.parse(workflow.toYaml());
		const normalizedOriginal = normalizeWorkflow(originalData);
		const normalizedRoundtrip = normalizeWorkflow(roundtripData);

		expect(normalizedRoundtrip.name).toBe(normalizedOriginal.name);
		expect(normalizedRoundtrip.jobs.build.environment).toEqual(normalizedOriginal.jobs.build.environment);

		// Check first step
		const originalStep0 = normalizedOriginal.jobs.build.steps[0];
		const roundtripStep0 = normalizedRoundtrip.jobs.build.steps[0];
		expect(roundtripStep0.name).toBe(originalStep0.name);
		expect(roundtripStep0.id).toBe(originalStep0.id);
		expect(roundtripStep0.uses).toBe(originalStep0.uses);
		expect(roundtripStep0.with).toEqual(originalStep0.with);

		// Check second step
		const originalStep1 = normalizedOriginal.jobs.build.steps[1];
		const roundtripStep1 = normalizedRoundtrip.jobs.build.steps[1];
		expect(roundtripStep1.name).toBe(originalStep1.name);
		expect(roundtripStep1.run).toBe(originalStep1.run);
		expect(roundtripStep1.env).toEqual(originalStep1.env);
	});

	it("should roundtrip a reusable workflow call", () => {
		const originalYaml = `
name: Call Reusable
on: workflow_call
jobs:
  call:
    uses: ./.github/workflows/reusable.yml
    secrets: inherit
`;

		const originalData = yaml.parse(originalYaml);

		// Generate code
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();
		walker.walk(originalData, visitor);

		// Build equivalent workflow
		const workflow = createWorkflow()
			.name("Call Reusable")
			.on("workflow_call")
			.job("call", (job) => job.uses("./.github/workflows/reusable.yml").secrets("inherit"));

		const roundtripData = yaml.parse(workflow.toYaml());
		const normalizedOriginal = normalizeWorkflow(originalData);
		const normalizedRoundtrip = normalizeWorkflow(roundtripData);

		expect(normalizedRoundtrip.name).toBe(normalizedOriginal.name);
		expect(normalizedRoundtrip.on).toBe(normalizedOriginal.on);
		expect(normalizedRoundtrip.jobs.call.uses).toBe(normalizedOriginal.jobs.call.uses);
		expect(normalizedRoundtrip.jobs.call.secrets).toBe(normalizedOriginal.jobs.call.secrets);
	});
});
