import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as yaml from "yaml";
import { FundingAnalyzer } from "../funding-analyzer";
import { createFunding } from "../funding-builder";

/**
 * Roundtrip validation tests for the funding feature
 *
 * These tests verify the complete cycle:
 * 1. FUNDING.yml → FundingAnalyzer.analyzeFunding()
 * 2. FundingConfig → FundingAnalyzer.generateTypeScript()
 * 3. TypeScript code → createFunding() builder execution (simulated)
 * 4. FundingBuilder → .synth() YAML output
 * 5. Original FUNDING.yml ≈ Roundtrip FUNDING.yml (semantically equivalent)
 */
describe("Funding Roundtrip Validation", () => {
	const analyzer = new FundingAnalyzer();
	let tempDir: string;

	beforeAll(() => {
		tempDir = mkdtempSync(join(tmpdir(), "funding-roundtrip-test-"));
	});

	afterAll(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	/**
	 * Helper to normalize funding YAML for comparison
	 */
	function normalizeFundingYaml(yamlContent: string): any {
		const parsed = yaml.parse(yamlContent);

		// Sort keys for consistent comparison
		const sortKeys = (obj: any): any => {
			if (typeof obj !== "object" || obj === null) return obj;
			if (Array.isArray(obj)) return obj.map(sortKeys);

			const sorted: any = {};
			Object.keys(obj)
				.sort()
				.forEach((key) => {
					sorted[key] = sortKeys(obj[key]);
				});
			return sorted;
		};

		return sortKeys(parsed);
	}

	/**
	 * Simulate executing generated TypeScript code by parsing it and building equivalent funding config
	 */
	function simulateTypeScriptExecution(generatedCode: string): any {
		// Parse the generated TypeScript to extract the builder calls
		// This is a simplified simulation - in practice, the TS would be executed

		let builder = createFunding();

		// Extract github() calls
		const githubMatch = generatedCode.match(/\.github\((.*?)\)/);
		if (githubMatch) {
			const arg = githubMatch[1];
			if (arg.startsWith("[")) {
				// Array of usernames
				const usernames = JSON.parse(arg);
				builder = builder.github(usernames);
			} else {
				// Single username (remove quotes)
				const username = arg.replace(/"/g, "");
				builder = builder.github(username);
			}
		}

		// Extract other platform calls
		const platforms = [
			"patreon",
			"openCollective",
			"kofi",
			"tidelift",
			"communityBridge",
			"liberapay",
			"issuehunt",
			"otechie",
			"lfxCrowdfunding",
			"polar",
			"buyMeACoffee",
			"thanksDev",
		];

		for (const platform of platforms) {
			const regex = new RegExp(`\\.${platform}\\("(.*?)"\\)`);
			const match = generatedCode.match(regex);
			if (match) {
				const value = match[1];
				(builder as any)[platform](value);
			}
		}

		// Extract custom() calls
		const customMatch = generatedCode.match(/\.custom\((.*?)\)/);
		if (customMatch) {
			const arg = customMatch[1];
			if (arg.startsWith("[")) {
				// Array of URLs
				const urls = JSON.parse(arg);
				builder = builder.custom(urls);
			} else {
				// Single URL (remove quotes)
				const url = arg.replace(/"/g, "");
				builder = builder.custom(url);
			}
		}

		return builder.synth();
	}

	it("should roundtrip simple FUNDING.yml with single GitHub sponsor", () => {
		const originalYaml = `github: octocat
patreon: creator
custom: https://example.com/donate`;

		// Step 1: Parse original YAML
		const filePath = join(tempDir, "simple-funding.yml");
		writeFileSync(filePath, originalYaml);

		// Step 2: Analyze funding
		const analysis = analyzer.analyzeFunding(filePath);

		// Step 3: Generate TypeScript
		const generatedCode = analyzer.generateTypeScript(analysis.config);

		console.log("Generated TypeScript:");
		console.log(generatedCode);

		// Step 4: Simulate executing the generated TypeScript
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		console.log("Roundtrip YAML:");
		console.log(roundtripResult.content);

		// Step 5: Compare normalized YAML
		const normalizedOriginal = normalizeFundingYaml(originalYaml);
		const normalizedRoundtrip = normalizeFundingYaml(roundtripResult.content);

		expect(normalizedRoundtrip).toEqual(normalizedOriginal);
		expect(roundtripResult.path).toBe(".github/FUNDING.yml");
	});

	it("should roundtrip FUNDING.yml with multiple GitHub sponsors", () => {
		const originalYaml = `github:
  - user1
  - user2
  - user3
open_collective: project
ko_fi: supporter`;

		const filePath = join(tempDir, "multi-github-funding.yml");
		writeFileSync(filePath, originalYaml);

		const analysis = analyzer.analyzeFunding(filePath);
		const generatedCode = analyzer.generateTypeScript(analysis.config);
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		const normalizedOriginal = normalizeFundingYaml(originalYaml);
		const normalizedRoundtrip = normalizeFundingYaml(roundtripResult.content);

		expect(normalizedRoundtrip).toEqual(normalizedOriginal);
	});

	it("should roundtrip FUNDING.yml with multiple custom URLs", () => {
		const originalYaml = `github: sponsor
custom:
  - https://example.com/donate
  - https://donate.example.org`;

		const filePath = join(tempDir, "multi-custom-funding.yml");
		writeFileSync(filePath, originalYaml);

		const analysis = analyzer.analyzeFunding(filePath);
		const generatedCode = analyzer.generateTypeScript(analysis.config);
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		const normalizedOriginal = normalizeFundingYaml(originalYaml);
		const normalizedRoundtrip = normalizeFundingYaml(roundtripResult.content);

		expect(normalizedRoundtrip).toEqual(normalizedOriginal);
	});

	it("should roundtrip complex FUNDING.yml with all platforms", () => {
		const originalYaml = `github: ghuser
patreon: puser
open_collective: ocuser
ko_fi: kuser
tidelift: npm/package
liberapay: luser
polar: polaruser
buy_me_a_coffee: coffeeuser
custom: https://custom.com/donate`;

		const filePath = join(tempDir, "complex-funding.yml");
		writeFileSync(filePath, originalYaml);

		const analysis = analyzer.analyzeFunding(filePath);
		const generatedCode = analyzer.generateTypeScript(analysis.config);
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		const normalizedOriginal = normalizeFundingYaml(originalYaml);
		const normalizedRoundtrip = normalizeFundingYaml(roundtripResult.content);

		expect(normalizedRoundtrip).toEqual(normalizedOriginal);
	});

	it("should roundtrip real-world tRPC funding configuration", () => {
		const trpcFundingPath = join(process.cwd(), "../../examples/real-world-examples/trpc/.github/FUNDING.yml");

		// Step 1: Analyze real tRPC funding
		const analysis = analyzer.analyzeFunding(trpcFundingPath);

		// Step 2: Generate TypeScript
		const generatedCode = analyzer.generateTypeScript(analysis.config);

		// Step 3: Simulate execution and roundtrip
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		// Step 4: Compare with original tRPC config
		expect(analysis.config.github).toBe("trpc");
		expect(analysis.config.open_collective).toBe("trpc");

		// Verify roundtrip maintains the same structure
		const roundtripConfig = yaml.parse(roundtripResult.content);
		expect(roundtripConfig.github).toBe("trpc");
		expect(roundtripConfig.open_collective).toBe("trpc");
	});

	it("should roundtrip real-world Vitest funding configuration", () => {
		const vitestFundingPath = join(process.cwd(), "../../examples/real-world-examples/vitest/.github/FUNDING.yml");

		// Step 1: Analyze real Vitest funding
		const analysis = analyzer.analyzeFunding(vitestFundingPath);

		// Step 2: Generate TypeScript
		const generatedCode = analyzer.generateTypeScript(analysis.config);

		// Step 3: Simulate execution and roundtrip
		const roundtripResult = simulateTypeScriptExecution(generatedCode);

		// Step 4: Compare with original Vitest config
		expect(analysis.config.github).toEqual(["vitest-dev", "sheremet-va", "antfu", "patak-dev"]);
		expect(analysis.config.open_collective).toBe("vitest");

		// Verify roundtrip maintains the same structure
		const roundtripConfig = yaml.parse(roundtripResult.content);
		expect(roundtripConfig.github).toEqual(["vitest-dev", "sheremet-va", "antfu", "patak-dev"]);
		expect(roundtripConfig.open_collective).toBe("vitest");
	});

	it("should generate semantically equivalent YAML through complete roundtrip", () => {
		// Test various edge cases in a single comprehensive test
		const testCases = [
			{
				name: "minimal config",
				yaml: "github: minimal",
			},
			{
				name: "single platform each",
				yaml: `github: user
patreon: creator
ko_fi: supporter`,
			},
			{
				name: "arrays and singles mixed",
				yaml: `github:
  - user1
  - user2
patreon: creator
custom:
  - https://donate1.com
  - https://donate2.com`,
			},
		];

		for (const testCase of testCases) {
			console.log(`\nTesting roundtrip for: ${testCase.name}`);

			const filePath = join(tempDir, `roundtrip-${testCase.name.replace(/\s+/g, "-")}.yml`);
			writeFileSync(filePath, testCase.yaml);

			const analysis = analyzer.analyzeFunding(filePath);
			const generatedCode = analyzer.generateTypeScript(analysis.config);
			const roundtripResult = simulateTypeScriptExecution(generatedCode);

			// The key test: semantic equivalence after normalization
			const normalizedOriginal = normalizeFundingYaml(testCase.yaml);
			const normalizedRoundtrip = normalizeFundingYaml(roundtripResult.content);

			expect(normalizedRoundtrip).toEqual(normalizedOriginal);
		}
	});
});
