import chalk from "chalk";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import { loadConfig } from "../utils/config";
import { CliSpinners, Logger } from "../utils/spinner";
import type { WorkflowScanner } from "flughafen";

/**
 * CLI validate command options
 */
export interface ValidateOptions {
	/** Files to validate */
	files: string[];
	/** Strict validation mode */
	strict?: boolean;
	/** Output format */
	format?: "json" | "table";
	/** Auto-fix common issues */
	fix?: boolean;
	/** Silent mode */
	silent?: boolean;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
	file: string;
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	fixed?: boolean;
}

/**
 * Validation error interface
 */
export interface ValidationError {
	path: string;
	message: string;
	severity: "error";
	rule?: string;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
	path: string;
	message: string;
	severity: "warning";
	rule?: string;
}

/**
 * CLI wrapper for the validate operation
 */
export async function validate(options: ValidateOptions): Promise<void> {
	const { silent = false, verbose = false, files, format = "table", strict = false, fix = false } = options;

	const spinner = new CliSpinners(silent);
	const logger = new Logger(silent, verbose);

	try {
		// Load configuration with spinner
		const config = await spinner.file(
			() => loadConfig(),
			{
				loading: "Loading configuration...",
				success: "Configuration loaded",
				error: "Failed to load configuration"
			}
		);

		const isStrictMode = strict || config.validation?.strict || false;

		// Determine files to validate
		const filesToValidate = files.length > 0 ? files : await findWorkflowFiles(config.input);

		if (filesToValidate.length === 0) {
			logger.warn("No workflow files found to validate");
			return;
		}

		logger.debug(`📄 Validating ${filesToValidate.length} files:`);
		if (verbose) {
			filesToValidate.forEach(file => logger.debug(`   - ${file}`));
		}

		// Validate files with spinner
		const results = await spinner.validate(
			async () => {
				const validationResults: ValidationResult[] = [];
				for (const file of filesToValidate) {
					const result = await validateFile(file, { strict: isStrictMode, fix, verbose, silent });
					validationResults.push(result);
				}
				return validationResults;
			},
			{
				loading: `Validating ${filesToValidate.length} workflow files...`,
				success: "Validation completed",
				error: "Validation failed"
			}
		);

		// Output results
		if (format === "json") {
			console.log(JSON.stringify(results, null, 2));
		} else {
			outputTableFormat(results, { silent, verbose });
		}

		// Exit with error code if validation failed
		const hasErrors = results.some(r => !r.valid);
		if (hasErrors) {
			logger.error("Validation failed");
			process.exit(1);
		} else {
			logger.success("All validations passed");
		}
	} catch (error) {
		// Error handling is done by the spinner, just rethrow
		throw error;
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
		
		return files.map(file => resolve(inputDir, file));
	} catch {
		// If input directory doesn't exist or glob fails, return empty array
		return [];
	}
}

/**
 * Validate a single workflow file
 */
async function validateFile(
	filePath: string, 
	options: { strict: boolean; fix: boolean; verbose: boolean; silent: boolean }
): Promise<ValidationResult> {
	const { strict, fix, verbose, silent } = options;
	const result: ValidationResult = {
		file: filePath,
		valid: true,
		errors: [],
		warnings: [],
	};

	try {
		// Check if file exists
		if (!existsSync(filePath)) {
			result.valid = false;
			result.errors.push({
				path: filePath,
				message: "File does not exist",
				severity: "error",
				rule: "file-exists",
			});
			return result;
		}

		if (verbose && !silent) {
			console.log(chalk.gray(`   Validating ${filePath}...`));
		}

		// Read and parse file content
		const content = await readFile(filePath, "utf-8");
		
		// Basic syntax validation
		validateSyntax(content, result);
		
		// Workflow structure validation
		await validateWorkflowStructure(filePath, content, result, { strict });
		
		// Security validation
		validateSecurity(content, result);
		
		// Best practices validation
		validateBestPractices(content, result, { strict });

		// Apply fixes if requested
		if (fix && (result.errors.length > 0 || result.warnings.length > 0)) {
			// Note: Auto-fix functionality would be implemented here
			// For now, just mark as potentially fixable
			result.fixed = false;
		}

	} catch (error) {
		result.valid = false;
		result.errors.push({
			path: filePath,
			message: error instanceof Error ? error.message : "Unknown validation error",
			severity: "error",
			rule: "validation-error",
		});
	}

	// Determine if validation passed
	result.valid = result.errors.length === 0;

	return result;
}

/**
 * Validate TypeScript/JavaScript syntax
 */
