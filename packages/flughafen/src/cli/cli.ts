#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { type SynthOptions, synthCommand } from "../lib/commands";
import { SchemaManager } from "../lib/schema/SchemaManager";

interface GenerateTypesOptions {
	"workflow-dir"?: string;
	output?: string;
	"github-token"?: string;
	"include-jsdoc"?: boolean;
	silent?: boolean;
	verbose?: boolean;
	files?: string[]; // Named positional arguments
}

/**
 * Generate types command: scan workflows and generate TypeScript interfaces
 */
async function generateTypesCommand(options: GenerateTypesOptions): Promise<void> {
	try {
		const {
			"workflow-dir": workflowDir,
			output,
			"github-token": githubToken,
			"include-jsdoc": includeJSDoc = true,
			silent = false,
			verbose = false,
			files = [], // Use the named positional argument
		} = options;

		if (!silent) {
			console.log(chalk.blue("🔍 Generating types for GitHub Actions..."));
		}

		const manager = new SchemaManager({
			workflowDir,
			typesFilePath: output,
			githubToken,
			includeJSDoc,
		});

		// If specific files are provided, use them; otherwise scan the directory
		const targetFiles = files.length > 0 ? files : undefined;

		if (verbose) {
			if (targetFiles) {
				console.log(chalk.gray(`📄 Processing files: ${targetFiles.join(", ")}`));
			} else {
				console.log(chalk.gray(`📁 Scanning directory: ${workflowDir || process.cwd()}`));
			}
			console.log(chalk.gray(`📄 Output file: ${output || "./flughafen-actions.d.ts"}`));
		}

		// Generate types from workflow files
		const result = targetFiles
			? await manager.generateTypesFromSpecificFiles(targetFiles)
			: await manager.generateTypesFromWorkflowFiles();

		if (!silent) {
			console.log(chalk.green("✅ Type generation completed!\n"));
			console.log(`📊 Results:`);
			console.log(`   - Actions processed: ${result.actionsProcessed}`);
			console.log(`   - Schemas fetched: ${result.schemasFetched}`);
			console.log(`   - Interfaces generated: ${result.interfacesGenerated}`);
			console.log(`   - Types file: ${result.typesFilePath}`);

			if (result.failedActions.length > 0) {
				console.log(chalk.yellow(`   - Failed actions: ${result.failedActions.join(", ")}`));
			}

			if (verbose) {
				console.log("\n📋 Generated Interfaces:");
				result.interfaces.forEach((iface) => {
					console.log(`   - ${iface.actionName} -> ${iface.interfaceName}`);
				});
			}

			console.log(chalk.green("\n🎉 Types are now available for type-safe .with() calls!"));
			console.log(chalk.gray("No imports needed - TypeScript will automatically discover the types."));
		}
	} catch (error) {
		if (!options.silent) {
			console.error(chalk.red("❌ Type generation failed:"), error instanceof Error ? error.message : String(error));
		}
		throw error;
	}
}

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
					await synthCommand(argv as SynthOptions);
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
					await generateTypesCommand(argv as GenerateTypesOptions);
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
