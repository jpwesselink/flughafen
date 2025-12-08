import { join, resolve } from "node:path";
import {
	generateTypes as coreGenerateTypes,
	synth as coreSynth,
	validate as coreValidate,
	type ValidationRule,
} from "@flughafen/core";
import chokidar from "chokidar";
import { colors, icons, Logger } from "../utils";

/**
 * CLI build command options - combines validate, generate-types, and synth
 */
export interface BuildOptions {
	/** Files to build */
	files: string[];
	/** Input directory to search for workflow files */
	input: string;
	/** Output directory for generated workflows */
	output: string;
	/** Skip validation step */
	skipValidation?: boolean;
	/** Skip type generation step */
	skipTypes?: boolean;
	/** Skip synthesis step */
	skipSynth?: boolean;
	/** Validation rules to ignore */
	ignore?: string[];
	/** Silent mode */
	silent?: boolean;
	/** Verbose output */
	verbose?: boolean;
	/** Watch mode for continuous building */
	watch?: boolean;
	/** Dry run mode (don't write files) */
	dryRun?: boolean;
}

/**
 * Build result interface
 */
export interface BuildResult {
	/** Overall success status */
	success: boolean;
	/** Validation results */
	validation?: {
		filesValidated: number;
		errors: number;
		warnings: number;
		passed: boolean;
	};
	/** Type generation results */
	typeGeneration?: {
		actionsProcessed: number;
		interfacesGenerated: number;
		typesFilePath: string;
	};
	/** Synthesis results */
	synthesis?: {
		workflowsGenerated: number;
		actionsGenerated: number;
		outputPaths: string[];
	};
	/** Overall timing */
	timing: {
		total: number;
		validation?: number;
		typeGeneration?: number;
		synthesis?: number;
	};
}

