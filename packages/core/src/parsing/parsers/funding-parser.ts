import type { Document } from "yaml";
import type { FundingConfig } from "../../funding/types";
import { BaseYamlParser } from "../base-parser";

/**
 * Analysis result for FUNDING.yml files
 */
export interface FundingAnalysis {
	path: string;
	config: FundingConfig;
	platforms: string[];
	totalPlatforms: number;
	hasGitHubSponsors: boolean;
	hasCustomUrls: boolean;
}

/**
 * Parser for GitHub FUNDING.yml files
 */
export class FundingParser extends BaseYamlParser<FundingConfig, FundingAnalysis> {
	readonly name = "funding";

	/**
	 * Detect if this is a FUNDING.yml file
	 */
	detectFileType(filePath: string): boolean {
		const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");
		return (
			normalizedPath.includes("funding.yml") ||
			normalizedPath.includes("funding.yaml") ||
			normalizedPath.endsWith("/.github/funding.yml") ||
			normalizedPath.endsWith("/.github/funding.yaml")
		);
	}

	/**
	 * Analyze FUNDING.yml document
	 */
	analyze(doc: Document, filePath: string): FundingAnalysis {
		// Validate document structure
		if (!doc.contents || typeof doc.contents !== "object" || !("items" in doc.contents)) {
			throw new Error("Invalid FUNDING.yml format - expected mapping");
		}

		// Convert to plain object
		const config = this.toJS<FundingConfig>(doc);

		if (!config || typeof config !== "object") {
			throw new Error("Invalid FUNDING.yml format");
		}

		// Extract platform information
		const platforms: string[] = [];
		for (const key of Object.keys(config)) {
			if (key !== "custom" && config[key as keyof FundingConfig]) {
				platforms.push(key);
			}
		}

		return {
			path: filePath,
			config,
			platforms,
			totalPlatforms: platforms.length + (config.custom ? 1 : 0),
			hasGitHubSponsors: !!config.github,
			hasCustomUrls: !!config.custom,
		};
	}

	/**
	 * Generate TypeScript code from funding configuration
	 */
	generateTypeScript(config: FundingConfig): string {
		const lines: string[] = [];
		lines.push('import { createFunding } from "@flughafen/core";');
		lines.push("");
		lines.push("export default createFunding()");

		// Add GitHub sponsors
		if (config.github) {
			if (Array.isArray(config.github)) {
				const githubArray = JSON.stringify(config.github).replace(/,/g, ", ");
				lines.push(`\t.github(${githubArray})`);
			} else {
				lines.push(`\t.github("${config.github}")`);
			}
		}

		// Add other platforms
		const platformMapping: Partial<Record<keyof FundingConfig, string>> = {
			patreon: "patreon",
			open_collective: "openCollective",
			ko_fi: "kofi",
			tidelift: "tidelift",
			community_bridge: "communityBridge",
			liberapay: "liberapay",
			issuehunt: "issuehunt",
			otechie: "otechie",
			lfx_crowdfunding: "lfxCrowdfunding",
			polar: "polar",
			buy_me_a_coffee: "buyMeACoffee",
			thanks_dev: "thanksDev",
		};

		for (const [platform, methodName] of Object.entries(platformMapping)) {
			const key = platform as keyof FundingConfig;
			if (config[key] && methodName) {
				lines.push(`\t.${methodName}("${config[key]}")`);
			}
		}

		// Add custom URLs
		if (config.custom) {
			if (Array.isArray(config.custom)) {
				lines.push(`\t.custom(${JSON.stringify(config.custom)})`);
			} else {
				lines.push(`\t.custom("${config.custom}")`);
			}
		}

		lines.push("\t.build();");
		return lines.join("\n");
	}
}
