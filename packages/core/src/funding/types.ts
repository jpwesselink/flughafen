/**
 * Type definitions for GitHub FUNDING.yml configuration
 */

export interface FundingConfig {
	github?: string | string[];
	patreon?: string;
	open_collective?: string;
	ko_fi?: string;
	tidelift?: string;
	community_bridge?: string;
	liberapay?: string;
	issuehunt?: string;
	otechie?: string;
	lfx_crowdfunding?: string;
	polar?: string;
	buy_me_a_coffee?: string;
	thanks_dev?: string;
	custom?: string | string[];
}

export interface FundingAnalysis {
	path: string;
	config: FundingConfig;
	platforms: string[];
	totalPlatforms: number;
	hasGitHubSponsors: boolean;
	hasCustomUrls: boolean;
}

export interface FundingValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}
