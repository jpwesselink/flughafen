import type { JSONSchema7 } from "json-schema";
import type { FileContext } from "../classification/types";
import { BaseHandler } from "./base-handler";

/**
 * Funding configuration interface
 */
interface FundingConfig {
	github?: string | string[];
	patreon?: string;
	ko_fi?: string;
	tidelift?: string;
	community_bridge?: string;
	liberapay?: string;
	issuehunt?: string;
	otechie?: string;
	lfx_crowdfunding?: string;
	custom?: string | string[];
}

/**
 * Handler for GitHub Sponsors funding configuration
 * Generates TypeScript interfaces and helper functions for FUNDING.yml files
 */
export class FundingHandler extends BaseHandler {
	schema: JSONSchema7 = {
		type: "object",
		properties: {
			github: {
				description: "GitHub Sponsors username(s)",
				oneOf: [
					{ type: "string" },
					{
						type: "array",
						items: { type: "string" },
						maxItems: 4,
					},
				],
			},
			patreon: {
				type: "string",
				description: "Patreon username",
			},
			ko_fi: {
				type: "string",
				description: "Ko-fi username",
			},
			tidelift: {
				type: "string",
				description: "Tidelift package name",
			},
			community_bridge: {
				type: "string",
				description: "Community Bridge project name",
			},
			liberapay: {
				type: "string",
				description: "Liberapay username",
			},
			issuehunt: {
				type: "string",
				description: "IssueHunt username",
			},
			otechie: {
				type: "string",
				description: "Otechie username",
			},
			lfx_crowdfunding: {
				type: "string",
				description: "LFX Crowdfunding project name",
			},
			custom: {
				description: "Custom funding URL(s)",
				oneOf: [
					{ type: "string", format: "uri" },
					{
						type: "array",
						items: { type: "string", format: "uri" },
						maxItems: 4,
					},
				],
			},
		},
		additionalProperties: false,
	};

	emit(content: unknown, context: FileContext): string {
		const funding = content as FundingConfig;

		// Generate imports
		const imports = this.generateImports([]);

		// Generate JSDoc
		const jsdoc = this.generateJSDoc(`Generated from ${context.path}`, {
			generated: new Date().toISOString(),
			source: context.path,
		});

		// Generate TypeScript interface
		const interfaceCode = this.generateFundingInterface();

		// Generate funding data export
		const dataCode = this.generateFundingData(funding);

		// Generate helper functions
		const helpersCode = this.generateFundingHelpers(funding);

		return [jsdoc, imports, interfaceCode, "", dataCode, "", helpersCode].join("\n");
	}

	/**
	 * Generate TypeScript interface for funding configuration
	 */
	private generateFundingInterface(): string {
		return `export interface FundingConfig {
  /** GitHub Sponsors username(s) */
  github?: string | string[];
  /** Patreon username */
  patreon?: string;
  /** Ko-fi username */
  ko_fi?: string;
  /** Tidelift package name */
  tidelift?: string;
  /** Community Bridge project name */
  community_bridge?: string;
  /** Liberapay username */
  liberapay?: string;
  /** IssueHunt username */
  issuehunt?: string;
  /** Otechie username */
  otechie?: string;
  /** LFX Crowdfunding project name */
  lfx_crowdfunding?: string;
  /** Custom funding URL(s) */
  custom?: string | string[];
}`;
	}

	/**
	 * Generate funding data export
	 */
	private generateFundingData(funding: FundingConfig): string {
		return `export const fundingConfig: FundingConfig = ${JSON.stringify(funding, null, 2)};`;
	}

	/**
	 * Generate helper functions for funding configuration
	 */
	private generateFundingHelpers(funding: FundingConfig): string {
		return `/**
 * Get all funding URLs for this project
 */
export function getFundingUrls(): string[] {
  const urls: string[] = [];

  // GitHub Sponsors
  if (fundingConfig.github) {
    const githubUsers = Array.isArray(fundingConfig.github)
      ? fundingConfig.github
      : [fundingConfig.github];

    urls.push(...githubUsers.map(user => \`https://github.com/sponsors/\${user}\`));
  }

  // Patreon
  if (fundingConfig.patreon) {
    urls.push(\`https://patreon.com/\${fundingConfig.patreon}\`);
  }

  // Ko-fi
  if (fundingConfig.ko_fi) {
    urls.push(\`https://ko-fi.com/\${fundingConfig.ko_fi}\`);
  }

  // Tidelift
  if (fundingConfig.tidelift) {
    urls.push(\`https://tidelift.com/funding/github/\${fundingConfig.tidelift}\`);
  }

  // Community Bridge
  if (fundingConfig.community_bridge) {
    urls.push(\`https://funding.communitybridge.org/projects/\${fundingConfig.community_bridge}\`);
  }

  // Liberapay
  if (fundingConfig.liberapay) {
    urls.push(\`https://liberapay.com/\${fundingConfig.liberapay}\`);
  }

  // IssueHunt
  if (fundingConfig.issuehunt) {
    urls.push(\`https://issuehunt.io/r/\${fundingConfig.issuehunt}\`);
  }

  // Otechie
  if (fundingConfig.otechie) {
    urls.push(\`https://otechie.com/\${fundingConfig.otechie}\`);
  }

  // LFX Crowdfunding
  if (fundingConfig.lfx_crowdfunding) {
    urls.push(\`https://crowdfunding.lfx.linuxfoundation.org/projects/\${fundingConfig.lfx_crowdfunding}\`);
  }

  // Custom URLs
  if (fundingConfig.custom) {
    const customUrls = Array.isArray(fundingConfig.custom)
      ? fundingConfig.custom
      : [fundingConfig.custom];

    urls.push(...customUrls);
  }

  return urls;
}

/**
 * Get the primary funding URL (first available)
 */
export function getPrimaryFundingUrl(): string | undefined {
  const urls = getFundingUrls();
  return urls.length > 0 ? urls[0] : undefined;
}

/**
 * Check if project accepts funding
 */
export function hasFunding(): boolean {
  return getFundingUrls().length > 0;
}

/**
 * Get funding platforms used by this project
 */
export function getFundingPlatforms(): string[] {
  const platforms: string[] = [];

  if (fundingConfig.github) platforms.push('GitHub Sponsors');
  if (fundingConfig.patreon) platforms.push('Patreon');
  if (fundingConfig.ko_fi) platforms.push('Ko-fi');
  if (fundingConfig.tidelift) platforms.push('Tidelift');
  if (fundingConfig.community_bridge) platforms.push('Community Bridge');
  if (fundingConfig.liberapay) platforms.push('Liberapay');
  if (fundingConfig.issuehunt) platforms.push('IssueHunt');
  if (fundingConfig.otechie) platforms.push('Otechie');
  if (fundingConfig.lfx_crowdfunding) platforms.push('LFX Crowdfunding');
  if (fundingConfig.custom) platforms.push('Custom');

  return platforms;
}`;
	}
}
