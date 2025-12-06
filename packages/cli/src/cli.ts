import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { build, generateTypes, reverse, validate } from "./commands/index";

// Default paths
const DEFAULT_INPUT = "./workflows";
const DEFAULT_OUTPUT = "./.github/workflows";
const DEFAULT_TYPES_OUTPUT = "./flughafen-actions.d.ts";

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
						default: DEFAULT_INPUT,
					})
					.option("output", {
						alias: "o",
						describe: "Output file for generated types",
						type: "string",
						default: DEFAULT_TYPES_OUTPUT,
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
					await generateTypes({
						files: argv.files,
						workflowDir: argv.workflowDir,
						output: argv.output,
						githubToken: argv.githubToken,
						includeJsdoc: argv.includeJsdoc,
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
					.option("input", {
						alias: "i",
						describe: "Input directory to search for workflow files",
						type: "string",
						default: DEFAULT_INPUT,
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
					.option("skip-vuln-check", {
						describe: "Skip vulnerability checking against GitHub Advisory Database",
						type: "boolean",
						default: false,
					})
					.example("$0 validate", "Validate all workflow files")
					.example("$0 validate workflow.ts", "Validate specific workflow")
					.example("$0 validate --input ./custom-workflows", "Validate files in custom directory")
					.example("$0 validate --strict", "Enable strict validation")
					.example("$0 validate --format json", "Output results as JSON");
			},
			async (argv) => {
				try {
					await validate({
						files: argv.files,
						input: argv.input,
						strict: argv.strict,
						format: argv.format as "json" | "table",
						silent: argv.silent,
						verbose: argv.verbose,
						skipVulnerabilityCheck: argv.skipVulnCheck,
					});
				} catch (error) {
					console.error(chalk.red(`Validation failed: ${error instanceof Error ? error.message : error}`));
					process.exit(1);
				}
			}
		)
		.command(
			"build [files...]",
			"Build workflows (validate + generate types + synth)",
			(yargs) => {
				return yargs
					.positional("files", {
						describe: "Workflow files to build",
						type: "string",
						array: true,
						default: [],
					})
					.option("input", {
						alias: "i",
						describe: "Input directory to search for workflow files",
						type: "string",
						default: DEFAULT_INPUT,
					})
					.option("output", {
						alias: "o",
						describe: "Output directory for generated workflows",
						type: "string",
						default: DEFAULT_OUTPUT,
					})
					.option("skip-validation", {
						describe: "Skip validation step",
						type: "boolean",
						default: false,
					})
					.option("skip-types", {
						describe: "Skip type generation step",
						type: "boolean",
						default: false,
					})
					.option("skip-synth", {
						describe: "Skip synthesis step",
						type: "boolean",
						default: false,
					})
					.option("strict", {
						describe: "Enable strict validation mode",
						type: "boolean",
						default: false,
					})
					.option("watch", {
						alias: "w",
						describe: "Watch for changes and rebuild automatically",
						type: "boolean",
						default: false,
					})
					.option("dry-run", {
						describe: "Don't write files, just show what would be generated",
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
					.example("$0 build", "Build all workflow files")
					.example("$0 build workflow.ts", "Build specific workflow")
					.example("$0 build --input ./custom-workflows", "Build files in custom directory")
					.example("$0 build --skip-validation", "Skip validation step")
					.example("$0 build --watch", "Watch mode for continuous building")
					.example("$0 build --dry-run", "Show what would be generated");
			},
			async (argv) => {
				try {
					await build({
						files: argv.files,
						input: argv.input,
						output: argv.output,
						skipValidation: argv.skipValidation,
						skipTypes: argv.skipTypes,
						skipSynth: argv.skipSynth,
						strict: argv.strict,
						watch: argv.watch,
						dryRun: argv.dryRun,
						silent: argv.silent,
						verbose: argv.verbose,
					});
				} catch (error) {
					console.error(chalk.red(`Build failed: ${error instanceof Error ? error.message : error}`));
					process.exit(1);
				}
			}
		)
		.command(
			"reverse <target>",
			"Reverse engineer GitHub workflows to TypeScript",
			(yargs) => {
				return yargs
					.positional("target", {
						describe: "Target to reverse engineer (.github directory or workflow file)",
						type: "string",
						demandOption: true,
					})
					.option("output", {
						alias: "o",
						describe: "Output directory for generated TypeScript files",
						type: "string",
						default: DEFAULT_INPUT,
					})
					.option("skip-local-actions", {
						describe: "Skip extraction of local actions from .github/actions/",
						type: "boolean",
						default: false,
					})
					.option("local-actions-only", {
						describe: "Only extract local actions, skip workflows",
						type: "boolean",
						default: false,
					})
					.option("generate-types", {
						describe: "Generate type definitions for discovered actions",
						type: "boolean",
						default: false,
					})
					.option("preserve-comments", {
						describe: "Preserve comments from YAML files",
						type: "boolean",
						default: true,
					})
					.option("overwrite", {
						describe: "Overwrite existing files",
						type: "boolean",
						default: false,
					})
					.option("preview", {
						describe: "Preview mode - don't write files",
						type: "boolean",
						default: false,
					})
					.option("skip-yaml-validation", {
						describe: "Skip YAML syntax validation during reverse engineering",
						type: "boolean",
						default: false,
					})
					.option("skip-schema-validation", {
						describe: "Skip GitHub workflow schema validation",
						type: "boolean",
						default: false,
					})
					.option("skip-action-validation", {
						describe: "Skip external action schema validation",
						type: "boolean",
						default: false,
					})
					.option("validate-only", {
						describe: "Only validate workflows, don't generate TypeScript",
						type: "boolean",
						default: false,
					})
					.option("validation-report", {
						describe: "Show detailed validation report",
						type: "boolean",
						default: false,
					})
					.option("strict-validation", {
						describe: "Treat validation warnings as errors",
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
					.example("$0 reverse .github", "Reverse engineer entire .github directory (includes local actions)")
					.example("$0 reverse workflow.yml", "Reverse engineer single workflow file")
					.example("$0 reverse .github --skip-local-actions", "Skip local actions extraction")
					.example("$0 reverse .github --local-actions-only", "Only extract local actions")
					.example("$0 reverse .github --generate-types", "Generate types for discovered actions")
					.example("$0 reverse .github --preview", "Preview without writing files")
					.example("$0 reverse .github --output ./workflows", "Output to custom directory")
					.example("$0 reverse .github --validate-only", "Only validate workflows, don't generate code")
					.example("$0 reverse .github --validation-report", "Show detailed validation report")
					.example("$0 reverse .github --strict-validation", "Treat warnings as errors")
					.example(
						"$0 reverse .github --skip-action-validation",
						"Skip external action validation for faster processing"
					);
			},
			async (argv) => {
				try {
					await reverse({
						target: argv.target,
						outputDir: argv.output,
						extractLocalActions: !argv.skipLocalActions,
						localActionsOnly: argv.localActionsOnly,
						generateTypes: argv.generateTypes,
						preserveComments: argv.preserveComments,
						overwrite: argv.overwrite,
						preview: argv.preview,
						skipYamlValidation: argv.skipYamlValidation,
						skipSchemaValidation: argv.skipSchemaValidation,
						skipActionValidation: argv.skipActionValidation,
						validateOnly: argv.validateOnly,
						validationReport: argv.validationReport,
						strictValidation: argv.strictValidation,
						silent: argv.silent,
						verbose: argv.verbose,
					});
				} catch (error) {
					console.error(chalk.red(`Reverse engineering failed: ${error instanceof Error ? error.message : error}`));
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
