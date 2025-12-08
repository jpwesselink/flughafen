import { existsSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { validate as coreValidate, type ValidationResult, type ValidationRule } from "@flughafen/core";
import { CliSpinners, colors, icons, Logger } from "../utils";

/**
 * Available validation categories that can be ignored
 *
 * - schema: JSON schema validation (syntax, structure, required fields)
 * - security: Security checks (vulnerabilities, hardcoded secrets, injection risks)
 */
export const VALIDATION_RULES: ValidationRule[] = ["schema", "security"];

/**
 * Individual validators grouped by category
 */
export const VALIDATORS = {
	schema: [
		{ name: "Syntax", description: "Bracket matching, import patterns", tsOnly: true },
		{ name: "TypeScript", description: "Type checking via tsc", tsOnly: true },
		{ name: "Structure", description: "JSON Schema validation (AJV) - synths TS to YAML first", tsOnly: false },
	],
	security: [
		{
			name: "Security",
			description: "Hardcoded secrets, write-all perms, script injection via user input",
			tsOnly: false,
		},
		{ name: "Vulnerability", description: "GitHub Security Advisory Database (GHSA) lookup", tsOnly: false },
	],
} as const;

/**
 * CLI validate command options
 */
export interface ValidateOptions {
	/** Files to validate */
	files: string[];
	/** Input directory to search for workflow files */
	input: string;
	/** Rules to ignore */
	ignore?: string[];
	/** Output format */
	format?: "json" | "text";
	/** Silent mode */
	silent?: boolean;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * CLI wrapper for the validate operation
 */
export async function validate(options: ValidateOptions): Promise<void> {
	const { silent = false, verbose = false, files, input, format = "text", ignore = [] } = options;

	// Validate ignore rules
	const invalidRules = ignore.filter((r) => !VALIDATION_RULES.includes(r as ValidationRule));
	if (invalidRules.length > 0) {
		console.error(colors.error(`Invalid ignore rules: ${invalidRules.join(", ")}`));
		console.error(colors.warning(`Valid rules: ${VALIDATION_RULES.join(", ")}`));
		process.exit(1);
	}

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	// Show validators status in verbose mode
	if (verbose && !silent) {
		console.log(colors.header("Validators:"));
		for (const category of VALIDATION_RULES) {
			const categoryEnabled = !ignore.includes(category);
			const categoryIcon = categoryEnabled ? colors.success(icons.pass) : colors.muted("--");
			console.log(`  ${categoryIcon} ${colors.header(category)}`);

			for (const validator of VALIDATORS[category]) {
				const fileType = colors.muted(validator.tsOnly ? " [TS/JS]" : " [all]");
				if (categoryEnabled) {
					console.log(
						`      ${colors.success(icons.bullet)} ${validator.name}: ${colors.muted(validator.description)}${fileType}`
					);
				} else {
					console.log(
						`      ${colors.muted(icons.bullet)} ${colors.muted(`${validator.name}: ${validator.description}`)}${fileType}`
					);
				}
			}
		}
		console.log();
	}

	// Determine files to validate - expand directories passed as arguments
	let filesToValidate: string[] = [];
	if (files.length > 0) {
		for (const file of files) {
			const resolvedPath = resolve(file);
			if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
				// Expand directory to find workflow files
				const dirFiles = await findWorkflowFiles(resolvedPath);
				filesToValidate.push(...dirFiles);
			} else {
				filesToValidate.push(resolvedPath);
			}
		}
	} else {
		filesToValidate = await findWorkflowFiles(input);
	}

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
				ignore: ignore as ValidationRule[],
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

	// Determine base directory for relative paths
	const baseDir = files.length > 0 ? resolve(files[0]) : resolve(input);
	const baseDirResolved = existsSync(baseDir) && statSync(baseDir).isDirectory() ? baseDir : resolve(input);

	// Output results
	if (format === "json") {
		console.log(JSON.stringify(result, null, 2));
	} else {
		outputTextFormat(result.results, { silent, verbose, baseDir: baseDirResolved });
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
		const files = await glob("**/*.{ts,js,mjs,yml,yaml}", {
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
 * Truncate string to fit width, adding ellipsis if needed
 */
function truncate(str: string, maxWidth: number): string {
	if (str.length <= maxWidth) return str;
	return `${str.slice(0, maxWidth - 1)}…`;
}

/**
 * Strip ANSI codes from string to get visual length
 */
function stripAnsi(str: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes
	return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Pad string to width (accounting for ANSI codes)
 */
function pad(str: string, width: number, align: "left" | "right" | "center" = "left"): string {
	const visualLength = stripAnsi(str).length;
	const padding = width - visualLength;
	if (padding <= 0) return str;
	if (align === "right") return " ".repeat(padding) + str;
	if (align === "center") {
		const left = Math.floor(padding / 2);
		return " ".repeat(left) + str + " ".repeat(padding - left);
	}
	return str + " ".repeat(padding);
}

/**
 * Get relative path from base directory, or basename if no base
 */
function getDisplayPath(filePath: string, baseDir?: string): string {
	if (baseDir) {
		return relative(baseDir, filePath);
	}
	return filePath.split("/").pop() ?? filePath;
}

/**
 * Count errors by category
 */
function countByRule(errors: Array<{ rule?: string }>, rule: string): number {
	return errors.filter((e) => e.rule === rule).length;
}

/**
 * Output validation results in human-readable text format
 */
function outputTextFormat(
	results: ValidationResult[],
	options: { silent: boolean; verbose: boolean; baseDir?: string }
): void {
	const { silent, verbose, baseDir } = options;

	if (silent) return;

	const termWidth = process.stdout.columns ?? 80;

	// Column widths
	const schemaWidth = 6;
	const securityWidth = 8;
	const warningsWidth = 8;
	const timeWidth = verbose ? 6 : 0;
	const timeExtra = verbose ? timeWidth + 3 : 0; // width + separator + padding
	const fixedWidth = schemaWidth + securityWidth + warningsWidth + 13 + timeExtra; // separators + padding
	const fileWidth = Math.max(20, Math.min(50, termWidth - fixedWidth));

	// Header - with or without time column
	const timeDivider = verbose ? `┼${"─".repeat(timeWidth + 2)}` : "";
	const timeBorderTop = verbose ? `┬${"─".repeat(timeWidth + 2)}` : "";
	const timeBorderBottom = verbose ? `┴${"─".repeat(timeWidth + 2)}` : "";

	const divider = `├${"─".repeat(fileWidth + 2)}┼${"─".repeat(schemaWidth + 2)}┼${"─".repeat(securityWidth + 2)}┼${"─".repeat(warningsWidth + 2)}${timeDivider}┤`;
	const topBorder = `┌${"─".repeat(fileWidth + 2)}┬${"─".repeat(schemaWidth + 2)}┬${"─".repeat(securityWidth + 2)}┬${"─".repeat(warningsWidth + 2)}${timeBorderTop}┐`;
	const bottomBorder = `└${"─".repeat(fileWidth + 2)}┴${"─".repeat(schemaWidth + 2)}┴${"─".repeat(securityWidth + 2)}┴${"─".repeat(warningsWidth + 2)}${timeBorderBottom}┘`;

	const timeHeader = verbose ? ` │ ${colors.header(pad("Time", timeWidth))}` : "";

	console.log();
	console.log(colors.header("Validation Results"));
	console.log();
	console.log(topBorder);
	console.log(
		`│ ${colors.header(pad("File", fileWidth))} │ ${colors.header(pad("Schema", schemaWidth))} │ ${colors.header(pad("Security", securityWidth))} │ ${colors.header(pad("Warnings", warningsWidth))}${timeHeader} │`
	);
	console.log(divider);

	// Rows
	for (const result of results) {
		const fileName = truncate(getDisplayPath(result.file, baseDir), fileWidth);
		const schemaErrors = countByRule(result.errors, "schema");
		const securityErrors = countByRule(result.errors, "security");

		const schema = schemaErrors > 0 ? colors.error(String(schemaErrors)) : colors.success(icons.check);
		const security = securityErrors > 0 ? colors.error(String(securityErrors)) : colors.success(icons.check);
		const warnings = result.warnings.length > 0 ? colors.warning(String(result.warnings.length)) : colors.muted("0");
		const timeCell = verbose ? ` │ ${pad(colors.time(`${result.durationMs ?? 0}ms`), timeWidth, "right")}` : "";

		console.log(
			`│ ${pad(fileName, fileWidth)} │ ${pad(schema, schemaWidth, "center")} │ ${pad(security, securityWidth, "center")} │ ${pad(warnings, warningsWidth, "right")}${timeCell} │`
		);
	}

	console.log(bottomBorder);

	// Summary
	const totalFiles = results.length;
	const validFiles = results.filter((r) => r.valid).length;
	const totalSchemaErrors = results.reduce((sum, r) => sum + countByRule(r.errors, "schema"), 0);
	const totalSecurityErrors = results.reduce((sum, r) => sum + countByRule(r.errors, "security"), 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
	const totalTime = results.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);

	console.log();
	const summaryStatus =
		validFiles === totalFiles
			? colors.success(`${validFiles}/${totalFiles} passed`)
			: colors.error(`${validFiles}/${totalFiles} passed`);
	const schemaSum = totalSchemaErrors > 0 ? colors.error(`${totalSchemaErrors} schema`) : "";
	const securitySum = totalSecurityErrors > 0 ? colors.error(`${totalSecurityErrors} security`) : "";
	const warningsSum = totalWarnings > 0 ? colors.warning(`${totalWarnings} warnings`) : "";
	const timeSum = verbose ? colors.time(`${totalTime}ms`) : "";
	console.log(`${summaryStatus}  ${[schemaSum, securitySum, warningsSum, timeSum].filter(Boolean).join("  ")}`);

	// Details for failures
	const failures = results.filter((r) => !r.valid);
	if (failures.length > 0) {
		console.log();
		console.log(colors.header("Details:"));
		for (const result of failures) {
			console.log();
			console.log(colors.error(`${getDisplayPath(result.file, baseDir)}`));
			for (const error of result.errors) {
				console.log(
					colors.error(`  ${icons.bullet} ${error.message}${error.rule ? colors.muted(` (${error.rule})`) : ""}`)
				);
			}
		}
	}

	// Warnings (verbose only)
	if (verbose) {
		const withWarnings = results.filter((r) => r.warnings.length > 0);
		if (withWarnings.length > 0) {
			console.log();
			console.log(colors.header("Warnings:"));
			for (const result of withWarnings) {
				console.log();
				console.log(colors.warning(`${getDisplayPath(result.file, baseDir)}`));
				for (const warning of result.warnings) {
					console.log(
						colors.warning(
							`  ${icons.bullet} ${warning.message}${warning.rule ? colors.muted(` (${warning.rule})`) : ""}`
						)
					);
				}
			}
		}
	}
}
