import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import { synth, generateTypes, validate } from "./commands/index.js";
import { loadConfig } from "./utils/config.js";
import type { SynthOptions, GenerateTypesOptions } from "flughafen";

/**
 * Main CLI application setup using yargs
 */
export function createCli() {
	return yargs(hideBin(process.argv))
		.scriptName("flughafen")
		.usage("$0 <command> [options]")
		.version()
		.help()
		.alias("h", "help")
		.alias("v", "version")
		.demandCommand(1, "You need to specify a command")
		.strict()
		.fail((msg, err, yargs) => {
			if (err) {
				console.error(chalk.red(`Error: ${err.message}`));
			} else {
				console.error(chalk.red(`Error: ${msg}`));
				console.error(yargs.help());
			}
			process.exit(1);
		})
		.command(
			"synth <file>",
			"Synthesize TypeScript workflow files to YAML",
			(yargs) => {
				return yargs
					.positional("file", {
						describe: "TypeScript workflow file to synthesize",
						type: "string",
						demandOption: true,
					})
					.option("output", {
						alias: "o",
						describe: "Output directory for generated workflows",
						type: "string",
					})
					.option("dry-run", {
						describe: "Show output without writing files",
						type: "boolean",
						default: false,
					})
					.option("silent", {
						alias: "s",
						describe: "Suppress output",
						type: "boolean",
						default: false,
					})
					.option("verbose", {
						describe: "Show detailed output",
						type: "boolean",
						default: false,
					})
					.option("watch", {
						alias: "w",
						describe: "Watch mode - automatically re-synthesize on file changes",
						type: "boolean",
						default: false,
					})
					.example("$0 synth workflow.ts", "Synthesize workflow.ts to YAML")
					.example("$0 synth workflow.ts --output ./custom", "Output to custom directory")
					.example("$0 synth workflow.ts --dry-run", "Preview output without writing files")
					.example("$0 synth workflow.ts --watch", "Watch for changes and auto-synthesize");
			},
			async (argv) => {
				try {
					const config = await loadConfig();
					
					await synth({
						file: argv.file,
						output: argv.output || config.output,
						dryRun: argv.dryRun,
						silent: argv.silent,
						verbose: argv.verbose,
						watch: argv.watch,
					});
				} catch (error) {
					console.error(chalk.red(`Synth failed: ${error instanceof Error ? error.message : error}`));
					process.exit(1);
				}
			}
		)
		.command(
			"generate types [files...]",
			"Generate TypeScript types from GitHub Actions schemas",
			(yargs) => {
				return yargs
					.positional("files", {
						describe: "Workflow files to scan for actions",
						type: "string",
						array: true,
						default: [],
					})
					.option("workflow-dir", {
						alias: "w",
						describe: "Workflow directory to scan",
						type: "string",
					})
					.option("output", {
						alias: "o",
						describe: "Output file for generated types",
						type: "string",
					})
					.option("github-token", {
						alias: "t",
						describe: "GitHub token for API access",
						type: "string",
					})
					.option("include-jsdoc", {
						describe: "Include JSDoc in generated types",
						type: "boolean",
						default: true,
					})
					.option("silent", {
						alias: "s",
						describe: "Suppress output",
						type: "boolean",
						default: false,
					})
					.option("verbose", {
						describe: "Show detailed output",
						type: "boolean",
						default: false,
					})
					.option("watch", {
						alias: "w",
						describe: "Watch mode - automatically regenerate types on workflow changes",
						type: "boolean",
						default: false,
					})
					.example("$0 generate types", "Generate types for all detected actions")
					.example("$0 generate types workflow.ts", "Generate types for specific workflow")
					.example("$0 generate types --output ./types.d.ts", "Output to specific file")
					.example("$0 generate types --watch", "Watch workflow directory and regenerate types on changes");
			},
			async (argv) => {
				try {
					const config = await loadConfig();
					await generateTypes({
						files: argv.files,
						workflowDir: argv.workflowDir || config.input,
						output: argv.output || config.types?.output,
						githubToken: argv.githubToken || config.githubToken,
						includeJsdoc: argv.includeJsdoc ?? config.types?.includeJSDoc ?? true,
						silent: argv.silent,
						verbose: argv.verbose,
						watch: argv.watch,
					});
				} catch (error) {
					console.error(chalk.red(`Generate types failed: ${error instanceof Error ? error.message : error}`));
					process.exit(1);
				}
			}
		)
		.command(
			"validate [files...]",
			"Validate workflow configurations against GitHub Actions schema",
			(yargs) => {
				return yargs
					.positional("files", {
						describe: "Workflow files to validate",
						type: "string",
						array: true,
						default: [],
					})
					.option("strict", {
						describe: "Enable strict validation mode",
						type: "boolean",
						default: false,
					})
					.option("format", {
						alias: "f",
						describe: "Output format",
						type: "string",
						choices: ["json", "table"],
						default: "table",
					})
					.option("fix", {
						describe: "Auto-fix common issues",
						type: "boolean",
						default: false,
					})
					.option("silent", {
						alias: "s",
						describe: "Suppress output",
						type: "boolean",
						default: false,
					})
					.option("verbose", {
						describe: "Show detailed output including warnings",
						type: "boolean",
						default: false,
					})
					.example("$0 validate", "Validate all workflow files")
					.example("$0 validate workflow.ts", "Validate specific workflow")
					.example("$0 validate --strict", "Enable strict validation")
					.example("$0 validate --format json", "Output results as JSON");
			},
			async (argv) => {
				try {
					await validate({
						files: argv.files,
						strict: argv.strict,
						format: argv.format as "json" | "table",
						fix: argv.fix,
						silent: argv.silent,
						verbose: argv.verbose,
					});
				} catch (error) {
					console.error(chalk.red(`Validation failed: ${error instanceof Error ? error.message : error}`));
					process.exit(1);
				}
			}
		);
}

/**
 * Main CLI function
 */
export async function cli(): Promise<void> {
	const app = createCli();
	await app.parseAsync();
}

// Run the CLI if this file is being executed directly
// Check for both ESM and CommonJS entry points
const isMain = 
	(typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) ||
	(typeof process !== "undefined" && process.argv[1] && process.argv[1].endsWith("/cli.ts"));

if (isMain) {
	cli().catch((error) => {
		console.error(chalk.red(`CLI error: ${error instanceof Error ? error.message : error}`));
		process.exit(1);
	});
}