function validateSyntax(content: string, result: ValidationResult): void {
	try {
		// Basic check for common syntax issues
		if (content.trim().length === 0) {
			result.warnings.push({
				path: result.file,
				message: "File is empty",
				severity: "warning",
				rule: "empty-file",
			});
			return;
		}

		// Check for basic TypeScript/JavaScript patterns
		if (!content.includes("createWorkflow") && !content.includes("export")) {
			result.warnings.push({
				path: result.file,
				message: "File does not appear to contain a workflow definition",
				severity: "warning",
				rule: "no-workflow-export",
			});
		}

		// Check for default export
		if (!content.includes("export default")) {
			result.warnings.push({
				path: result.file,
				message: "Workflow file should have a default export",
				severity: "warning",
				rule: "no-default-export",
			});
		}

	} catch (error) {
		result.errors.push({
			path: result.file,
			message: `Syntax validation failed: ${error instanceof Error ? error.message : error}`,
			severity: "error",
			rule: "syntax-error",
		});
	}
}

/**
 * Validate workflow structure and configuration
 */
async function validateWorkflowStructure(
	filePath: string,
	content: string,
	result: ValidationResult,
	options: { strict: boolean }
): Promise<void> {
	try {
		// Check for required workflow elements
		if (!content.includes(".name(")) {
			result.warnings.push({
				path: filePath,
				message: "Workflow should have a name",
				severity: "warning",
				rule: "workflow-name",
			});
		}

		if (!content.includes(".on(")) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have trigger events",
				severity: "error",
				rule: "workflow-triggers",
			});
		}

		if (!content.includes(".job(")) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have at least one job",
				severity: "error",
				rule: "workflow-jobs",
			});
		}

		// Strict mode validations
		if (options.strict) {
			if (!content.includes(".runsOn(")) {
				result.errors.push({
					path: filePath,
					message: "All jobs must specify runs-on in strict mode",
					severity: "error",
					rule: "strict-runs-on",
				});
			}
		}

	} catch (error) {
		result.errors.push({
			path: filePath,
			message: `Structure validation failed: ${error instanceof Error ? error.message : error}`,
			severity: "error",
			rule: "structure-error",
		});
	}
}

/**
 * Validate security best practices
 */
function validateSecurity(content: string, result: ValidationResult): void {
	try {
		// Check for hardcoded secrets
		const secretPatterns = [
			/password\s*[:=]\s*['"]\w+['"]/i,
			/api[_-]?key\s*[:=]\s*['"]\w+['"]/i,
			/secret\s*[:=]\s*['"]\w+['"]/i,
			/token\s*[:=]\s*['"]\w+['"]/i,
		];

		for (const pattern of secretPatterns) {
			if (pattern.test(content)) {
				result.errors.push({
					path: result.file,
					message: "Potential hardcoded secret detected",
					severity: "error",
					rule: "hardcoded-secrets",
				});
				break;
			}
		}

		// Check for overly permissive permissions
		if (content.includes("permissions: 'write-all'") || content.includes("permissions: write-all")) {
			result.warnings.push({
				path: result.file,
				message: "Overly permissive workflow permissions detected",
				severity: "warning",
				rule: "permissive-permissions",
			});
		}

	} catch (error) {
		result.errors.push({
			path: result.file,
			message: `Security validation failed: ${error instanceof Error ? error.message : error}`,
			severity: "error",
			rule: "security-error",
		});
	}
}

/**
 * Validate best practices
 */
function validateBestPractices(content: string, result: ValidationResult, options: { strict: boolean }): void {
	try {
		// Check for step names
		const stepMatches = content.match(/\.step\(/g);
		const namedStepMatches = content.match(/\.step\([^)]*\.name\(/g);
		
		if (stepMatches && stepMatches.length > 0) {
			if (!namedStepMatches || namedStepMatches.length < stepMatches.length) {
				if (options.strict) {
					result.errors.push({
						path: result.file,
						message: "All steps should have descriptive names",
						severity: "error",
						rule: "step-names",
					});
				} else {
					result.warnings.push({
						path: result.file,
						message: "All steps should have descriptive names",
						severity: "warning",
						rule: "step-names",
					});
				}
			}
		}

		// Check for action versions
		const actionMatches = content.match(/\.uses\(['"]([^'"]+)['"],?\s*action/g);
		if (actionMatches) {
			for (const match of actionMatches) {
				if (!match.includes("@v") && !match.includes("@main")) {
					result.warnings.push({
						path: result.file,
						message: "Actions should specify version tags",
						severity: "warning",
						rule: "action-versions",
					});
					break;
				}
			}
		}

	} catch (error) {
		result.errors.push({
			path: result.file,
			message: `Best practices validation failed: ${error instanceof Error ? error.message : error}`,
			severity: "error",
			rule: "best-practices-error",
		});
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

		if (result.fixed) {
			console.log(chalk.blue("    ✨ Auto-fixed issues"));
		}

		console.log();
	}

	// Summary
	const totalFiles = results.length;
	const validFiles = results.filter(r => r.valid).length;
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