import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
	generateTypes as coreGenerateTypes,
	reverse as coreReverse,
	type ReverseOptions,
	type ReverseResult,
} from "@flughafen/core";
import { CliSpinners, colors, fmt, icons, Logger } from "../utils";

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
 *
 * @param result - The reverse engineering result containing generated files
 * @param logger - Logger for debug output
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
		logger.debug(`${icons.success} Wrote ${file.type} file: ${filePath}`);
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

		logger.debug(`${icons.target} Target: ${targetPath}`);
		logger.debug(`${icons.folder} Is directory: ${isDirectory}`);
		logger.debug(`${icons.file} Is workflow file: ${isWorkflowFile}`);

		if (preview) {
			logger.log(colors.info(`${icons.watch} Preview mode - no files will be written`));
		}

		// Determine reverse engineering method
		let result: ReverseResult;

		if (isDirectory) {
			logger.debug(`${icons.next} Reverse engineering directory...`);
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
			logger.debug(`${icons.next} Reverse engineering workflow file...`);
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

		// Generate types for discovered actions (unless in preview or validate-only mode)
		if (!preview && !validateOnly) {
			const workflowFiles = result.generatedFiles.filter((f) => f.type === "workflow").map((f) => f.path);

			if (workflowFiles.length > 0) {
				logger.debug(`${icons.next} Generating types for discovered actions...`);
				await spinner.build(
					() =>
						coreGenerateTypes({
							files: workflowFiles,
							workflowDir: dirname(workflowFiles[0]),
							output: resolve("flughafen-actions.d.ts"),
							includeJsdoc: true,
							silent: true,
							verbose: false,
						}),
					{
						loading: "Generating action types...",
						success: "Type generation completed",
						error: "Failed to generate types",
					}
				);
			}
		}

		// Display results
		if (!silent) {
			if (validateOnly) {
				console.log(fmt.success("Validation completed!\n"));
			} else {
				console.log(fmt.success("Reverse engineering completed!\n"));
			}

			// Show summary
			const summary = coreReverse.getSummary(result);
			console.log(summary);

			// Show output location
			if (!preview && !validateOnly && result.generatedFiles.length > 0) {
				const outputDir = options.outputDir || "flughafen";
				console.log(colors.info(`\n${icons.folder} Output written to: ${colors.highlight(outputDir)}/`));

				const workflowFiles = result.generatedFiles.filter((f) => f.type === "workflow");
				const actionFiles = result.generatedFiles.filter((f) => f.type === "local-action");

				if (workflowFiles.length > 0) {
					console.log(
						colors.secondary(
							`   ${icons.file} workflows/ (${workflowFiles.length} file${workflowFiles.length > 1 ? "s" : ""})`
						)
					);
				}
				if (actionFiles.length > 0) {
					console.log(
						colors.secondary(
							`   ${icons.file} actions/ (${actionFiles.length} file${actionFiles.length > 1 ? "s" : ""})`
						)
					);
				}

				// Show type definitions
				if (workflowFiles.length > 0) {
					console.log(colors.secondary(`   ${icons.file} flughafen-actions.d.ts (action types)`));
				}
			}

			// Show validation results prominently if there are errors or warnings
			if (result.errors.length > 0) {
				console.log(colors.error(`\n${icons.error} ${result.errors.length} validation error(s) found:`));
				for (const error of result.errors.slice(0, 5)) {
					// Show first 5 errors
					console.log(colors.error(`   ${icons.bullet} ${error.type} in ${basename(error.file)}: ${error.message}`));
				}
				if (result.errors.length > 5) {
					console.log(colors.error(`   ... and ${result.errors.length - 5} more errors`));
				}
			}

			if (result.warnings.length > 0) {
				console.log(colors.warning(`\n${icons.warning} ${result.warnings.length} validation warning(s) found:`));
				for (const warning of result.warnings.slice(0, 3)) {
					// Show first 3 warnings
					console.log(colors.warning(`   ${icons.bullet} ${warning}`));
				}
				if (result.warnings.length > 3) {
					console.log(colors.warning(`   ... and ${result.warnings.length - 3} more warnings`));
				}
			}

			// Show detailed results if verbose
			if (verbose) {
				console.log(colors.info(`\n${icons.section} Detailed Results:`));

				if (result.workflows.length > 0) {
					console.log(colors.info(`\n${icons.subsection} Workflows:`));
					for (const workflow of result.workflows) {
						console.log(`   ${icons.file} ${workflow.name || "Unnamed"} (${workflow.filePath})`);
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
					console.log(colors.info(`\n${icons.subsection} Local Actions:`));
					for (const action of result.localActions) {
						console.log(`   ${icons.folder} ${action.name} (${action.path})`);
						if (action.config) {
							console.log(`      ${icons.bullet} ${action.config.description}`);
							if (action.config.inputs) {
								console.log(`      ${icons.arrow} Inputs: ${Object.keys(action.config.inputs).length}`);
							}
							if (action.config.outputs) {
								console.log(`      ${icons.next} Outputs: ${Object.keys(action.config.outputs).length}`);
							}
							console.log(`      ${icons.bullet} Type: ${action.config.runs.using}`);
						}
					}
				}

				if (result.generatedFiles.length > 0) {
					console.log(colors.info(`\n${icons.subsection} Generated Files:`));
					for (const file of result.generatedFiles) {
						console.log(`   ${icons.file} ${file.type}: ${file.path}`);
					}
				}

				if (result.errors.length > 0) {
					console.log(colors.error(`\n${icons.error} Detailed Errors:`));
					for (const error of result.errors) {
						const location = error.line ? ` (line ${error.line}${error.column ? `, column ${error.column}` : ""})` : "";
						console.log(`   ${icons.warning} ${error.type} in ${basename(error.file)}${location}: ${error.message}`);
					}
				}

				if (result.warnings.length > 0) {
					console.log(colors.warning(`\n${icons.warning} Detailed Warnings:`));
					for (const warning of result.warnings) {
						console.log(`   ${icons.bullet} ${warning}`);
					}
				}
			}

			// Show next steps
			if (validateOnly) {
				if (result.errors.length === 0) {
					console.log(colors.success(`\n${icons.arrow} Next Steps:`));
					console.log("   1. Run without --validate-only to generate TypeScript files");
					console.log("   2. Use --validation-report for detailed validation information");
				} else {
					console.log(colors.error(`\n${icons.next} Fix validation errors before proceeding:`));
					console.log("   1. Review the validation errors above");
					console.log("   2. Fix YAML syntax and schema issues");
					console.log("   3. Run validation again to verify fixes");
					console.log("   4. Use --validation-report for detailed error information");
				}
			} else if (!preview && result.generatedFiles.length > 0) {
				console.log(colors.success(`\n${icons.arrow} Next Steps:`));
				console.log("   1. Review the generated TypeScript files");
				console.log("   2. Run 'flughafen build' to validate and generate YAML");
				console.log("   3. Test your workflows with the generated YAML");
			} else if (preview) {
				console.log(colors.info(`\n${icons.watch} Preview completed - run without --preview to generate files`));
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
				colors.error(`${icons.error} Reverse engineering failed:`),
				error instanceof Error ? error.message : String(error)
			);
		}
		throw error;
	}
}
