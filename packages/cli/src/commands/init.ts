import chalk from "chalk";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CliSpinners, Logger } from "../utils/spinner";

export interface InitOptions {
	force?: boolean;
	template?: string;
	output?: string;
	silent?: boolean;
	verbose?: boolean;
}

/**
 * Minimal configuration template
 */
const MINIMAL_CONFIG_TEMPLATE = `import type { FlughafenConfig } from "@flughafen/cli";

const config: FlughafenConfig = {
	input: "./workflows",
	output: "./.github/workflows"
};

export default config;
`;

/**
 * Default TypeScript configuration template
 */
const DEFAULT_CONFIG_TEMPLATE = `import type { FlughafenConfig } from "@flughafen/cli";

/**
 * Flughafen configuration
 * @see https://docs.flughafen.dev/configuration
 */
const config: FlughafenConfig = {
	/** Input directory for workflow source files */
	input: "./workflows",

	/** Output directory for generated workflows */
	output: "./.github/workflows",

	/** GitHub token for API access (optional) */
	githubToken: process.env.GITHUB_TOKEN,

	/** Type generation settings */
	types: {
		/** Output file for generated types */
		output: "./flughafen-actions.d.ts",
		/** Include JSDoc in generated types */
		includeJSDoc: true
	}
};

export default config;
`;

/**
 * Get configuration template by name
 */
function getConfigTemplate(template: string): string {
	switch (template) {
		case "minimal":
			return MINIMAL_CONFIG_TEMPLATE;
		case "default":
		default:
			return DEFAULT_CONFIG_TEMPLATE;
	}
}

/**
 * Initialize a new Flughafen configuration file
 */
export async function init(options: InitOptions): Promise<void> {
	const { 
		force = false, 
		template = "default", 
		output = "flughafen.config.ts",
		silent = false, 
		verbose = false 
	} = options;

	const configPath = join(process.cwd(), output);
	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	try {
		// Check if config file already exists
		if (existsSync(configPath) && !force) {
			logger.warn(`Configuration file already exists: ${output}`);
			logger.log(chalk.gray("Use --force to overwrite the existing file"));
			return;
		}

		logger.debug(`📁 Creating configuration file: ${configPath}`);
		logger.debug(`📋 Using template: ${template}`);

		// Create configuration file with spinner
		await spinner.file(
			async () => {
				// Get the template content
				const configContent = getConfigTemplate(template);
				
				// Write the configuration file
				writeFileSync(configPath, configContent, "utf8");
				
				return { configContent, configPath };
			},
			{
				loading: `Creating ${output} configuration file...`,
				success: `Configuration file created: ${output}`,
				error: "Failed to create configuration file"
			}
		);

		// Show next steps
		if (template === "default") {
			logger.info("Next steps:");
			logger.log(chalk.gray("  1. Review the configuration options"));
			logger.log(chalk.gray("  2. Create your workflows directory: mkdir workflows"));
			logger.log(chalk.gray("  3. Start building workflows with TypeScript"));
			logger.log(chalk.gray(`  4. Run: flughafen synth your-workflow.ts`));
		} else if (template === "minimal") {
			logger.info("Your minimal config is ready!");
			logger.log(chalk.gray("  Add more options as needed"));
		}

		logger.debug(`📄 Configuration written to: ${configPath}`);

	} catch (error) {
		// Error handling is done by the spinner, just rethrow
		throw error;
	}
}