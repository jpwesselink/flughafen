import { describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { CodeGenerator } from "../code-generator";

describe("CodeGenerator - Schema-Driven", () => {
	const generator = new CodeGenerator();

	it("should generate workflow from raw YAML data using schema", () => {
		const workflowYaml = `
name: CI Workflow
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
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

		console.log("Generated code:");
		console.log(result.content);

		// Verify structure
		expect(result.content).toContain("import { createWorkflow } from '@flughafen/core'");
		expect(result.content).toContain("export default createWorkflow()");
		expect(result.content).toContain('.name("CI Workflow")');
		expect(result.content).toContain('.job("test", (job: JobBuilder) => job');
		expect(result.content).toContain('.runsOn("ubuntu-latest")');

		// Verify steps use builder pattern
		expect(result.content).toContain(".step((step: StepBuilder) => step");
		expect(result.content).toContain('.uses("actions/checkout@v4")');
		expect(result.content).toContain('.name("Run tests")');
		expect(result.content).toContain('.run("npm test")');

		// Verify metadata
		expect(result.path).toContain("ci.ts");
		expect(result.type).toBe("workflow");
	});

	it("should handle complex workflows with multiple jobs and steps", () => {
		const workflowYaml = `
name: Build and Deploy
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        run: ./deploy.sh
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "build-deploy.ts");

		console.log("Generated complex workflow:");
		console.log(result.content);

		// Verify build job
		expect(result.content).toContain('.job("build", (job: JobBuilder) => job');
		expect(result.content).toContain('.environment("staging")');
		expect(result.content).toContain(".env(");
		expect(result.content).toContain('"NODE_ENV": "production"');

		// Verify deploy job
		expect(result.content).toContain('.job("deploy", (job: JobBuilder) => job');
		// needs is a string in YAML, so schema-driven approach preserves the string form
		expect(result.content).toContain('.needs("build")');
		expect(result.content).toContain('.run("./deploy.sh")');
	});

	it("should handle reusable workflow calls", () => {
		const workflowYaml = `
name: Call Reusable
on: workflow_call
jobs:
  call:
    uses: ./.github/workflows/reusable.yml
    secrets: inherit
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "caller.ts");

		console.log("Generated reusable workflow call:");
		console.log(result.content);

		expect(result.content).toContain('.on("workflow_call")');
		expect(result.content).toContain('.uses("./.github/workflows/reusable.yml")');
		expect(result.content).toContain('.secrets("inherit")');
	});

	it("should import local actions as variables when importLocalActions is enabled", () => {
		const workflowYaml = `
name: CI with Local Actions
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-rust
      - uses: ./.github/actions/run-tests
        with:
          verbose: true
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "ci.ts", {
			importLocalActions: true,
		});

		console.log("Generated workflow with local action imports:");
		console.log(result.content);

		// Should import local actions
		expect(result.content).toContain('import setupRust from "./actions/setupRust"');
		expect(result.content).toContain('import runTests from "./actions/runTests"');

		// Should use variable reference for local actions
		expect(result.content).toContain(".uses(setupRust)");
		expect(result.content).toContain(".uses(runTests, (action: ActionStepBuilder) => action");

		// Regular actions should still use string paths
		expect(result.content).toContain('.uses("actions/checkout@v4")');
	});

	it("should keep local actions as string paths when importLocalActions is disabled", () => {
		const workflowYaml = `
name: CI with Local Actions
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-rust
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "ci.ts", {
			importLocalActions: false,
		});

		// Should NOT import local actions
		expect(result.content).not.toContain("import setupRust");

		// Should use string path
		expect(result.content).toContain('.uses("./.github/actions/setup-rust")');
	});

	it("should handle action names with multiple hyphens", () => {
		const workflowYaml = `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-build-env
`;

		const workflowData = yaml.parse(workflowYaml);
		const result = generator.generateWorkflowFromData(workflowData, "ci.ts", {
			importLocalActions: true,
		});

		// Should convert to camelCase
		expect(result.content).toContain('import setupBuildEnv from "./actions/setupBuildEnv"');
		expect(result.content).toContain(".uses(setupBuildEnv)");
	});
});
