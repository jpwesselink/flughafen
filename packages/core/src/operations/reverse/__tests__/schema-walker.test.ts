import { describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { TypeScriptCodegenVisitor } from "../schema-codegen-visitor.js";
import { SchemaWalker } from "../schema-walker.js";

describe("SchemaWalker", () => {
	it("should walk a simple workflow using schema", () => {
		const workflowYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

		const data = yaml.parse(workflowYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);

		const code = visitor.getGeneratedCode();
		console.log("Generated code:");
		console.log(code);

		expect(code).toContain("createWorkflow()");
		expect(code).toContain('.job("test"');
	});

	it("should handle secrets: 'inherit' correctly using schema", () => {
		const workflowYaml = `
name: Test
on: workflow_call
jobs:
  test:
    uses: ./.github/workflows/reusable.yml
    secrets: inherit
`;

		const data = yaml.parse(workflowYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);

		const code = visitor.getGeneratedCode();
		console.log("Generated code with secrets:");
		console.log(code);

		// Should generate .secrets("inherit"), not split into characters!
		expect(code).toContain('.secrets("inherit")');
		expect(code).not.toContain('"0": "i"');
	});

	it("should handle environment string shorthand using schema", () => {
		const workflowYaml = `
name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "test"
`;

		const data = yaml.parse(workflowYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);

		const code = visitor.getGeneratedCode();
		console.log("Generated code with environment:");
		console.log(code);

		// Schema should detect environment can be string OR object
		expect(code).toContain('.environment("production")');
	});

	it("should generate complex steps with builder pattern", () => {
		const workflowYaml = `
name: Complex Steps
on: push
jobs:
  build:
    runs-on: ubuntu-latest
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
        continue-on-error: true
`;

		const data = yaml.parse(workflowYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);

		const code = visitor.getGeneratedCode();
		console.log("Generated code with complex steps:");
		console.log(code);

		// Verify uses step with properties
		expect(code).toContain('.name("Checkout")');
		expect(code).toContain('.id("checkout")');
		expect(code).toContain('.uses("actions/checkout@v4"');
		expect(code).toContain('ref: "main"');
		expect(code).toContain("fetchDepth: 0");

		// Verify run step with properties
		expect(code).toContain('.name("Build")');
		expect(code).toContain('.run("npm run build")');
		expect(code).toContain(".env(");
		expect(code).toContain('NODE_ENV: "production"');
		expect(code).toContain(".continueOnError(true)");

		// Should use .step() not .steps([...])
		expect(code).toContain(".step(step => step");
		expect(code).not.toContain(".steps([");
	});
});
