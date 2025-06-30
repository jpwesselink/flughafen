import chalk from "chalk";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

	try {
		// Check if config file already exists
		if (existsSync(configPath) && !force) {
			if (!silent) {
				console.log(chalk.yellow(`⚠️  Configuration file already exists: ${output}`));
				console.log(chalk.gray("Use --force to overwrite the existing file"));
			}
			return;
		}

		if (verbose) {
			console.log(chalk.gray(`📁 Creating configuration file: ${configPath}`));
			console.log(chalk.gray(`📋 Using template: ${template}`));
		}

		// Get the template content
		const configContent = getConfigTemplate(template);

		// Write the configuration file
		writeFileSync(configPath, configContent, "utf8");

		if (!silent) {
			console.log(chalk.green(`✅ Created ${output}`));
			
			if (template === "default") {
				console.log(chalk.blue("\n📝 Next steps:"));
				console.log(chalk.gray("  1. Review the configuration options"));
				console.log(chalk.gray("  2. Create your workflows directory: mkdir workflows"));
				console.log(chalk.gray("  3. Start building workflows with TypeScript"));
				console.log(chalk.gray(`  4. Run: flughafen synth your-workflow.ts`));
			} else if (template === "minimal") {
				console.log(chalk.blue("\n📝 Your minimal config is ready!"));
				console.log(chalk.gray("  Add more options as needed"));
			}
		}

		if (verbose) {
			console.log(chalk.gray(`\n📄 Configuration written to: ${configPath}`));
			console.log(chalk.gray(`📏 File size: ${Buffer.byteLength(configContent, "utf8")} bytes`));
		}

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (!silent) {
			console.error(chalk.red(`❌ Failed to create configuration file: ${errorMessage}`));
		}
		throw error;
	}
}