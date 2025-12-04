import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { CodeGenerator } from "../code-generator";

/**
 * Real-world workflow validation tests
 *
 * These tests verify that the schema-driven code generation system
 * can handle production GitHub Actions workflows from popular open-source projects.
 */
describe("Real-World Workflows - Schema-Driven", () => {
	const generator = new CodeGenerator();

	/**
	 * Helper to load workflow files from the real-world examples directory
	 */
	function loadWorkflow(projectName: string, workflowFile: string): any {
		const workflowPath = path.join(
			"/Users/jp/projects/flughafen/examples/real-world-examples",
			projectName,
			".github/workflows",
			workflowFile
		);
		const yamlContent = fs.readFileSync(workflowPath, "utf-8");
		return yaml.parse(yamlContent);
	}

	describe("Vitest Project Workflows", () => {
		it("should generate code for vitest ci.yml", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Verify basic structure
			expect(result.content).toMatch(/import { createWorkflow(, expr)? } from '@flughafen\/core'/);
			expect(result.content).toContain("export default createWorkflow()");
			expect(result.content).toContain('.name("CI")');

			// Verify complex features - looking for builder method calls
			expect(result.content).toMatch(/\.permissions\(/); // Empty permissions object
			expect(result.content).toMatch(/\.concurrency\(/); // Concurrency control
			expect(result.content).toContain('.job("lint"'); // Multiple jobs
			expect(result.content).toContain('.job("test"');
			expect(result.content).toContain('.job("changed"');

			// Verify matrix strategy - preserved as object in .strategy()
			expect(result.content).toContain(".strategy(");
			expect(result.content).toContain("matrix");

			// Verify job dependencies
			expect(result.content).toMatch(/\.needs\(/);

			// Verify complex step usage
			expect(result.content).toMatch(/\.uses\(/);
			expect(result.content).toMatch(/\.with\(/);

			console.log("\n=== Vitest CI.yml Generated Code (first 50 lines) ===");
			console.log(result.content.split("\n").slice(0, 50).join("\n"));
		});
	});

	describe("tRPC Project Workflows", () => {
		it("should generate code for trpc main.yml", () => {
			const workflowData = loadWorkflow("trpc", "main.yml");
			const result = generator.generateWorkflowFromData(workflowData, "main.ts");

			// Verify basic structure
			expect(result.content).toMatch(/import { createWorkflow(, expr)? } from '@flughafen\/core'/);
			expect(result.content).toContain("export default createWorkflow()");
			expect(result.content).toContain('.name("main")');

			// Verify on triggers with multiple events
			expect(result.content).toMatch(/\.on\(/);

			// Verify concurrency
			expect(result.content).toMatch(/\.concurrency\(/);

			// Verify jobs
			expect(result.content).toContain('.job("build"');
			expect(result.content).toContain('.job("test"');
			expect(result.content).toContain('.job("e2e"');

			// Verify conditional execution
			expect(result.content).toContain(".if(");

			// Verify services (postgres)
			expect(result.content).toMatch(/\.services\(/);

			// Verify environment variables at job level
			expect(result.content).toMatch(/\.env\(/);

			console.log("\n=== tRPC main.yml Generated Code (first 50 lines) ===");
			console.log(result.content.split("\n").slice(0, 50).join("\n"));
		});
	});

	describe("Code Quality Checks", () => {
		it("should generate syntactically valid TypeScript", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Basic syntax checks
			expect(result.content).toMatch(/^import /m); // Has imports
			expect(result.content).toMatch(/export default /m); // Has default export

			// Check for balanced parentheses in method chains
			const openParens = (result.content.match(/\(/g) || []).length;
			const closeParens = (result.content.match(/\)/g) || []).length;
			expect(openParens).toBe(closeParens);

			// Check for balanced braces
			const openBraces = (result.content.match(/\{/g) || []).length;
			const closeBraces = (result.content.match(/\}/g) || []).length;
			expect(openBraces).toBe(closeBraces);
		});

		it("should handle all property types without errors", () => {
			// This workflow has many different property types
			const workflowData = loadWorkflow("trpc", "main.yml");

			// Should not throw
			expect(() => {
				generator.generateWorkflowFromData(workflowData, "main.ts");
			}).not.toThrow();
		});
	});

	describe("Complex Features Support", () => {
		it("should handle matrix strategies", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Matrix should be preserved as object in .strategy()
			expect(result.content).toContain(".strategy(");
			expect(result.content).toContain("matrix");
		});

		it("should handle job conditionals", () => {
			const workflowData = loadWorkflow("trpc", "main.yml");
			const result = generator.generateWorkflowFromData(workflowData, "main.ts");

			// Job-level if conditions
			expect(result.content).toContain(".if(");
			expect(result.content).toContain("github.event_name");
		});

		it("should handle services configuration", () => {
			const workflowData = loadWorkflow("trpc", "main.yml");
			const result = generator.generateWorkflowFromData(workflowData, "main.ts");

			// Services like postgres
			expect(result.content).toMatch(/\.services\(/);
		});

		it("should handle local action references", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Local actions like ./.github/actions/setup-and-cache
			expect(result.content).toContain("./.github/actions/");
		});

		it("should handle concurrency configuration", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			expect(result.content).toMatch(/\.concurrency\(/);
		});

		it("should handle permissions configuration", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Empty permissions object
			expect(result.content).toMatch(/\.permissions\(/);
		});

		it("should handle job outputs", () => {
			const workflowData = loadWorkflow("vitest", "ci.yml");
			const result = generator.generateWorkflowFromData(workflowData, "ci.ts");

			// Job outputs
			expect(result.content).toMatch(/\.outputs\(/);
		});
	});

	describe("Workflow Diversity", () => {
		it("should handle multiple different workflows without errors", () => {
			const workflows = [
				{ project: "vitest", file: "ci.yml" },
				{ project: "vitest", file: "publish.yml" },
				{ project: "trpc", file: "main.yml" },
				{ project: "trpc", file: "lint.yml" },
			];

			const results = workflows
				.map(({ project, file }) => {
					try {
						const workflowData = loadWorkflow(project, file);
						return generator.generateWorkflowFromData(workflowData, file.replace(".yml", ".ts"));
					} catch (error) {
						// Some files might not exist, that's okay
						if ((error as any).code === "ENOENT") {
							return null;
						}
						throw error;
					}
				})
				.filter(Boolean);

			// Should have generated code for at least 2 workflows
			expect(results.length).toBeGreaterThanOrEqual(2);

			// All results should have basic structure
			results.forEach((result) => {
				expect(result?.content).toContain("createWorkflow()");
				expect(result?.content).toContain("export default");
			});
		});
	});
});
