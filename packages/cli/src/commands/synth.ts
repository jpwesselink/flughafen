import chalk from "chalk";
import chokidar from "chokidar";
import { relative, dirname } from "node:path";
import { synth as coresynth, type SynthOptions } from "flughafen";

/**
 * CLI wrapper for the synth operation with optional watch mode
 */
export async function synth(options: SynthOptions & { watch?: boolean }): Promise<void> {
	const { silent = false, verbose = false, dryRun = false, watch = false } = options;

	if (watch) {
		return synthWatch(options);
	}

	try {
		if (!silent && !dryRun) {
			console.log(chalk.blue("🚀 Synthesizing workflow..."));
		}

		if (verbose) {
			console.log(chalk.gray("🔍 Validating workflow file..."));
		}

		const result = await coresynth(options);

		if (verbose) {
			console.log(chalk.green(`✅ File validation passed`));
		}

		if (dryRun) {
			// In dry-run mode, just output the workflow YAML to console
			if (!silent) {
				console.log(chalk.blue("\n📄 Generated workflow YAML:"));
				console.log(chalk.gray("─".repeat(50)));
			}
			console.log(result.workflow.content);

			if (Object.keys(result.actions).length > 0) {
				if (!silent) {
					console.log(chalk.blue("\n📦 Generated action files:"));
					console.log(chalk.gray("─".repeat(50)));
				}

				for (const [actionPath, actionContent] of Object.entries(result.actions)) {
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
		if (!silent) {
			console.log(chalk.red(`❌ Error: ${errorMessage}`));
		} else {
			console.error(chalk.red(`Error: ${errorMessage}`));
		}
		process.exit(1);
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
