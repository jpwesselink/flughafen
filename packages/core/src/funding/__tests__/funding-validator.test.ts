import { describe, expect, it } from "vitest";
import { FundingValidator } from "../funding-validator";
import type { FundingConfig } from "../types";

describe("FundingValidator", () => {
	const validator = new FundingValidator();

	it("should validate valid funding configuration", () => {
		const config: FundingConfig = {
			github: "octocat",
			patreon: "creator",
			custom: "https://example.com/donate",
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("should reject more than 4 GitHub sponsors", () => {
		const config: FundingConfig = {
			github: ["user1", "user2", "user3", "user4", "user5"],
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("GitHub sponsors list cannot have more than 4 usernames");
	});

	it("should reject more than 4 custom URLs", () => {
		const config: FundingConfig = {
			custom: ["https://url1.com", "https://url2.com", "https://url3.com", "https://url4.com", "https://url5.com"],
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Custom URLs list cannot have more than 4 URLs");
	});

	it("should validate tidelift format", () => {
		const config: FundingConfig = {
			tidelift: "npm/express",
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("should reject invalid tidelift format", () => {
		const config: FundingConfig = {
			tidelift: "invalid-format",
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Tidelift must be in format 'platform/package-name'");
	});

	it("should reject invalid tidelift platform", () => {
		const config: FundingConfig = {
			tidelift: "invalid/package",
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			"Invalid Tidelift platform: invalid. Must be one of: npm, pypi, rubygems, maven, nuget, packagist, pub, go"
		);
	});

	it("should warn about deprecated platforms", () => {
		const config: FundingConfig = {
			otechie: "username",
			community_bridge: "project",
		};

		const result = validator.validateConfig(config);

		expect(result.warnings).toContain("Otechie platform is less commonly used - verify it's still active");
		expect(result.warnings).toContain(
			"Community Bridge has transitioned to LFX - consider using lfx_crowdfunding instead"
		);
	});

	it("should warn about similar platforms", () => {
		const config: FundingConfig = {
			ko_fi: "user1",
			buy_me_a_coffee: "user2",
		};

		const result = validator.validateConfig(config);

		expect(result.warnings).toContain("Using both Ko-fi and Buy Me a Coffee - these serve similar purposes");
	});

	it("should reject invalid custom URLs", () => {
		const config: FundingConfig = {
			custom: "ftp://invalid-protocol.com",
		};

		const result = validator.validateConfig(config);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			"Invalid custom URL: ftp://invalid-protocol.com - must start with http:// or https://"
		);
	});
});
