import * as yaml from "yaml";
import type { FundingConfig } from "./types";

/**
 * Builder for GitHub FUNDING.yml configuration
 *
 * This builder resets itself after each build() call to ensure clean state
 *
 * @example
 * ```typescript
 * import { funding } from "@flughafen/core";
 *
 * funding
 *   .github(["user1", "user2"])
 *   .patreon("mypatreon")
 *   .custom("https://example.com/donate")
 *   .build();
 * ```
 */
export class FundingBuilder {
	private config: FundingConfig = {};

	// Public constructor for cloning
	constructor(initialConfig: FundingConfig = {}) {
		this.config = { ...initialConfig };
	}

	/**
	 * Reset the builder to clean state
	 */
	private reset(): void {
		this.config = {};
	}

	/**
	 * Set GitHub Sponsors usernames (up to 4)
	 */
	github(sponsors: string | string[]): FundingBuilder {
		if (Array.isArray(sponsors)) {
			if (sponsors.length > 4) {
				throw new Error("GitHub sponsors cannot have more than 4 usernames");
			}
			this.config.github = sponsors;
		} else {
			this.config.github = sponsors;
		}
		return this;
	}

	/**
	 * Set Patreon username
	 */
	patreon(username: string): FundingBuilder {
		this.config.patreon = username;
		return this;
	}

	/**
	 * Set Open Collective username
	 */
	openCollective(username: string): FundingBuilder {
		this.config.open_collective = username;
		return this;
	}

	/**
	 * Set Ko-fi username
	 */
	kofi(username: string): FundingBuilder {
		this.config.ko_fi = username;
		return this;
	}

	/**
	 * Set Tidelift platform and package
	 * @example tidelift("npm/express")
	 */
	tidelift(platformPackage: string): FundingBuilder {
		this.config.tidelift = platformPackage;
		return this;
	}

	/**
	 * Set Community Bridge project name
	 */
	communityBridge(projectName: string): FundingBuilder {
		this.config.community_bridge = projectName;
		return this;
	}

	/**
	 * Set Liberapay username
	 */
	liberapay(username: string): FundingBuilder {
		this.config.liberapay = username;
		return this;
	}

	/**
	 * Set IssueHunt username
	 */
	issuehunt(username: string): FundingBuilder {
		this.config.issuehunt = username;
		return this;
	}

	/**
	 * Set Otechie username
	 */
	otechie(username: string): FundingBuilder {
		this.config.otechie = username;
		return this;
	}

	/**
	 * Set LFX Crowdfunding project name
	 */
	lfxCrowdfunding(projectName: string): FundingBuilder {
		this.config.lfx_crowdfunding = projectName;
		return this;
	}

	/**
	 * Set Polar username
	 */
	polar(username: string): FundingBuilder {
		this.config.polar = username;
		return this;
	}

	/**
	 * Set Buy Me a Coffee username
	 */
	buyMeACoffee(username: string): FundingBuilder {
		this.config.buy_me_a_coffee = username;
		return this;
	}

	/**
	 * Set Thanks.dev username
	 */
	thanksDev(username: string): FundingBuilder {
		this.config.thanks_dev = username;
		return this;
	}

	/**
	 * Set custom funding URLs (up to 4)
	 */
	custom(urls: string | string[]): FundingBuilder {
		if (Array.isArray(urls)) {
			if (urls.length > 4) {
				throw new Error("Custom URLs cannot have more than 4 entries");
			}
			this.config.custom = urls;
		} else {
			this.config.custom = urls;
		}
		return this;
	}

	/**
	 * Build the funding configuration
	 */
	build(): FundingConfig {
		// Return a copy to prevent external modifications
		const result = { ...this.config };
		// Reset for next use
		this.reset();
		return result;
	}

	/**
	 * Generate YAML content for FUNDING.yml
	 */
	toYAML(): string {
		const config = this.build();

		// Add header comment
		const header = `# GitHub repository funding configuration
# Learn more: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

`;

		// Generate YAML with proper formatting
		const yamlContent = yaml.stringify(config, {
			indent: 2,
			lineWidth: 0,
			nullStr: "",
		});

		return header + yamlContent;
	}

	/**
	 * Get the standard path for FUNDING.yml
	 */
	getPath(): string {
		return ".github/FUNDING.yml";
	}

	/**
	 * Synthesize the FUNDING.yml file
	 * Returns the file content and path
	 */
	synth(): { path: string; content: string } {
		const result = {
			path: this.getPath(),
			content: this.toYAML(),
		};
		// Reset for next use
		this.reset();
		return result;
	}
}

/**
 * Create a new funding configuration builder
 *
 * @example
 * ```typescript
 * import { createFunding } from "@flughafen/core";
 *
 * export default createFunding()
 *   .github("octocat")
 *   .patreon("creator")
 *   .custom("https://example.com/donate");
 * ```
 */
export function createFunding(): FundingBuilder {
	return new FundingBuilder();
}

/**
 * Singleton funding builder instance
 *
 * @example
 * ```typescript
 * import { funding } from "@flughafen/core";
 *
 * const result = funding
 *   .github("octocat")
 *   .patreon("creator")
 *   .custom("https://example.com/donate")
 *   .synth();
 *
 * // Write to file
 * fs.writeFileSync(result.path, result.content);
 * ```
 */
export const funding = new FundingBuilder();
