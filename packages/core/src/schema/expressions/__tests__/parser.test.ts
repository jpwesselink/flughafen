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

		it("should handle hyphenated step IDs without false positives", () => {
			// Previously, "path" after the hyphen was incorrectly matched as a context
			const refs = parser.extractContextReferences("${{ steps.get-turbo-storage-path.outputs.storage_path }}");
			expect(refs).toHaveLength(1);
			expect(refs[0].name).toBe("steps");
			expect(refs[0].fullPath).toBe("steps.get-turbo-storage-path.outputs.storage_path");
		});

		it("should only match known GitHub Actions contexts", () => {
			// "foo.bar" should not be matched as a context
			const refs = parser.extractContextReferences("${{ foo.bar.baz }}");
			expect(refs).toHaveLength(0);
		});

		it("should match all valid GitHub Actions contexts", () => {
			const validContexts = [
				"github.event",
				"env.MY_VAR",
				"job.status",
				"runner.os",
				"steps.build.outputs.result",
				"needs.deploy.result",
				"strategy.job-index",
				"matrix.os",
				"secrets.TOKEN",
				"vars.CONFIG",
				"inputs.version",
			];

			for (const ctx of validContexts) {
				const refs = parser.extractContextReferences(`\${{ ${ctx} }}`);
				expect(refs.length).toBeGreaterThan(0);
			}
		});
	});

	describe("extractAllPotentialContexts", () => {
		it("should extract unknown contexts for validation", () => {
			const refs = parser.extractAllPotentialContexts("${{ invalid_context.property }}");
			expect(refs).toHaveLength(1);
			expect(refs[0].name).toBe("invalid_context");
		});

		it("should still handle hyphenated step IDs correctly", () => {
			// Even when extracting all potential contexts,
			// "path" after a hyphen should not be extracted as a separate context
			const refs = parser.extractAllPotentialContexts("${{ steps.get-turbo-storage-path.outputs.storage_path }}");
			expect(refs).toHaveLength(1);
			expect(refs[0].name).toBe("steps");
		});

		it("should extract both valid and invalid contexts", () => {
			const refs = parser.extractAllPotentialContexts("${{ github.actor == unknown.value }}");
			expect(refs).toHaveLength(2);
			expect(refs.map((r) => r.name)).toContain("github");
			expect(refs.map((r) => r.name)).toContain("unknown");
		});
	});
});
