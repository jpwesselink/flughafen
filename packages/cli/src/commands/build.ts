import { resolve } from "node:path";
import chalk from "chalk";
import { generateTypes as coreGenerateTypes, synth as coreSynth, validate as coreValidate } from "flughafen";
import { loadConfig } from "../utils/config";
import { CliSpinners, Logger } from "../utils/spinner";

/**
 * CLI build command options - combines validate, generate-types, and synth
 */
export interface BuildOptions {
	/** Files to build */
	files: string[];
	/** Output directory for generated workflows */
	output?: string;
	/** Skip validation step */
	skipValidation?: boolean;
	/** Skip type generation step */
	skipTypes?: boolean;
	/** Skip synthesis step */
	skipSynth?: boolean;
	/** Strict validation mode */
	strict?: boolean;
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
		skipValidation = false,
		skipTypes = false,
		skipSynth = false,
		strict = false,
		watch = false,
		dryRun = false,
		output,
	} = options;

	if (watch) {
		return buildWatch(options);
	}

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);
	const startTime = Date.now();

	const result: BuildResult = {
		success: false,
		timing: { total: 0 },
	};

	try {
		// Load configuration
		const config = await spinner.file(() => loadConfig(), {
			loading: "Loading configuration...",
			success: "Configuration loaded",
			error: "Failed to load configuration",
		});

		// Determine files to build
		const filesToBuild = files.length > 0 ? files : await findBuildableFiles(config.input);

		if (filesToBuild.length === 0) {
			logger.warn("No workflow files found to build");
			result.success = true;
			result.timing.total = Date.now() - startTime;
			return result;
		}

		if (!silent) {
			console.log(chalk.blue("🏗️  Building Flughafen workflows..."));
			console.log();
		}

		logger.debug(`📄 Building ${filesToBuild.length} files:`);
		if (verbose) {
			filesToBuild.forEach((file) => logger.debug(`   - ${file}`));
		}

		// Step 1: Validation (if not skipped)
		if (!skipValidation) {
			const validationStart = Date.now();

			if (!silent) {
				console.log(chalk.blue("1️⃣  Validating workflows..."));
			}

			try {
				const validationResult = await coreValidate({
					files: filesToBuild,
					strict,
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
						console.log(chalk.red("❌ Validation failed!"));
						console.log();
						// Show validation errors
						for (const fileResult of validationResult.results) {
							if (!fileResult.valid) {
								console.log(chalk.red(`   ${fileResult.file}:`));
								for (const error of fileResult.errors) {
									console.log(chalk.red(`     • ${error.message}`));
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
					console.log(chalk.green("✅ Validation passed"));
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

				if (strict) {
					throw new Error(`Validation failed: ${error instanceof Error ? error.message : error}`);
				} else {
					logger.warn("Validation failed but continuing due to non-strict mode");
				}
			}
		}

		// Step 2: Type Generation (if not skipped)
		if (!skipTypes) {
			const typeGenStart = Date.now();

			if (!silent) {
				console.log(chalk.blue("2️⃣  Generating action types..."));
			}

			const typeResult = await coreGenerateTypes({
				files: filesToBuild,
				silent: true,
				verbose: false,
			});

			result.typeGeneration = {
				actionsProcessed: typeResult.actionsProcessed,
				interfacesGenerated: typeResult.interfacesGenerated,
				typesFilePath: typeResult.typesFilePath,
			};

			result.timing.typeGeneration = Date.now() - typeGenStart;

			if (!silent) {
				console.log(chalk.green(`✅ Generated types for ${typeResult.actionsProcessed} actions`));
			}
		}

		// Step 3: Synthesis (if not skipped)
		if (!skipSynth) {
			const synthStart = Date.now();

			if (!silent) {
				console.log(chalk.blue("3️⃣  Synthesizing workflows..."));
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

			result.synthesis = {
				workflowsGenerated: synthResults.length,
				actionsGenerated: synthResults.reduce((sum, r) => sum + Object.keys(r.actions).length, 0),
				outputPaths: synthResults.map((r) => r.writeResult?.workflowPath).filter(Boolean) as string[],
			};

			result.timing.synthesis = Date.now() - synthStart;

			if (!silent) {
				console.log(chalk.green(`✅ Generated ${synthResults.length} workflow(s)`));
			}
		}

		result.success = true;
		result.timing.total = Date.now() - startTime;

		// Final success message
		if (!silent) {
			console.log();
			console.log(chalk.green("🎉 Build completed successfully!"));
			console.log();
			console.log(chalk.bold("📊 Build Summary:"));

			if (result.validation) {
				console.log(
					`   Validation: ${result.validation.passed ? "✅" : "❌"} ${result.validation.filesValidated} files`
				);
			}

			if (result.typeGeneration) {
				console.log(`   Type generation: ✅ ${result.typeGeneration.interfacesGenerated} interfaces`);
			}

			if (result.synthesis) {
				console.log(`   Synthesis: ✅ ${result.synthesis.workflowsGenerated} workflows`);
			}

			console.log(`   Total time: ${result.timing.total}ms`);
		}

		return result;
	} catch (error) {
		result.success = false;
		result.timing.total = Date.now() - startTime;

		if (!silent) {
			console.error(chalk.red("❌ Build failed:"), error instanceof Error ? error.message : String(error));
		}

		throw error;
	}
}

/**
 * Watch mode for continuous building
 */
async function buildWatch(options: BuildOptions): Promise<BuildResult> {
	const { silent = false } = options;

	if (!silent) {
		console.log(chalk.blue("👀 Starting build watch mode..."));
		console.log(chalk.gray("Press Ctrl+C to stop watching"));
	}

	// This would use chokidar similar to generate-types watch mode
	// For now, just run once and return
	const result = await build({ ...options, watch: false });

	// Keep process alive in watch mode
	return new Promise(() => {
		// TODO: Implement file watching with chokidar
		// Watch TypeScript files and re-run build on changes
	}) as any;
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
