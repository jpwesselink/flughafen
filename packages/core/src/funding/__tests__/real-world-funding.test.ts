import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FundingAnalyzer } from "../funding-analyzer";
import { FundingValidator } from "../funding-validator";

describe("Real-World FUNDING.yml Examples", () => {
	const analyzer = new FundingAnalyzer();
	const validator = new FundingValidator();

	it("should analyze tRPC funding configuration", () => {
		const filePath = join(process.cwd(), "../../examples/real-world-examples/trpc/.github/FUNDING.yml");

		const analysis = analyzer.analyzeFunding(filePath);

		// Validate the parsed configuration
		expect(analysis.config).toEqual({
			github: "trpc",
			open_collective: "trpc",
		});

		// Check analysis results
		expect(analysis.platforms).toEqual(["github", "open_collective"]);
		expect(analysis.totalPlatforms).toBe(2);
		expect(analysis.hasGitHubSponsors).toBe(true);
		expect(analysis.hasCustomUrls).toBe(false);

		// Validate against our schema
		const validation = validator.validateConfig(analysis.config);
		expect(validation.valid).toBe(true);
		expect(validation.errors).toEqual([]);
	});

	it("should analyze Vitest funding configuration", () => {
		const filePath = join(process.cwd(), "../../examples/real-world-examples/vitest/.github/FUNDING.yml");

		const analysis = analyzer.analyzeFunding(filePath);

		// Validate the parsed configuration
		expect(analysis.config).toEqual({
			github: ["vitest-dev", "sheremet-va", "antfu", "patak-dev"],
			open_collective: "vitest",
		});

		// Check analysis results
		expect(analysis.platforms).toEqual(["github", "open_collective"]);
		expect(analysis.totalPlatforms).toBe(2);
		expect(analysis.hasGitHubSponsors).toBe(true);
		expect(analysis.hasCustomUrls).toBe(false);

		// Validate against our schema
		const validation = validator.validateConfig(analysis.config);
		expect(validation.valid).toBe(true);
		expect(validation.errors).toEqual([]);
	});

	it("should generate TypeScript from tRPC funding", () => {
		const filePath = join(process.cwd(), "../../examples/real-world-examples/trpc/.github/FUNDING.yml");

		const analysis = analyzer.analyzeFunding(filePath);
		const typescript = analyzer.generateTypeScript(analysis.config);

		// Check generated TypeScript
		expect(typescript).toContain('import { createFunding } from "@flughafen/core";');
		expect(typescript).toContain("export default createFunding()");
		expect(typescript).toContain('.github("trpc")');
		expect(typescript).toContain('.openCollective("trpc")');
		expect(typescript).toContain(".build();");
	});

	it("should generate TypeScript from Vitest funding", () => {
		const filePath = join(process.cwd(), "../../examples/real-world-examples/vitest/.github/FUNDING.yml");

		const analysis = analyzer.analyzeFunding(filePath);
		const typescript = analyzer.generateTypeScript(analysis.config);

		// Check generated TypeScript
		expect(typescript).toContain('import { createFunding } from "@flughafen/core";');
		expect(typescript).toContain("export default createFunding()");
		expect(typescript).toContain('.github(["vitest-dev", "sheremet-va", "antfu", "patak-dev"])');
		expect(typescript).toContain('.openCollective("vitest")');
		expect(typescript).toContain(".build();");
	});

	it("should validate all real-world examples are compliant", () => {
		const examples = [
			"../../examples/real-world-examples/trpc/.github/FUNDING.yml",
			"../../examples/real-world-examples/vitest/.github/FUNDING.yml",
		];

		for (const examplePath of examples) {
			const filePath = join(process.cwd(), examplePath);

			// Should parse without errors
			expect(() => analyzer.analyzeFunding(filePath)).not.toThrow();

			const analysis = analyzer.analyzeFunding(filePath);
			const validation = validator.validateConfig(analysis.config);

			// Should pass validation
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);
		}
	});
});
