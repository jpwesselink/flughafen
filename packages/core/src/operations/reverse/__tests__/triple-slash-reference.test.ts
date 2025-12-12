import { describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { TypeScriptCodegenVisitor } from "../schema-codegen-visitor";
import { SchemaWalker } from "../schema-walker";

describe("Triple-slash reference generation", () => {
	it("should generate triple-slash reference directive in workflows", () => {
		const testYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
`;

		const data = yaml.parse(testYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);
		const code = visitor.getGeneratedCode();

		console.log("=== Generated code (first 5 lines) ===");
		console.log(code.split("\n").slice(0, 5).join("\n"));
		console.log("=== End of preview ===");

		// Check that the generated TypeScript includes the triple-slash reference
		expect(code).toMatch(/^\/\/\/ <reference path="\.\.\/\.\.\/flughafen-actions\.d\.ts" \/>/);
	});

	it("should place triple-slash reference at the very top of the file", () => {
		const testYaml = `
name: Simple Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

		const data = yaml.parse(testYaml);
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor();

		walker.walk(data, visitor);
		const code = visitor.getGeneratedCode();
		const lines = code.split("\n");

		// First line should be the triple-slash reference
		expect(lines[0]).toBe('/// <reference path="../../flughafen-actions.d.ts" />');

		// Second line should be empty
		expect(lines[1]).toBe("");

		// Third line should start imports
		expect(lines[2]).toMatch(/^import /);
	});
});