/**
 * Unified build command that combines validation, type generation, and synthesis
 * This is the "one command to rule them all" for Flughafen workflows
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
	const {
		silent = false,
		verbose = false,
		files,
		input,
		skipValidation = false,
		skipTypes = false,
		skipSynth = false,
		ignore = [],
		watch = false,
		dryRun = false,
		output,
	} = options;

	if (watch) {
		return buildWatch(options);
	}

	const logger = new Logger(silent, verbose);
	const startTime = Date.now();

	const result: BuildResult = {
		success: false,
		timing: { total: 0 },
	};

	try {
		const inputDir = input;

		// Determine files to build
		const filesToBuild = files.length > 0 ? files : await findBuildableFiles(inputDir);

		if (filesToBuild.length === 0) {
			logger.warn("No workflow files found to build");
			result.success = true;
			result.timing.total = Date.now() - startTime;
			return result;
		}

		if (!silent) {
			console.log(colors.info("-- Building Flughafen workflows..."));
			console.log();
		}

		logger.debug(`${icons.bullet} Building ${filesToBuild.length} files:`);
		if (verbose) {
			for (const file of filesToBuild) {
				logger.debug(`   - ${file}`);
			}
		}

		// Step 1: Validation (if not skipped)
		if (!skipValidation) {
			const validationStart = Date.now();

			if (!silent) {
				console.log(colors.info("1. Validating workflows..."));
			}

			try {
				const validationResult = await coreValidate({
					files: filesToBuild,
					ignore: ignore as ValidationRule[],
					silent: true, // We'll handle output ourselves
					verbose: false,
				});

				result.validation = {
					filesValidated: validationResult.filesValidated,
					errors: validationResult.totalErrors,
					warnings: validationResult.totalWarnings,
					passed: validationResult.success,
				};

				if (!validationResult.success) {
					if (!silent) {
						console.log(colors.error(`${icons.cross} Validation failed!`));
						console.log();
						// Show validation errors
						for (const fileResult of validationResult.results) {
							if (!fileResult.valid) {
								console.log(colors.error(`   ${fileResult.file}:`));
								for (const error of fileResult.errors) {
									console.log(colors.error(`     ${icons.bullet} ${error.message}`));
								}
							}
						}
						console.log();
					}
					result.success = false;
					result.timing.total = Date.now() - startTime;
					return result;
				}

				result.timing.validation = Date.now() - validationStart;

				if (!silent) {
					console.log(colors.success(`${icons.check} Validation passed`));
				}
			} catch (error) {
				// Validation failed - decide whether to continue
				result.validation = {
					filesValidated: filesToBuild.length,
					errors: 1, // We don't have detailed counts, so approximate
					warnings: 0,
					passed: false,
				};

				result.timing.validation = Date.now() - validationStart;

				throw new Error(`Validation failed: ${error instanceof Error ? error.message : error}`);
			}
		}

		// Step 2: Type Generation (if not skipped)
		if (!skipTypes) {
			const typeGenStart = Date.now();

			if (!silent) {
				console.log(colors.info("2. Generating action types..."));
			}

			const typeResult = await coreGenerateTypes({
				files: filesToBuild,
				silent: true,
				verbose: false,
				githubToken: process.env.GITHUB_TOKEN,
			});

			result.typeGeneration = {
				actionsProcessed: typeResult.actionsProcessed,
				interfacesGenerated: typeResult.interfacesGenerated,
				typesFilePath: typeResult.typesFilePath,
			};

			result.timing.typeGeneration = Date.now() - typeGenStart;

			if (!silent) {
				console.log(colors.success(`${icons.check} Generated types for ${typeResult.actionsProcessed} actions`));
			}
		}

		// Step 3: Synthesis (if not skipped)
		if (!skipSynth) {
			const synthStart = Date.now();

			if (!silent) {
				console.log(colors.info("3. Synthesizing workflows..."));
			}

			const synthResults = [];
			for (const file of filesToBuild) {
				const synthResult = await coreSynth({
					file,
					output,
					silent: true,
					verbose: false,
					dryRun,
				});
				synthResults.push(synthResult);
			}

			// Count actual workflows generated (each file can export multiple workflows)
			const allWorkflowPaths: string[] = [];
			let totalWorkflows = 0;
			for (const r of synthResults) {
				// Use workflows array if available, otherwise count the single workflow
				const workflowCount = r.workflows?.length ?? 1;
				totalWorkflows += workflowCount;

				// Collect all workflow paths
				if (r.writeResult?.workflowPaths) {
					allWorkflowPaths.push(...r.writeResult.workflowPaths);
				} else if (r.writeResult?.workflowPath) {
					allWorkflowPaths.push(r.writeResult.workflowPath);
				}

				// In dry-run mode, print the generated YAML
				if (dryRun && !silent) {
					const workflows = r.workflows ?? [r.workflow];
					for (const workflow of workflows) {
						console.log();
						console.log(colors.info(`--- ${workflow.filename} ---`));
						console.log(workflow.content);
					}
				}
			}

			result.synthesis = {
				workflowsGenerated: totalWorkflows,
				actionsGenerated: synthResults.reduce((sum, r) => sum + Object.keys(r.actions).length, 0),
				outputPaths: allWorkflowPaths,
			};

			result.timing.synthesis = Date.now() - synthStart;

			if (!silent) {
				console.log(colors.success(`${icons.check} Generated ${totalWorkflows} workflow(s)`));
				// List each workflow that was generated
				for (const path of allWorkflowPaths) {
					console.log(colors.muted(`   -> ${path}`));
				}
			}
		}

		result.success = true;
		result.timing.total = Date.now() - startTime;

		// Final success message
		if (!silent) {
			console.log();
			console.log(colors.success(`${icons.check} Build completed successfully!`));
			console.log();
			console.log(colors.bold("## Build Summary:"));

			if (result.validation) {
				console.log(
					`   Validation: ${result.validation.passed ? icons.check : icons.cross} ${result.validation.filesValidated} files`
				);
			}

			if (result.typeGeneration) {
				console.log(`   Type generation: ${icons.check} ${result.typeGeneration.interfacesGenerated} interfaces`);
			}

			if (result.synthesis) {
				console.log(`   Synthesis: ${icons.check} ${result.synthesis.workflowsGenerated} workflows`);
			}

			console.log(`   Total time: ${result.timing.total}ms`);
		}

		return result;
	} catch (error) {
		result.success = false;
		result.timing.total = Date.now() - startTime;

		if (!silent) {
			console.error(
				colors.error(`${icons.cross} Build failed:`),
				error instanceof Error ? error.message : String(error)
			);
		}

		throw error;
	}
}

/**
 * Watch mode for continuous building
 */
