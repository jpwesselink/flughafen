import chalk from "chalk";
import { type ProcessWorkflowOptions, processWorkflowFile, validateWorkflowFile } from "../../processing";

export interface SynthCommandOptions {
	file: string;
	dir?: string;
	output?: string;
	silent?: boolean;
	verbose?: boolean;
	dryRun?: boolean;
}

/**
 * Synth command: compile TypeScript, execute in sandbox, call synth(), write files
 */
export async function synthCommand(options: SynthCommandOptions): Promise<void> {
	try {
		const { file, dir, output, silent = false, verbose = false, dryRun = false } = options;

		if (!silent && !dryRun) {
			console.log(chalk.blue("🚀 Synthesizing workflow..."));
		}

		// Validate file first
		if (verbose) {
			console.log(chalk.gray("🔍 Validating workflow file..."));
		}

		const validation = await validateWorkflowFile(file);
		if (!validation.valid) {
			throw new Error(validation.error || "Workflow file validation failed");
		}

		if (verbose) {
			console.log(chalk.green(`✅ File validation passed (${validation.fileType})`));
		}

		// Pre-load flughafen module for sandbox
		let flughavenModule: any;
		try {
			// Use dynamic import to load our own module
			flughavenModule = await import("../../index.js");
		} catch (_error) {
			if (verbose) {
				console.log(chalk.yellow("⚠️  Could not pre-load flughafen module, using fallback"));
			}
		}

		// Process the workflow
		const processOptions: ProcessWorkflowOptions = {
			writeFiles: !dryRun,
			verbose,
			writeOptions: {
				// Don't set baseDir when using custom basePath to avoid double prefixing
				verbose,
			},
			synthOptions:
				dir || output
					? {
							basePath: dir || output,
						}
					: {},
			sandboxOptions: {
				additionalGlobals: flughavenModule ? { __preloadedFlughafen: flughavenModule } : {},
			},
		};

		const result = await processWorkflowFile(file, processOptions);

		if (dryRun) {
			// In dry-run mode, just output the workflow YAML to console
			if (!silent) {
				console.log(chalk.blue("\n📄 Generated workflow YAML:"));
				console.log(chalk.gray("─".repeat(50)));
			}
			console.log(result.synthResult.workflow.content);

			if (Object.keys(result.synthResult.actions).length > 0) {
				if (!silent) {
					console.log(chalk.blue("\n📦 Generated action files:"));
					console.log(chalk.gray("─".repeat(50)));
				}

				for (const [actionPath, actionContent] of Object.entries(result.synthResult.actions)) {
					if (!silent) {
						console.log(chalk.cyan(`\n→ ${actionPath}:`));
					}
					console.log(actionContent);
				}
			}

			if (!silent) {
				console.log(chalk.gray("─".repeat(50)));
				console.log(chalk.yellow("ℹ️  Dry run - no files written to disk"));
			}
		} else {
			// Files were written
			if (!silent) {
				const { summary, writeResult } = result;
				console.log(chalk.green("\n✅ Synthesis complete!"));
				console.log(chalk.gray(`Generated ${summary.totalFiles} files (${summary.totalSize} bytes)`));

				if (writeResult) {
					console.log(chalk.cyan(`📄 Workflow: ${writeResult.workflowPath}`));
					if (writeResult.actionPaths.length > 0) {
						console.log(chalk.cyan(`📦 Actions: ${writeResult.actionPaths.length} files`));
						if (verbose) {
							writeResult.actionPaths.forEach((actionPath) => {
								console.log(chalk.gray(`   → ${actionPath}`));
							});
						}
					}
				}
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (!options.silent) {
			console.log(chalk.red(`❌ Error: ${errorMessage}`));
		} else {
			console.error(chalk.red(`Error: ${errorMessage}`));
		}
		process.exit(1);
	}
}

// Type tests
if (import.meta.vitest) {
	const { describe, it, expectTypeOf } = await import("vitest");

	describe("CLI Command Types", () => {
		it("should export SynthCommandOptions correctly", () => {
			expectTypeOf<SynthCommandOptions>().toBeObject();
			expectTypeOf<SynthCommandOptions>().toHaveProperty("file");
			expectTypeOf<SynthCommandOptions>().toHaveProperty("dir");
			expectTypeOf<SynthCommandOptions>().toHaveProperty("output");
			expectTypeOf<SynthCommandOptions>().toHaveProperty("verbose");
		});
	});
}
