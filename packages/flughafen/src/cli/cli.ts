#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { type SynthOptions, synth } from "./commands";
import { type GenerateTypesOptions, generateTypes } from "./commands";

/**
 * Main CLI function
 */
export function main(): void {
	yargs(hideBin(process.argv))
		.command(
			"synth <file>",
			"Synthesize GitHub Actions workflow and actions from TypeScript/JavaScript",
			(yargs) => {
				return yargs
					.positional("file", {
						describe: "Workflow file to synthesize (.ts or .js)",
						type: "string",
						demandOption: true,
					})
					.option("dir", {
						alias: "d",
						describe: "Base output directory (workflow goes to {dir}/workflows/, actions to {dir}/actions/)",
						type: "string",
					})
					.option("output", {
						alias: "o",
						describe: "Output directory (alias for --dir)",
						type: "string",
					})
					.option("dry-run", {
						describe: "Show what would be generated without writing files",
						type: "boolean",
						default: false,
					})
					.option("silent", {
						alias: "s",
						describe: "Silent mode - minimal output",
						type: "boolean",
						default: false,
					})
					.option("verbose", {
						describe: "Verbose mode - detailed output",
						type: "boolean",
						default: false,
					});
			},
			async (argv) => {
				try {
					await synth(argv as SynthOptions);
				} catch (error) {
					console.error(chalk.red("CLI Error:"), error instanceof Error ? error.message : String(error));
					process.exit(1);
				}
			}
		)
		.command(
			"generate-types [files...]",
			"Generate TypeScript types for GitHub Actions from workflow files",
			(yargs) => {
				return yargs
					.positional("files", {
						describe: "Specific workflow files to process (optional)",
						type: "string",
						array: true,
					})
					.option("workflow-dir", {
						alias: "w",
						describe: "Directory containing workflow files (used when no files specified)",
						type: "string",
						default: process.cwd(),
					})
					.option("output", {
						alias: "o",
						describe: "Output file for generated types",
						type: "string",
						default: "./flughafen-actions.d.ts",
					})
					.option("github-token", {
						describe: "GitHub token for accessing private repos and actions",
						type: "string",
					})
					.option("include-jsdoc", {
						describe: "Include JSDoc comments in the generated types",
						type: "boolean",
						default: true,
					})
					.option("silent", {
						alias: "s",
						describe: "Silent mode - minimal output",
						type: "boolean",
						default: false,
					})
					.option("verbose", {
						describe: "Verbose mode - detailed output",
						type: "boolean",
						default: false,
					});
			},
			async (argv) => {
				try {
					await generateTypes(argv as GenerateTypesOptions);
				} catch (error) {
					console.error(chalk.red("CLI Error:"), error instanceof Error ? error.message : String(error));
					process.exit(1);
				}
			}
		)
		.demandCommand(1, "You need to specify a command")
		.help()
		.alias("help", "h")
		.version()
		.alias("version", "v")
		.example("$0 synth my-workflow.ts", "Synthesize workflow and output to console")
		.example("$0 synth my-workflow.ts -d .github", "Synthesize and save to .github/workflows/ and .github/actions/")
		.example("$0 synth my-workflow.ts --dry-run", "Preview what would be generated")
		.example("$0 synth my-workflow.ts -v", "Verbose output showing all processing steps")
		.example("$0 generate-types", "Generate types for all actions in current directory")
		.example("$0 generate-types src/ci/publish.ts", "Generate types from specific workflow file")
		.example("$0 generate-types workflow1.ts workflow2.ts", "Generate types from multiple workflow files")
		.example("$0 generate-types -w ./workflows", "Generate types from specific workflow directory")
		.example("$0 generate-types -o ./types/actions.d.ts", "Generate types to custom output file")
		.example("$0 generate-types --github-token $TOKEN", "Use GitHub token for private repos")
		.epilogue("For more information, visit: https://github.com/your-repo/flughafen").argv;
}

// Run the CLI (check if this file is being run directly)
// For CommonJS builds, check require.main
const isMainModule = typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;
// For ES module builds, we'll check if this file is being run directly
if (isMainModule) {
	main();
}
