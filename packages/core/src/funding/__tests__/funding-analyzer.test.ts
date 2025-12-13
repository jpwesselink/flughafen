import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FundingAnalyzer } from "../funding-analyzer";

describe("FundingAnalyzer", () => {
	const analyzer = new FundingAnalyzer();
	let tempDir: string;

	beforeAll(() => {
		tempDir = mkdtempSync(join(tmpdir(), "funding-analyzer-test-"));
	});

	afterAll(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should analyze simple FUNDING.yml", () => {
		const yamlContent = `github: octocat
patreon: creator
custom: https://example.com/donate`;

		const filePath = join(tempDir, "FUNDING.yml");
		writeFileSync(filePath, yamlContent);

		const analysis = analyzer.analyzeFunding(filePath);

		expect(analysis.config).toEqual({
			github: "octocat",
			patreon: "creator",
			custom: "https://example.com/donate",
		});
		expect(analysis.platforms).toEqual(["github", "patreon"]);
		expect(analysis.totalPlatforms).toBe(3);
		expect(analysis.hasGitHubSponsors).toBe(true);
		expect(analysis.hasCustomUrls).toBe(true);
	});

	it("should analyze FUNDING.yml with multiple GitHub sponsors", () => {
		const yamlContent = `github:
  - user1
  - user2
patreon: creator`;

		const filePath = join(tempDir, "FUNDING-multiple.yml");
		writeFileSync(filePath, yamlContent);

		const analysis = analyzer.analyzeFunding(filePath);

		expect(analysis.config).toEqual({
			github: ["user1", "user2"],
			patreon: "creator",
		});
		expect(analysis.platforms).toEqual(["github", "patreon"]);
		expect(analysis.totalPlatforms).toBe(2);
		expect(analysis.hasGitHubSponsors).toBe(true);
		expect(analysis.hasCustomUrls).toBe(false);
	});

	it("should handle invalid YAML", () => {
		const yamlContent = `github: octocat
patreon: creator
invalid: [unclosed bracket`;

		const filePath = join(tempDir, "FUNDING-invalid.yml");
		writeFileSync(filePath, yamlContent);

		expect(() => analyzer.analyzeFunding(filePath)).toThrow("Failed to parse FUNDING.yml");
	});

	it("should generate TypeScript code from config", () => {
		const config = {
			github: "octocat",
			patreon: "creator",
			custom: "https://example.com/donate",
		};

		const typescript = analyzer.generateTypeScript(config);

		expect(typescript).toContain("createFunding()");
		expect(typescript).toContain('.github("octocat")');
		expect(typescript).toContain('.patreon("creator")');
		expect(typescript).toContain('.custom("https://example.com/donate")');
		expect(typescript).toContain("export default");
	});

	it("should generate TypeScript code for multiple GitHub sponsors", () => {
		const config = {
			github: ["user1", "user2"],
		};

		const typescript = analyzer.generateTypeScript(config);

		expect(typescript).toContain("createFunding()");
		expect(typescript).toContain('.github(["user1", "user2"])');
		expect(typescript).toContain("export default");
	});

	it("should generate TypeScript code for all platforms", () => {
		const config = {
			github: "ghuser",
			patreon: "puser",
			open_collective: "ocuser",
			ko_fi: "kuser",
			tidelift: "npm/package",
			community_bridge: "project",
			liberapay: "luser",
			issuehunt: "ihuser",
			otechie: "ouser",
			lfx_crowdfunding: "lfxproject",
			polar: "polaruser",
			buy_me_a_coffee: "coffeeuser",
			thanks_dev: "thanksuser",
			custom: "https://custom.com",
		};

		const typescript = analyzer.generateTypeScript(config);

		expect(typescript).toContain('.github("ghuser")');
		expect(typescript).toContain('.patreon("puser")');
		expect(typescript).toContain('.openCollective("ocuser")');
		expect(typescript).toContain('.kofi("kuser")');
		expect(typescript).toContain('.tidelift("npm/package")');
		expect(typescript).toContain('.communityBridge("project")');
		expect(typescript).toContain('.liberapay("luser")');
		expect(typescript).toContain('.issuehunt("ihuser")');
		expect(typescript).toContain('.otechie("ouser")');
		expect(typescript).toContain('.lfxCrowdfunding("lfxproject")');
		expect(typescript).toContain('.polar("polaruser")');
		expect(typescript).toContain('.buyMeACoffee("coffeeuser")');
		expect(typescript).toContain('.thanksDev("thanksuser")');
		expect(typescript).toContain('.custom("https://custom.com")');
	});
});
