import { describe, expect, it } from "vitest";
import { YamlSyntaxValidator } from "../yaml-syntax-validator.js";

describe("YamlSyntaxValidator", () => {
	const validator = new YamlSyntaxValidator();

	describe("validateSyntax", () => {
		it("should pass valid YAML", () => {
			const validYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
			const result = validator.validateSyntax(validYaml);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect YAML syntax errors", () => {
			const invalidYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      steps:  # Wrong indentation
      - uses: actions/checkout@v4
`;
			const result = validator.validateSyntax(invalidYaml);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);

			const error = result.errors[0];
			expect(error.line).toBeGreaterThan(0);
			expect(error.column).toBeGreaterThan(0);
			expect(error.message).toContain("mappings");
			expect(error.snippet).toContain("runs-on");
		});

		it("should handle malformed YAML structure", () => {
			const malformedYaml = `
name: Test
on: [
  push
  # Missing closing bracket
`;
			const result = validator.validateSyntax(malformedYaml);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toBeTruthy();
		});

		it("should handle completely invalid YAML", () => {
			const invalidYaml = `
name: test
value: [unclosed array
another: line
`;
			const result = validator.validateSyntax(invalidYaml);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
		});

		it("should provide code snippets for errors", () => {
			const yamlWithError = `
line1: value1
line2: value2
line3: invalid: yaml: content:
line4: value4
line5: value5
`;
			const result = validator.validateSyntax(yamlWithError);

			expect(result.valid).toBe(false);
			expect(result.errors[0].snippet).toContain("line3");
			expect(result.errors[0].snippet).toContain(">");
			expect(result.errors[0].snippet).toContain("^");
		});

		it("should handle empty content", () => {
			const result = validator.validateSyntax("");

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should handle whitespace-only content", () => {
			const result = validator.validateSyntax("   \n  \t  \n  ");

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
