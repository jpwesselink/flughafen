import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fundingSchema } from "./funding-schema";
import type { FundingConfig, FundingValidationResult } from "./types";

/**
 * Validates GitHub FUNDING.yml configuration
 */
export class FundingValidator {
	private ajv: Ajv;
	private validate: unknown;

	constructor() {
		this.ajv = new Ajv({ allErrors: true });
		addFormats(this.ajv);
		this.validate = this.ajv.compile(fundingSchema);
	}

	/**
	 * Validate funding configuration
	 */
	validateConfig(config: FundingConfig): FundingValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate against schema
		const validateFn = this.validate as (data: unknown) => boolean;
		const valid = validateFn(config);
		if (!valid && (validateFn as unknown as { errors?: unknown }).errors) {
			const ajvErrors = (validateFn as unknown as { errors: Array<{ instancePath?: string; message?: string }> })
				.errors;
			for (const error of ajvErrors) {
				errors.push(`${error.instancePath || "root"}: ${error.message}`);
			}
		}

		// Additional validation rules
		this.validateGitHubSponsors(config, errors, warnings);
		this.validateCustomUrls(config, errors, warnings);
		this.validateTidelift(config, errors, warnings);
		this.checkForDeprecatedPlatforms(config, warnings);
		this.checkForDuplicates(config, warnings);

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	private validateGitHubSponsors(config: FundingConfig, errors: string[], warnings: string[]): void {
		if (config.github) {
			if (Array.isArray(config.github)) {
				if (config.github.length > 4) {
					errors.push("GitHub sponsors list cannot have more than 4 usernames");
				}
				// Check for duplicates
				const uniqueUsers = new Set(config.github);
				if (uniqueUsers.size !== config.github.length) {
					warnings.push("GitHub sponsors list contains duplicate usernames");
				}
			}
		}
	}

	private validateCustomUrls(config: FundingConfig, errors: string[], warnings: string[]): void {
		if (config.custom) {
			if (Array.isArray(config.custom)) {
				if (config.custom.length > 4) {
					errors.push("Custom URLs list cannot have more than 4 URLs");
				}
				// Check for duplicates
				const uniqueUrls = new Set(config.custom);
				if (uniqueUrls.size !== config.custom.length) {
					warnings.push("Custom URLs list contains duplicate URLs");
				}
				// Validate URL formats
				for (const url of config.custom) {
					if (!url.startsWith("http://") && !url.startsWith("https://")) {
						errors.push(`Invalid custom URL: ${url} - must start with http:// or https://`);
					}
				}
			} else if (typeof config.custom === "string") {
				if (!config.custom.startsWith("http://") && !config.custom.startsWith("https://")) {
					errors.push(`Invalid custom URL: ${config.custom} - must start with http:// or https://`);
				}
			}
		}
	}

	private validateTidelift(config: FundingConfig, errors: string[], _warnings: string[]): void {
		if (config.tidelift) {
			const validPlatforms = ["npm", "pypi", "rubygems", "maven", "nuget", "packagist", "pub", "go"];
			const parts = config.tidelift.split("/");
			if (parts.length < 2) {
				errors.push("Tidelift must be in format 'platform/package-name'");
			} else if (!validPlatforms.includes(parts[0])) {
				errors.push(`Invalid Tidelift platform: ${parts[0]}. Must be one of: ${validPlatforms.join(", ")}`);
			}
		}
	}

	private checkForDeprecatedPlatforms(config: FundingConfig, warnings: string[]): void {
		// Check if using any platforms that might be deprecated or less common
		if (config.otechie) {
			warnings.push("Otechie platform is less commonly used - verify it's still active");
		}
		if (config.community_bridge) {
			warnings.push("Community Bridge has transitioned to LFX - consider using lfx_crowdfunding instead");
		}
	}

	private checkForDuplicates(config: FundingConfig, warnings: string[]): void {
		// Check for potential duplicate funding methods
		if (config.github && config.patreon) {
			// This is fine, just different platforms
		}
		if (config.ko_fi && config.buy_me_a_coffee) {
			warnings.push("Using both Ko-fi and Buy Me a Coffee - these serve similar purposes");
		}
	}
}
