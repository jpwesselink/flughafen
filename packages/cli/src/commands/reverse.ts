import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { reverse as coreReverse, type ReverseOptions, type ReverseResult } from "@flughafen/core";
import chalk from "chalk";
import { CliSpinners, Logger } from "../utils/spinner";

export interface ReverseCliOptions extends ReverseOptions {
	target: string;
	silent?: boolean;
	verbose?: boolean;
	preview?: boolean;
	localActionsOnly?: boolean;
	skipYamlValidation?: boolean;
	skipSchemaValidation?: boolean;
	skipActionValidation?: boolean;
	validateOnly?: boolean;
	validationReport?: boolean;
	strictValidation?: boolean;
}

/**
 * Write generated files to disk
 */
async function writeGeneratedFiles(result: ReverseResult, logger: Logger): Promise<void> {
	for (const file of result.generatedFiles) {
		const filePath = resolve(file.path);
		const dir = dirname(filePath);

		// Create directory if it doesn't exist
		if (!existsSync(dir)) {
			await mkdir(dir, { recursive: true });
		}

		// Write file
		await writeFile(filePath, file.content, "utf8");
		logger.debug(`✅ Wrote ${file.type} file: ${filePath}`);
	}
}

/**
 * CLI wrapper for the reverse engineering operation
 */
