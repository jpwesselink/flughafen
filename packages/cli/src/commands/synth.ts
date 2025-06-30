import chalk from "chalk";
import chokidar from "chokidar";
import { relative, dirname } from "node:path";
import { synth as coresynth, type SynthOptions } from "flughafen";
import { CliSpinners, Logger } from "../utils/spinner";

/**
 * CLI wrapper for the synth operation with optional watch mode
 */
export async function synth(options: SynthOptions & { watch?: boolean }): Promise<void> {
	const { silent = false, verbose = false, dryRun = false, watch = false } = options;

	if (watch) {
		return synthWatch(options);
	}

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	try {
		const result = await spinner.build(
			async () => {
				logger.debug("🔍 Validating workflow file...");
				return await coresynth(options);
			},
			{
				loading: dryRun ? "Validating workflow..." : "Synthesizing workflow...",
				success: dryRun ? "Workflow validated successfully" : "Workflow synthesized successfully",
				error: "Failed to synthesize workflow"
			}
		);

		if (dryRun) {
			// In dry-run mode, just output the workflow YAML to console
			logger.log(chalk.blue("\n📄 Generated workflow YAML:"));
			logger.log(chalk.gray("─".repeat(50)));
			logger.log(result.workflow.content);

			if (Object.keys(result.actions).length > 0) {
				logger.log(chalk.blue("\n📦 Generated action files:"));
				logger.log(chalk.gray("─".repeat(50)));

				for (const [actionPath, actionContent] of Object.entries(result.actions)) {
					logger.log(chalk.cyan(`\n→ ${actionPath}:`));
					logger.log(actionContent);
				}
			}

			logger.log(chalk.gray("─".repeat(50)));
			logger.info("Dry run - no files written to disk");
		} else {
			// Files were written
			const { summary, writeResult } = result;
			logger.complete("Synthesis complete!");
			logger.log(chalk.gray(`Generated ${summary.totalFiles} files (${summary.totalSize} bytes)`));

			if (writeResult) {
				logger.log(chalk.cyan(`📄 Workflow: ${writeResult.workflowPath}`));
				if (writeResult.actionPaths.length > 0) {
					logger.log(chalk.cyan(`📦 Actions: ${writeResult.actionPaths.length} files`));
					writeResult.actionPaths.forEach((actionPath) => {
						logger.debug(`   → ${actionPath}`);
					});
				}
			}
		}
	} catch (error) {
		// Error handling is done by the spinner, just rethrow
		throw error;
	}
}

/**
 * Watch mode for synth command
 */
async function synthWatch(options: SynthOptions & { watch?: boolean }): Promise<void> {
	const { silent = false, verbose = false, file } = options;

	if (!silent) {
		console.log(chalk.blue("👀 Starting synth watch mode..."));
	}

	const filePath = file;
	const watchDir = dirname(filePath);

	if (verbose) {
		console.log(chalk.gray(`📁 Watching: ${filePath}`));
	}

	// Initial synthesis
	if (!silent) {
		console.log(chalk.blue("🚀 Initial synthesis..."));
	}
	
	try {
		await synth({ ...options, watch: false });
	} catch (error) {
		if (!silent) {
			console.log(chalk.red(`❌ Initial synthesis failed: ${error instanceof Error ? error.message : error}`));
		}
	}

	// Set up file watcher
	const watcher = chokidar.watch(filePath, {
		persistent: true,
		ignoreInitial: true,
	});

	watcher.on('change', async () => {
		if (!silent) {
			console.log(chalk.blue(`🔄 File changed: ${relative(process.cwd(), filePath)}`));
		}

		try {
			await synth({ ...options, watch: false });
			if (!silent) {
				console.log(chalk.green(`✅ Re-synthesized: ${relative(process.cwd(), filePath)}`));
			}
		} catch (error) {
			if (!silent) {
				console.log(chalk.red(`❌ Synthesis failed: ${error instanceof Error ? error.message : error}`));
			}
		}
	});

	watcher.on('error', (error) => {
		if (!silent) {
			console.error(chalk.red(`👀 Watch error: ${error instanceof Error ? error.message : String(error)}`));
		}
	});

	if (!silent) {
		console.log(chalk.green("✅ Watch mode started"));
		console.log(chalk.gray("Press Ctrl+C to stop watching"));
	}

	// Set up graceful shutdown
	const shutdown = () => {
		if (!silent) {
			console.log(chalk.blue("\n🛑 Stopping watch mode..."));
		}
		watcher.close();
		if (!silent) {
			console.log(chalk.green("👋 Watch mode stopped"));
		}
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	// Keep the process alive
	return new Promise(() => {});
}
