import { describe, expect, it } from "vitest";
import { ExpressionConverter } from "../expression-converter";

describe("ExpressionConverter", () => {
	const converter = new ExpressionConverter();

	describe("hasExpression", () => {
		it("should detect expressions", () => {
			expect(converter.hasExpression("${{ github.ref }}")).toBe(true);
			expect(converter.hasExpression("no expression here")).toBe(false);
			expect(converter.hasExpression("text ${{ expr }} more text")).toBe(true);
		});
	});

	describe("convertToExpr", () => {
		it("should convert simple expressions", () => {
			const input = "${{ github.ref }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe(`expr("github.ref")`);
		});

		it("should convert complex expressions with operators", () => {
			const input = "${{ github.event.pull_request.number || github.ref }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe(`expr("github.event.pull_request.number || github.ref")`);
		});

		it("should convert expressions with comparisons", () => {
			const input = "${{ github.event_name == 'push' }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe(`expr("github.event_name == 'push'")`);
		});

		it("should handle strings without expressions", () => {
			const input = "just a string";
			const output = converter.convertToExpr(input);
			expect(output).toBe(`"just a string"`);
		});

		it("should convert mixed content to template literals", () => {
			const input = "Deploy to ${{ matrix.environment }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe('`Deploy to ${expr("matrix.environment")}`');
		});

		it("should handle multiple expressions in one string", () => {
			const input = "Build ${{ matrix.os }}-${{ matrix.node }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe('`Build ${expr("matrix.os")}-${expr("matrix.node")}`');
		});

		it("should handle expressions with spaces", () => {
			const input = "${{  github.ref  }}";
			const output = converter.convertToExpr(input);
			expect(output).toBe(`expr("github.ref")`);
		});
	});

	describe("convertObject", () => {
		it("should convert objects with expression values", () => {
			const input = {
				group: "${{ github.workflow }}-${{ github.ref }}",
				"cancel-in-progress": true,
			};

			const output = converter.convertObject(input);
			expect(output).toContain("expr(");
			expect(output).toContain('"cancel-in-progress": true');
		});

		it("should convert nested objects", () => {
			const input = {
				with: {
					"node-version": "${{ matrix.node-version }}",
					cache: "pnpm",
				},
			};

			const output = converter.convertObject(input);
			expect(output).toContain("expr(");
			expect(output).toContain('"cache": "pnpm"');
		});

		it("should handle arrays with expressions", () => {
			const input = {
				branches: ["main", "${{ github.ref }}"],
			};

			const output = converter.convertObject(input);
			expect(output).toContain('"main"');
			expect(output).toContain("expr(");
		});
	});

	describe("Real-world examples", () => {
		it("should convert concurrency configuration", () => {
			const input = {
				group: "ci-${{ github.event.pull_request.number || github.ref }}",
				"cancel-in-progress": true,
			};

			const output = converter.convertObject(input);

			console.log("Concurrency output:");
			console.log(output);

			expect(output).toContain("expr(");
			expect(output).toContain("github.event.pull_request.number || github.ref");
		});

		it("should convert matrix strategy with expressions", () => {
			const input = {
				name: "Test ${{ matrix.os }}",
				"node-version": "${{ matrix.node-version }}",
			};

			const output = converter.convertObject(input);

			console.log("Matrix output:");
			console.log(output);

			expect(output).toContain("expr(");
		});
	});
});
