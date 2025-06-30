import chalk from "chalk";
import { synth as coresynth, type SynthOptions } from "flughafen";

/**
 * CLI wrapper for the synth operation
 */
export async function synth(options: SynthOptions): Promise<void> {
	const { silent = false, verbose = false, dryRun = false } = options;

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
