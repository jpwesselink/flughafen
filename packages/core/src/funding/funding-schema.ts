/**
 * JSON Schema for GitHub FUNDING.yml configuration
 */
export const fundingSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: "https://github.com/jpwesselink/flughafen/packages/core/schemas/github-funding.schema.json",
	title: "GitHub FUNDING.yml Schema",
	description: "Schema for GitHub repository funding configuration file (.github/FUNDING.yml)",
	type: "object",
	additionalProperties: false,
	properties: {
		github: {
			description: "GitHub Sponsors usernames (up to 4)",
			oneOf: [
				{
					type: "string",
					pattern: "^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$",
					description: "Single GitHub username",
				},
				{
					type: "array",
					items: {
						type: "string",
						pattern: "^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$",
					},
					minItems: 1,
					maxItems: 4,
					uniqueItems: true,
					description: "Array of GitHub usernames",
				},
			],
		},
		patreon: {
			description: "Patreon username",
			type: "string",
			pattern: "^[a-zA-Z0-9_-]+$",
			minLength: 1,
			maxLength: 64,
		},
		open_collective: {
			description: "Open Collective username",
			type: "string",
			pattern: "^[a-z0-9-]+$",
			minLength: 1,
			maxLength: 64,
		},
		ko_fi: {
			description: "Ko-fi username",
			type: "string",
			pattern: "^[a-zA-Z0-9_]+$",
			minLength: 1,
			maxLength: 64,
		},
		tidelift: {
			description: "Tidelift platform and package name (e.g., 'npm/package-name', 'pypi/package-name')",
			type: "string",
			pattern: "^(npm|pypi|rubygems|maven|nuget|packagist|pub|go)/[a-zA-Z0-9@/_.-]+$",
		},
		community_bridge: {
			description: "Community Bridge project name",
			type: "string",
			pattern: "^[a-z0-9-]+$",
			minLength: 1,
			maxLength: 100,
		},
		liberapay: {
			description: "Liberapay username",
			type: "string",
			pattern: "^[a-zA-Z0-9_.-]+$",
			minLength: 1,
			maxLength: 64,
		},
		issuehunt: {
			description: "IssueHunt username",
			type: "string",
			pattern: "^[a-zA-Z0-9_-]+$",
			minLength: 1,
			maxLength: 64,
		},
		otechie: {
			description: "Otechie username",
			type: "string",
			pattern: "^[a-zA-Z0-9_-]+$",
			minLength: 1,
			maxLength: 64,
		},
		lfx_crowdfunding: {
			description: "Linux Foundation Crowdfunding project name",
			type: "string",
			pattern: "^[a-z0-9-]+$",
			minLength: 1,
			maxLength: 100,
		},
		polar: {
			description: "Polar username",
			type: "string",
			pattern: "^[a-zA-Z0-9_-]+$",
			minLength: 1,
			maxLength: 64,
		},
		buy_me_a_coffee: {
			description: "Buy Me a Coffee username",
			type: "string",
			pattern: "^[a-zA-Z0-9_]+$",
			minLength: 1,
			maxLength: 64,
		},
		thanks_dev: {
			description: "Thanks.dev username",
			type: "string",
			pattern: "^[a-zA-Z0-9_-]+$",
			minLength: 1,
			maxLength: 64,
		},
		custom: {
			description: "Custom funding URLs (up to 4)",
			oneOf: [
				{
					type: "string",
					format: "uri",
					pattern: "^https?://",
					description: "Single custom URL",
				},
				{
					type: "array",
					items: {
						type: "string",
						format: "uri",
						pattern: "^https?://",
					},
					minItems: 1,
					maxItems: 4,
					uniqueItems: true,
					description: "Array of custom URLs",
				},
			],
		},
	},
};
