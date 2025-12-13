import { readFileSync } from "node:fs";
import * as yaml from "yaml";
import type { FundingAnalysis, FundingConfig } from "./types";

/**
 * Analyzes GitHub FUNDING.yml files
 */
export class FundingAnalyzer {
	/**
	 * Parse and analyze a FUNDING.yml file
	 */
	analyzeFunding(filePath: string): FundingAnalysis {
		try {
			const content = readFileSync(filePath, "utf-8");
			const config = yaml.parse(content) as FundingConfig;

			if (!config || typeof config !== "object") {
				throw new Error("Invalid FUNDING.yml format");
			}

			// Extract platform names
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
		} catch (error) {
			throw new Error(
				`Failed to parse FUNDING.yml at ${filePath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Generate TypeScript code from funding config
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