async function buildWatch(options: BuildOptions): Promise<BuildResult> {
	const { silent = false, verbose = false, files, input } = options;

	if (!silent) {
		console.log(colors.info("-- Starting build watch mode..."));
		console.log(colors.muted("Press Ctrl+C to stop watching"));
	}

	const inputDir = input;

	// Determine what to watch: specific files or input directory
	let watchPatterns: string[];
	if (files && files.length > 0) {
		// Watch the specific files provided
		watchPatterns = files.map((f) => resolve(f));
		if (verbose) {
			console.log(colors.muted(`${icons.bullet} Watching files: ${watchPatterns.join(", ")}`));
		}
	} else {
		// Watch the input directory
		const resolvedInputDir = resolve(inputDir);
		watchPatterns = [
			join(resolvedInputDir, "**/*.ts"),
			join(resolvedInputDir, "**/*.js"),
			join(resolvedInputDir, "**/*.mjs"),
		];
		if (verbose) {
			console.log(colors.muted(`${icons.bullet} Watching directory: ${resolvedInputDir}`));
		}
	}

	// Initial build
	if (!silent) {
		console.log(colors.info("-- Initial build..."));
	}

	let lastResult: BuildResult;
	try {
		lastResult = await build({ ...options, watch: false });
	} catch (error) {
		if (!silent) {
			console.log(
				colors.error(`${icons.cross} Initial build failed: ${error instanceof Error ? error.message : error}`)
			);
		}
		lastResult = {
			success: false,
			timing: { total: 0 },
		};
	}

	// Set up file watcher
	const watcher = chokidar.watch(watchPatterns, {
		persistent: true,
		ignoreInitial: true,
		ignored: [/node_modules/, /dist/, /build/, /\.d\.ts$/],
	});

	// Wait for watcher to be ready before declaring ready
	await new Promise<void>((resolve) => {
		watcher.on("ready", () => {
			resolve();
		});
	});

	let isBuilding = false;

	const rebuild = async () => {
		if (isBuilding) return;

		isBuilding = true;

		if (!silent) {
			console.log(colors.info("-> Files changed, rebuilding..."));
		}

		try {
			lastResult = await build({ ...options, watch: false });
			if (!silent) {
				if (lastResult.success) {
					console.log(colors.success(`${icons.check} Build completed successfully`));
				} else {
					console.log(colors.warning(`${icons.warning} Build completed with errors`));
				}
			}
		} catch (error) {
			if (!silent) {
				console.log(colors.error(`${icons.cross} Build failed: ${error instanceof Error ? error.message : error}`));
			}
			lastResult = {
				success: false,
				timing: { total: 0 },
			};
		} finally {
			isBuilding = false;
		}
	};

	// Debounce changes to avoid rebuilding too frequently
	let timeout: NodeJS.Timeout | null = null;
	const debouncedRebuild = () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(rebuild, 500); // 500ms debounce
	};

	watcher.on("add", debouncedRebuild);
	watcher.on("change", debouncedRebuild);
	watcher.on("unlink", debouncedRebuild);

	watcher.on("error", (error) => {
		if (!silent) {
			console.error(
				colors.error(`${icons.cross} Watch error: ${error instanceof Error ? error.message : String(error)}`)
			);
		}
	});

	if (!silent) {
		console.log(colors.success(`${icons.check} Watching for changes...`));
	}

	// Keep process alive
	return new Promise(() => {
		// Process stays alive due to chokidar watcher
	}) as unknown as Promise<BuildResult>;
}

/**
 * Find buildable workflow files
 */
async function findBuildableFiles(inputDir: string): Promise<string[]> {
	const { glob } = await import("glob");

	try {
		const files = await glob("**/*.{ts,js,mjs}", {
			cwd: inputDir,
			ignore: ["node_modules/**", "dist/**", "build/**", "*.d.ts"],
		});

		return files.map((file) => resolve(inputDir, file));
	} catch {
		return [];
	}
}
