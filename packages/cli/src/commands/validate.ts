import { resolve } from "node:path";
import { validate as coreValidate, type ValidationResult } from "@flughafen/core";
import chalk from "chalk";
import { CliSpinners, Logger } from "../utils/spinner";

/**
 * CLI validate command options
 */
export interface ValidateOptions {
	/** Files to validate */
	files: string[];
	/** Input directory to search for workflow files */
	input: string;
	/** Strict validation mode */
	strict?: boolean;
	/** Output format */
	format?: "json" | "table";
	/** Silent mode */
	silent?: boolean;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * CLI wrapper for the validate operation
 */
export async function validate(options: ValidateOptions): Promise<void> {
	const { silent = false, verbose = false, files, input, format = "table", strict = false } = options;

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	// Determine files to validate
	const filesToValidate = files.length > 0 ? files : await findWorkflowFiles(input);

	if (filesToValidate.length === 0) {
		logger.warn("No workflow files found to validate");
		return;
	}

	logger.debug(`📄 Validating ${filesToValidate.length} files:`);
	if (verbose) {
		for (const file of filesToValidate) {
			logger.debug(`   - ${file}`);
		}
	}

	// Validate files using core validation system
	const result = await spinner.validate(
		async () => {
			return await coreValidate({
				files: filesToValidate,
				strict,
				verbose,
				silent,
			});
		},
		{
			loading: `Validating ${filesToValidate.length} workflow files...`,
			success: "Validation completed",
			error: "Validation failed",
		}
	);

	// Output results
	if (format === "json") {
		console.log(JSON.stringify(result, null, 2));
	} else {
		outputTableFormat(result.results, { silent, verbose });
	}

	// Exit with error code if validation failed
	if (!result.success) {
		logger.error("Validation failed");
		process.exit(1);
	} else {
		logger.success("All validations passed");
	}
}

/**
 * Find workflow files in a directory
 */
async function findWorkflowFiles(inputDir: string): Promise<string[]> {
	const { glob } = await import("glob");

	try {
		const files = await glob("**/*.{ts,js,mjs}", {
			cwd: inputDir,
			ignore: ["node_modules/**", "dist/**", "build/**"],
		});

		return files.map((file) => resolve(inputDir, file));
	} catch {
		// If input directory doesn't exist or glob fails, return empty array
		return [];
	}
}

/**
 * Output validation results in table format
 */
function outputTableFormat(results: ValidationResult[], options: { silent: boolean; verbose: boolean }): void {
	const { silent, verbose } = options;

	if (silent) return;

	console.log();
	console.log(chalk.bold("📋 Validation Results:"));
	console.log();

	for (const result of results) {
		const status = result.valid ? chalk.green("✅ PASS") : chalk.red("❌ FAIL");
		console.log(`${status} ${result.file}`);

		if (result.errors.length > 0) {
			console.log(chalk.red("  Errors:"));
			for (const error of result.errors) {
				console.log(chalk.red(`    • ${error.message}${error.rule ? ` (${error.rule})` : ""}`));
			}
		}

		if (result.warnings.length > 0 && verbose) {
			console.log(chalk.yellow("  Warnings:"));
			for (const warning of result.warnings) {
				console.log(chalk.yellow(`    • ${warning.message}${warning.rule ? ` (${warning.rule})` : ""}`));
			}
		}

		console.log();
	}

	// Summary
	const totalFiles = results.length;
	const validFiles = results.filter((r) => r.valid).length;
	const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

	console.log(chalk.bold("📊 Summary:"));
	console.log(`Files: ${validFiles}/${totalFiles} passed`);
	if (totalErrors > 0) {
		console.log(chalk.red(`Errors: ${totalErrors}`));
	}
	if (totalWarnings > 0 && verbose) {
		console.log(chalk.yellow(`Warnings: ${totalWarnings}`));
	}
}
