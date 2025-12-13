import { describe, expect, it } from "vitest";
import { createFunding, funding } from "../funding-builder";

describe("FundingBuilder", () => {
	it("should build a simple GitHub sponsors configuration", () => {
		const config = funding.github("octocat").build();

		expect(config).toEqual({
			github: "octocat",
		});
	});

	it("should build configuration with multiple GitHub sponsors", () => {
		const config = funding.github(["user1", "user2", "user3"]).build();

		expect(config).toEqual({
			github: ["user1", "user2", "user3"],
		});
	});

	it("should throw error for more than 4 GitHub sponsors", () => {
		expect(() => {
			funding.github(["user1", "user2", "user3", "user4", "user5"]);
		}).toThrow("GitHub sponsors cannot have more than 4 usernames");
	});

	it("should build configuration with multiple platforms", () => {
		const config = funding
			.github("octocat")
			.patreon("creator")
			.kofi("supporter")
			.tidelift("npm/my-package")
			.custom("https://example.com/donate")
			.build();

		expect(config).toEqual({
			github: "octocat",
			patreon: "creator",
			ko_fi: "supporter",
			tidelift: "npm/my-package",
			custom: "https://example.com/donate",
		});
	});

	it("should build configuration with multiple custom URLs", () => {
		const config = funding.custom(["https://example.com", "https://donate.example.org"]).build();

		expect(config).toEqual({
			custom: ["https://example.com", "https://donate.example.org"],
		});
	});

	it("should throw error for more than 4 custom URLs", () => {
		expect(() => {
			funding.custom([
				"https://url1.com",
				"https://url2.com",
				"https://url3.com",
				"https://url4.com",
				"https://url5.com",
			]);
		}).toThrow("Custom URLs cannot have more than 4 entries");
	});

	it("should generate correct YAML output", () => {
		const result = funding.github(["user1", "user2"]).patreon("creator").custom("https://example.com").synth();

		expect(result.path).toBe(".github/FUNDING.yml");
		expect(result.content).toContain("github:");
		expect(result.content).toContain("- user1");
		expect(result.content).toContain("- user2");
		expect(result.content).toContain("patreon: creator");
		expect(result.content).toContain("custom: https://example.com");
	});

	it("should reset between builds", () => {
		// First build
		const config1 = funding.github("user1").build();
		expect(config1).toEqual({ github: "user1" });

		// Second build should not have the previous data
		const config2 = funding.patreon("creator").build();
		expect(config2).toEqual({ patreon: "creator" });
		expect(config2.github).toBeUndefined();
	});

	it("should support all funding platforms", () => {
		const config = funding
			.github("ghuser")
			.patreon("puser")
			.openCollective("ocuser")
			.kofi("kuser")
			.tidelift("npm/package")
			.communityBridge("project")
			.liberapay("luser")
			.issuehunt("ihuser")
			.otechie("ouser")
			.lfxCrowdfunding("lfxproject")
			.polar("polaruser")
			.buyMeACoffee("coffeeuser")
			.thanksDev("thanksuser")
			.custom("https://custom.com")
			.build();

		expect(config).toEqual({
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
		});
	});

	it("should create new funding builder with createFunding()", () => {
		const config = createFunding().github("octocat").patreon("creator").build();

		expect(config).toEqual({
			github: "octocat",
			patreon: "creator",
		});
	});

	it("should create independent funding builders", () => {
		const builder1 = createFunding().github("user1");
		const builder2 = createFunding().patreon("creator");

		const config1 = builder1.build();
		const config2 = builder2.build();

		expect(config1).toEqual({ github: "user1" });
		expect(config2).toEqual({ patreon: "creator" });
		expect(config1.patreon).toBeUndefined();
		expect(config2.github).toBeUndefined();
	});
});
