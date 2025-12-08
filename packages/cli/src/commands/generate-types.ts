import { join } from "node:path";
import { generateTypes as coreGenerateTypes, type GenerateTypesOptions } from "@flughafen/core";
import chokidar from "chokidar";
import { CliSpinners, colors, icons, Logger } from "../utils";

/**
 * CLI wrapper for the generateTypes operation
 */
export async function generateTypes(options: GenerateTypesOptions & { watch?: boolean }): Promise<void> {
	const { silent = false, verbose = false, workflowDir, output, files, watch = false } = options;

	if (watch) {
		return generateTypesWatch(options);
	}

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	try {
		logger.debug(
			files && files.length > 0
				? `${icons.bullet} Processing files: ${files.join(", ")}`
				: `${icons.bullet} Scanning directory: ${workflowDir || process.cwd()}`
		);
		logger.debug(`${icons.bullet} Output file: ${output || "./flughafen-actions.d.ts"}`);

		const result = await spinner.build(() => coreGenerateTypes(options), {
			loading: "Generating types for GitHub Actions...",
			success: "Types generated successfully",
			error: "Failed to generate types",
		});

		if (!silent) {
			console.log(colors.success(`${icons.check} Type generation completed!\n`));
			console.log(`## Results:`);
			console.log(`   - Actions processed: ${result.actionsProcessed}`);
			console.log(`   - Schemas fetched: ${result.schemasFetched}`);
			console.log(`   - Interfaces generated: ${result.interfacesGenerated}`);
			console.log(`   - Types file: ${result.typesFilePath}`);

			if (result.failedActions.length > 0) {
				console.log(colors.warning(`   - Failed actions: ${result.failedActions.join(", ")}`));
			}

			if (verbose) {
				console.log("\n-- Generated Interfaces:");
				result.interfaces.forEach((iface: { actionName: string; interfaceName: string }) => {
					console.log(`   - ${iface.actionName} -> ${iface.interfaceName}`);
				});
			}

			console.log(colors.success(`\n${icons.check} Types are now available for type-safe .with() calls!`));
			console.log(colors.muted("No imports needed - TypeScript will automatically discover the types."));
		}
	} catch (error) {
		if (!silent) {
			console.error(
				colors.error(`${icons.cross} Type generation failed:`),
				error instanceof Error ? error.message : String(error)
			);
		}
		throw error;
	}
}

/**
 * Watch mode for generate types command
 */
async function generateTypesWatch(options: GenerateTypesOptions & { watch?: boolean }): Promise<void> {
	const { silent = false, verbose = false, workflowDir } = options;

	if (!silent) {
		console.log(colors.info("-- Starting types watch mode..."));
	}

	const watchPath = workflowDir || process.cwd();
	const watchPatterns = [join(watchPath, "**/*.ts"), join(watchPath, "**/*.js"), join(watchPath, "**/*.mjs")];

	if (verbose) {
		console.log(colors.muted(`${icons.bullet} Watching: ${watchPath}`));
	}

	// Initial type generation
	if (!silent) {
		console.log(colors.info("-- Initial type generation..."));
	}

	try {
		await generateTypes({ ...options, watch: false });
	} catch (error) {
		if (!silent) {
			console.log(
				colors.error(`${icons.cross} Initial type generation failed: ${error instanceof Error ? error.message : error}`)
			);
		}
	}

	// Set up file watcher
	const watcher = chokidar.watch(watchPatterns, {
		persistent: true,
		ignoreInitial: true,
		ignored: /(^|[/\\])\../, // ignore dotfiles
	});

	let isGenerating = false;

	const regenerateTypes = async () => {
		if (isGenerating) return;

		isGenerating = true;

		if (!silent) {
			console.log(colors.info("-> Workflow files changed, regenerating types..."));
		}

		try {
			await generateTypes({ ...options, watch: false });
			if (!silent) {
				console.log(colors.success(`${icons.check} Types regenerated successfully`));
			}
		} catch (error) {
			if (!silent) {
				console.log(
					colors.error(`${icons.cross} Type generation failed: ${error instanceof Error ? error.message : error}`)
				);
			}
		} finally {
			isGenerating = false;
		}
	};

	// Debounce changes to avoid regenerating too frequently
	let timeout: NodeJS.Timeout | null = null;
	const debouncedRegenerate = () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(regenerateTypes, 500); // 500ms debounce
	};

	watcher.on("add", debouncedRegenerate);
	watcher.on("change", debouncedRegenerate);
	watcher.on("unlink", debouncedRegenerate);

	watcher.on("error", (error) => {
		if (!silent) {
			console.error(
				colors.error(`${icons.cross} Watch error: ${error instanceof Error ? error.message : String(error)}`)
			);
		}
	});

	if (!silent) {
		console.log(colors.success(`${icons.check} Types watch mode started`));
		console.log(colors.muted("Press Ctrl+C to stop watching"));
	}

	// Set up graceful shutdown
	const shutdown = () => {
		if (!silent) {
			console.log(colors.info("\n-- Stopping types watch mode..."));
		}
		if (timeout) clearTimeout(timeout);
		watcher.close();
		if (!silent) {
			console.log(colors.success(`${icons.check} Types watch mode stopped`));
		}
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Keep the process alive
	return new Promise(() => {});
}