export async function reverse(options: ReverseCliOptions): Promise<void> {
	const {
		target,
		silent = false,
		verbose = false,
		preview = false,
		localActionsOnly: _localActionsOnly = false,
		skipYamlValidation = false,
		skipSchemaValidation = false,
		skipActionValidation = false,
		validateOnly = false,
		validationReport = false,
		strictValidation = false,
	} = options;

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	try {
		// Resolve and validate target path
		const targetPath = resolve(target);

		if (!existsSync(targetPath)) {
			throw new Error(`Target path does not exist: ${targetPath}`);
		}

		const targetStat = statSync(targetPath);
		const isDirectory = targetStat.isDirectory();
		const isWorkflowFile = !isDirectory && (target.endsWith(".yml") || target.endsWith(".yaml"));

		logger.debug(`🎯 Target: ${targetPath}`);
		logger.debug(`📁 Is directory: ${isDirectory}`);
		logger.debug(`📄 Is workflow file: ${isWorkflowFile}`);

		if (preview) {
			logger.log(chalk.blue("👀 Preview mode - no files will be written"));
		}

		// Determine reverse engineering method
		let result: ReverseResult;

		if (isDirectory) {
			logger.debug("🔄 Reverse engineering directory...");
			result = await spinner.build(
				() =>
					coreReverse.github(targetPath, {
						...options,
						preview,
						skipYamlValidation,
						skipSchemaValidation,
						skipActionValidation,
						validateOnly,
						validationReport,
						strictValidation,
					}),
				{
					loading: `Reverse engineering ${basename(targetPath)} directory...`,
					success: "Directory reverse engineering completed",
					error: "Failed to reverse engineer directory",
				}
			);
		} else if (isWorkflowFile) {
			logger.debug("🔄 Reverse engineering workflow file...");
			result = await spinner.build(
				() =>
					coreReverse.workflow(targetPath, {
						...options,
						preview,
						skipYamlValidation,
						skipSchemaValidation,
						skipActionValidation,
						validateOnly,
						validationReport,
						strictValidation,
					}),
				{
					loading: `Reverse engineering ${basename(targetPath)}...`,
					success: "Workflow reverse engineering completed",
					error: "Failed to reverse engineer workflow",
				}
			);
		} else {
			throw new Error(`Target must be a directory or a .yml/.yaml workflow file: ${targetPath}`);
		}

		// Write generated files to disk (unless in preview or validate-only mode)
		if (!preview && !validateOnly && result.generatedFiles.length > 0) {
			await writeGeneratedFiles(result, logger);
		}

		// Display results
		if (!silent) {
			if (validateOnly) {
				console.log(chalk.green("✅ Validation completed!\n"));
			} else {
				console.log(chalk.green("✅ Reverse engineering completed!\n"));
			}

			// Show summary
			const summary = coreReverse.getSummary(result);
			console.log(summary);

			// Show validation results prominently if there are errors or warnings
			if (result.errors.length > 0) {
				console.log(chalk.red(`\n❌ ${result.errors.length} validation error(s) found:`));
				for (const error of result.errors.slice(0, 5)) {
					// Show first 5 errors
					console.log(chalk.red(`   • ${error.type} in ${basename(error.file)}: ${error.message}`));
				}
				if (result.errors.length > 5) {
					console.log(chalk.red(`   ... and ${result.errors.length - 5} more errors`));
				}
			}

			if (result.warnings.length > 0) {
				console.log(chalk.yellow(`\n⚠️  ${result.warnings.length} validation warning(s) found:`));
				for (const warning of result.warnings.slice(0, 3)) {
					// Show first 3 warnings
					console.log(chalk.yellow(`   • ${warning}`));
				}
				if (result.warnings.length > 3) {
					console.log(chalk.yellow(`   ... and ${result.warnings.length - 3} more warnings`));
				}
			}

			// Show detailed results if verbose
			if (verbose) {
				console.log(chalk.blue("\n📋 Detailed Results:"));

				if (result.workflows.length > 0) {
					console.log(chalk.cyan("\n🔧 Workflows:"));
					for (const workflow of result.workflows) {
						console.log(`   📄 ${workflow.name || "Unnamed"} (${workflow.filePath})`);
						console.log(`      Jobs: ${workflow.jobs.length}`);
						const totalSteps = workflow.jobs.reduce(
							(sum: number, job: { steps: unknown[] }) => sum + job.steps.length,
							0
						);
						console.log(`      Steps: ${totalSteps}`);
						if (workflow.triggers.length > 0) {
							console.log(`      Triggers: ${workflow.triggers.map((t) => t.event).join(", ")}`);
						}
					}
				}

				if (result.localActions.length > 0) {
					console.log(chalk.cyan("\n🎯 Local Actions:"));
					for (const action of result.localActions) {
						console.log(`   📦 ${action.name} (${action.path})`);
						if (action.config) {
							console.log(`      📝 ${action.config.description}`);
							if (action.config.inputs) {
								console.log(`      📥 Inputs: ${Object.keys(action.config.inputs).length}`);
							}
							if (action.config.outputs) {
								console.log(`      📤 Outputs: ${Object.keys(action.config.outputs).length}`);
							}
							console.log(`      🔧 Type: ${action.config.runs.using}`);
						}
					}
				}

				if (result.generatedFiles.length > 0) {
					console.log(chalk.cyan("\n📁 Generated Files:"));
					for (const file of result.generatedFiles) {
						console.log(`   📄 ${file.type}: ${file.path}`);
					}
				}

				if (result.errors.length > 0) {
					console.log(chalk.red("\n❌ Detailed Errors:"));
					for (const error of result.errors) {
						const location = error.line ? ` (line ${error.line}${error.column ? `, column ${error.column}` : ""})` : "";
						console.log(`   ⚠️  ${error.type} in ${basename(error.file)}${location}: ${error.message}`);
					}
				}

				if (result.warnings.length > 0) {
					console.log(chalk.yellow("\n⚠️  Detailed Warnings:"));
					for (const warning of result.warnings) {
						console.log(`   🚨 ${warning}`);
					}
				}
			}

			// Show next steps
			if (validateOnly) {
				if (result.errors.length === 0) {
					console.log(chalk.green("\n🚀 Next Steps:"));
					console.log("   1. Run without --validate-only to generate TypeScript files");
					console.log("   2. Use --validation-report for detailed validation information");
				} else {
					console.log(chalk.red("\n🔄 Fix validation errors before proceeding:"));
					console.log("   1. Review the validation errors above");
					console.log("   2. Fix YAML syntax and schema issues");
					console.log("   3. Run validation again to verify fixes");
					console.log("   4. Use --validation-report for detailed error information");
				}
			} else if (!preview && result.generatedFiles.length > 0) {
				console.log(chalk.green("\n🚀 Next Steps:"));
				console.log("   1. Review the generated TypeScript files");
				console.log("   2. Adjust imports and configurations as needed");
				console.log("   3. Run 'flughafen build' to validate and synthesize");
				console.log("   4. Test your workflows with 'flughafen validate'");
			} else if (preview) {
				console.log(chalk.blue("\n👀 Preview completed - run without --preview to generate files"));
			}
		}

		// Exit with error if there were critical errors
		if (result.errors.length > 0) {
			const criticalErrors = result.errors.filter(
				(e: { type: string }) => e.type === "yaml" || e.type === "parsing" || e.type === "generation" || e.type === "io"
			);
			const validationErrors = result.errors.filter(
				(e: { type: string }) => e.type === "validation" || e.type === "schema"
			);

			// In validate-only mode, exit with error if there are validation errors
			if (validateOnly && validationErrors.length > 0) {
				throw new Error(`Validation failed with ${validationErrors.length} error(s)`);
			}

			// Always exit with error for critical errors
			if (criticalErrors.length > 0) {
				throw new Error(`Reverse engineering completed with ${criticalErrors.length} critical error(s)`);
			}
		}

		// In strict validation mode, exit with error if there are any warnings treated as errors
		if (strictValidation && result.warnings.length > 0) {
			throw new Error(`Strict validation failed with ${result.warnings.length} warning(s) treated as errors`);
		}
	} catch (error) {
		if (!silent) {
			console.error(
				chalk.red("❌ Reverse engineering failed:"),
				error instanceof Error ? error.message : String(error)
			);
		}
		throw error;
	}
}
