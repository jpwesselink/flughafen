import { describe, expect, it } from "vitest";
import { ExpressionParser } from "../parser";

describe("ExpressionParser", () => {
	const parser = new ExpressionParser();

	describe("parseExpression", () => {
		it("should parse simple context access", () => {
			const result = parser.parseExpression("${{ github.event.number }}");

			expect(result.original).toBe("${{ github.event.number }}");
			expect(result.cleaned).toBe("github.event.number");
			expect(result.contexts).toHaveLength(1);
			expect(result.contexts[0]).toEqual({
				name: "github",
				path: ["event", "number"],
				fullPath: "github.event.number",
			});
		});

		it("should extract multiple contexts", () => {
			const result = parser.parseExpression('${{ needs.build.result == "success" && github.actor == "octocat" }}');

			expect(result.contexts).toHaveLength(2);
			expect(result.contexts.map((c) => c.name)).toContain("needs");
			expect(result.contexts.map((c) => c.name)).toContain("github");
		});

		it("should extract function calls", () => {
			const result = parser.parseExpression('${{ contains(github.event.head_commit.message, "[skip ci]") }}');

			expect(result.functions).toHaveLength(1);
			expect(result.functions[0].name).toBe("contains");
		});

		it("should extract operators", () => {
			const result = parser.parseExpression('${{ github.event.number > 100 && matrix.os == "ubuntu-latest" }}');

			expect(result.operators).toContain(">");
			expect(result.operators).toContain("&&");
			expect(result.operators).toContain("==");
		});

		it("should extract literals", () => {
			const result = parser.parseExpression('${{ "hello world" == env.MESSAGE && 42 > 0 && true }}');

			expect(result.literals).toHaveLength(4);
			expect(result.literals.map((l) => l.value)).toContain("hello world");
			expect(result.literals.map((l) => l.value)).toContain(42);
			expect(result.literals.map((l) => l.value)).toContain(0);
			expect(result.literals.map((l) => l.value)).toContain(true);
		});
	});

	describe("extractContextReferences", () => {
		it("should extract simple context references", () => {
			const refs = parser.extractContextReferences("${{ github.event.number }}");
			expect(refs).toHaveLength(1);
			expect(refs[0].name).toBe("github");
		});

		it("should extract multiple context references", () => {
			const refs = parser.extractContextReferences(
				'${{ needs.build.result == "success" && github.event.action == "published" }}'
			);
			expect(refs).toHaveLength(2);
			expect(refs.map((r) => r.name)).toContain("needs");
			expect(refs.map((r) => r.name)).toContain("github");
		});

		it("should extract references from function arguments", () => {
			const refs = parser.extractContextReferences(
				"${{ contains(github.event.head_commit.message, env.SKIP_MESSAGE) }}"
			);
			expect(refs).toHaveLength(2);
			expect(refs.map((r) => r.name)).toContain("github");
			expect(refs.map((r) => r.name)).toContain("env");
		});
	});
});
