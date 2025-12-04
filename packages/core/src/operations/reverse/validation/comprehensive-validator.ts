import yaml from "yaml";
import { type ActionValidationResult, ExternalActionValidator } from "./external-action-validator";
import { GitHubSchemaValidator, type SchemaValidationResult } from "./github-schema-validator";
import { YamlSyntaxValidator, type YamlValidationResult } from "./yaml-syntax-validator";

export interface ComprehensiveValidationResult {
	valid: boolean;
	yamlErrors: YamlValidationResult["errors"];
	schemaErrors: SchemaValidationResult["errors"];
	actionErrors: ActionValidationResult["errors"];
	warnings: SchemaValidationResult["warnings"];
	actionWarnings: ActionValidationResult["warnings"];
	parsedWorkflow?: Record<string, unknown>;
}

export interface ValidationOptions {
	/** Skip YAML syntax validation */
	skipYamlValidation?: boolean;
	/** Skip GitHub schema validation */
	skipSchemaValidation?: boolean;
	/** Skip external action validation */
	skipActionValidation?: boolean;
	/** Continue validation even if YAML parsing fails */
	continueOnYamlError?: boolean;
}

export class ComprehensiveValidator {
	private yamlValidator: YamlSyntaxValidator;
	private schemaValidator: GitHubSchemaValidator;
	private actionValidator: ExternalActionValidator;

	constructor() {
		this.yamlValidator = new YamlSyntaxValidator();
		this.schemaValidator = new GitHubSchemaValidator();
		this.actionValidator = new ExternalActionValidator();
	}

	/**
	 * Performs comprehensive validation of a YAML workflow file
	 * Returns validation results and parsed workflow if successful
	 */
	async validateWorkflow(content: string, options: ValidationOptions = {}): Promise<ComprehensiveValidationResult> {
		const result: ComprehensiveValidationResult = {
			valid: true,
			yamlErrors: [],
			schemaErrors: [],
			actionErrors: [],
			warnings: [],
			actionWarnings: [],
		};

		// Phase 1: YAML Syntax Validation
		if (!options.skipYamlValidation) {
			const yamlResult = this.yamlValidator.validateSyntax(content);
			result.yamlErrors = yamlResult.errors;

			if (!yamlResult.valid) {
				result.valid = false;
				if (!options.continueOnYamlError) {
					return result;
				}
			}
		}

		// Parse YAML if syntax validation passed or if we're continuing despite errors
		let parsedWorkflow: Record<string, unknown>;
		try {
			parsedWorkflow = yaml.parse(content);
			result.parsedWorkflow = parsedWorkflow;
		} catch (error) {
			// If we reach here, either YAML validation was skipped or continueOnYamlError is true
			if (result.yamlErrors.length === 0) {
				// YAML validation was skipped, so add the error here
				result.yamlErrors.push({
					line: 1,
					column: 1,
					message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
					snippet: content.split("\n").slice(0, 3).join("\n"),
				});
			}
			result.valid = false;
			return result;
		}

		// Phase 2: GitHub Schema Validation
		if (!options.skipSchemaValidation && parsedWorkflow !== undefined) {
			const schemaResult = this.schemaValidator.validateWorkflowSchema(parsedWorkflow);
			result.schemaErrors = schemaResult.errors;
			result.warnings = schemaResult.warnings;

			if (!schemaResult.valid) {
				result.valid = false;
			}
		}

		// Phase 3: External Action Validation
		if (!options.skipActionValidation && parsedWorkflow !== undefined) {
			const actionResult = await this.actionValidator.validateWorkflowActions(parsedWorkflow);
			result.actionErrors = actionResult.errors;
			result.actionWarnings = actionResult.warnings;

			if (!actionResult.valid) {
				result.valid = false;
			}
		}

		return result;
	}

	/**
	 * Validates a workflow file from disk
	 */
	async validateWorkflowFile(
		filePath: string,
		options: ValidationOptions = {}
	): Promise<ComprehensiveValidationResult & { filePath: string }> {
		const { readFile } = await import("node:fs/promises");

		try {
			const content = await readFile(filePath, "utf-8");
			const result = await this.validateWorkflow(content, options);
			return { ...result, filePath };
		} catch (error) {
			return {
				filePath,
				valid: false,
				yamlErrors: [
					{
						line: 1,
						column: 1,
						message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
						snippet: "",
					},
				],
				schemaErrors: [],
				actionErrors: [],
				warnings: [],
				actionWarnings: [],
			};
		}
	}

	/**
	 * Formats validation errors into a human-readable report
	 */
	formatValidationReport(result: ComprehensiveValidationResult, filePath?: string): string {
		const lines: string[] = [];
		const fileHeader = filePath ? ` in ${filePath}` : "";

		if (result.valid) {
			lines.push(`✅ Validation passed${fileHeader}`);
			if (result.warnings.length > 0) {
				lines.push(`\n⚠️  ${result.warnings.length} warning(s):`);
				for (const warning of result.warnings) {
					lines.push(`   • ${warning.path}: ${warning.message}`);
					if (warning.suggestion) {
						lines.push(`     Suggestion: ${warning.suggestion}`);
					}
				}
			}
			return lines.join("\n");
		}

		lines.push(`❌ Validation failed${fileHeader}`);

		// YAML syntax errors
		if (result.yamlErrors.length > 0) {
			lines.push("\n🔧 YAML Syntax Errors:");
			for (const error of result.yamlErrors) {
				lines.push(`   Line ${error.line}, Column ${error.column}: ${error.message}`);
				if (error.snippet) {
					lines.push("   ```");
					lines.push(
						error.snippet
							.split("\n")
							.map((line) => `   ${line}`)
							.join("\n")
					);
					lines.push("   ```");
				}
			}
		}

		// Schema validation errors
		if (result.schemaErrors.length > 0) {
			lines.push("\n📋 Schema Validation Errors:");
			for (const error of result.schemaErrors) {
				lines.push(`   ${error.path}: ${error.message}`);
				lines.push(`     Expected: ${error.expected}`);
				lines.push(`     Actual: ${error.actual}`);
			}
		}

		// Action validation errors
		if (result.actionErrors.length > 0) {
			lines.push("\n🔧 Action Validation Errors:");
			for (const error of result.actionErrors) {
				lines.push(`   ${error.location}: ${error.message}`);
				lines.push(`     Action: ${error.action}`);
				if (error.suggestion) {
					lines.push(`     Suggestion: ${error.suggestion}`);
				}
			}
		}

		// Warnings
		if (result.warnings.length > 0) {
			lines.push("\n⚠️  Schema Warnings:");
			for (const warning of result.warnings) {
				lines.push(`   ${warning.path}: ${warning.message}`);
				if (warning.suggestion) {
					lines.push(`     Suggestion: ${warning.suggestion}`);
				}
			}
		}

		// Action warnings
		if (result.actionWarnings.length > 0) {
			lines.push("\n⚠️  Action Warnings:");
			for (const warning of result.actionWarnings) {
				lines.push(`   ${warning.location}: ${warning.message}`);
				lines.push(`     Action: ${warning.action}`);
				if (warning.suggestion) {
					lines.push(`     Suggestion: ${warning.suggestion}`);
				}
			}
		}

		return lines.join("\n");
	}
}
