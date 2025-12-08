import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { GitHubSchemaValidator } from "../../operations/reverse/validation/github-schema-validator";
import { synth } from "../../operations/synth";
import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

/**
 * Workflow and Action structure validator
 * Uses JSON Schema validation (AJV) for YAML, TypeScript files, and action definitions
 * - YAML workflows: Parse and validate against workflow schema
 * - YAML actions (action.yml/action.yaml): Parse and validate against action schema
 * - TypeScript: Synth to YAML, then validate the output
 */
export class StructureValidator {
	private schemaValidator = new GitHubSchemaValidator();

	async validate(context: ValidationContext, result: WorkflowValidationResult): Promise<void> {
		const { content, filePath, options } = context;
		const isYaml = filePath.endsWith(".yml") || filePath.endsWith(".yaml");
		const isAction = this.isActionFile(filePath);

		try {
			if (isYaml) {
				if (isAction) {
					this.validateAction(content, filePath, result);
				} else {
					this.validateYaml(content, filePath, options, result);
				}
			} else {
				await this.validateTypeScript(filePath, result);
			}
		} catch (error) {
			result.errors.push({
				path: filePath,
				message: `Structure validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "schema",
			});
		}
	}

	/**
	 * Check if a file is a GitHub Action definition (action.yml or action.yaml)
	 */
	private isActionFile(filePath: string): boolean {
		const filename = basename(filePath).toLowerCase();
		return filename === "action.yml" || filename === "action.yaml";
	}

	/**
	 * Validate YAML workflow using JSON Schema (AJV) and YamlAnalyzer
	 */
	private validateYaml(
		content: string,
		filePath: string,
		_options: ValidationContext["options"],
		result: WorkflowValidationResult
	): void {
		// First, parse YAML
		let workflow: unknown;
		try {
			workflow = parseYaml(content);
		} catch {
			// YAML parse error - skip structure validation (handled by SyntaxValidator)
			return;
		}

		// Run JSON Schema validation using AJV
		const schemaResult = this.schemaValidator.validateWorkflowSchema(workflow);

		// Add schema validation errors
		for (const error of schemaResult.errors) {
			result.errors.push({
				path: filePath,
				message: `${error.path}: ${error.message}`,
				severity: "error",
				rule: "schema",
			});
		}

		// Add schema validation warnings
		for (const warning of schemaResult.warnings) {
			result.warnings.push({
				path: filePath,
				message: `${warning.path}: ${warning.message}`,
				severity: "warning",
				rule: "schema",
			});
		}

		// Also check if name is present (JSON Schema doesn't require it, but it's good practice)
		if (workflow && typeof workflow === "object" && !("name" in workflow)) {
			result.warnings.push({
				path: filePath,
				message: "Workflow should have a name",
				severity: "warning",
				rule: "schema",
			});
		}
	}

	/**
	 * Validate GitHub Action definition (action.yml/action.yaml) using JSON Schema
	 */
	private validateAction(content: string, filePath: string, result: WorkflowValidationResult): void {
		// First, parse YAML
		let action: unknown;
		try {
			action = parseYaml(content);
		} catch {
			// YAML parse error - skip structure validation (handled by SyntaxValidator)
			return;
		}

		// Run JSON Schema validation using AJV against action schema
		const schemaResult = this.schemaValidator.validateActionSchema(action);

		// Add schema validation errors
		for (const error of schemaResult.errors) {
			result.errors.push({
				path: filePath,
				message: `${error.path}: ${error.message}`,
				severity: "error",
				rule: "schema",
			});
		}

		// Add schema validation warnings
		for (const warning of schemaResult.warnings) {
			result.warnings.push({
				path: filePath,
				message: `${warning.path}: ${warning.message}`,
				severity: "warning",
				rule: "schema",
			});
		}
	}

	/**
	 * Check if a TypeScript file is a local action (uses createLocalAction)
	 */
	private isLocalActionTypeScript(filePath: string): boolean {
		try {
			const content = readFileSync(filePath, "utf-8");
			return content.includes("createLocalAction");
		} catch {
			return false;
		}
	}

	/**
	 * Validate TypeScript workflow by synthing to YAML and validating the output
	 */
	private async validateTypeScript(filePath: string, result: WorkflowValidationResult): Promise<void> {
		// Skip synth validation for local action files (they use createLocalAction, not createWorkflow)
		if (this.isLocalActionTypeScript(filePath)) {
			// Local action files don't have a synth method - they are validated differently
			// For now, we skip schema validation for local actions (syntax validation still applies)
			return;
		}

		// Synth TypeScript to YAML (dryRun = don't write files)
		let synthResult: Awaited<ReturnType<typeof synth>>;
		try {
			synthResult = await synth({
				file: filePath,
				dryRun: true,
				silent: true,
			});
		} catch (error) {
			// Synth failed - this is a structure error
			result.errors.push({
				path: filePath,
				message: `Failed to synth workflow: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "schema",
			});
			return;
		}

		// Validate each workflow generated from the TypeScript file
		const workflows = synthResult.workflows ?? [synthResult.workflow];
		for (const workflow of workflows) {
			// Parse the generated YAML
			let parsed: unknown;
			try {
				parsed = parseYaml(workflow.content);
			} catch (parseError) {
				result.errors.push({
					path: filePath,
					message: `Generated YAML parse error: ${parseError instanceof Error ? parseError.message : parseError}`,
					severity: "error",
					rule: "schema",
				});
				continue;
			}

			// Validate against JSON Schema
			const schemaResult = this.schemaValidator.validateWorkflowSchema(parsed);

			// Add schema validation errors
			for (const error of schemaResult.errors) {
				result.errors.push({
					path: filePath,
					message: `${error.path}: ${error.message}`,
					severity: "error",
					rule: "schema",
				});
			}

			// Add schema validation warnings
			for (const warning of schemaResult.warnings) {
				result.warnings.push({
					path: filePath,
					message: `${warning.path}: ${warning.message}`,
					severity: "warning",
					rule: "schema",
				});
			}

			// Check if name is present
			if (parsed && typeof parsed === "object" && !("name" in parsed)) {
				result.warnings.push({
					path: filePath,
					message: "Workflow should have a name",
					severity: "warning",
					rule: "schema",
				});
			}
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateStructure: ValidatorFunction = async (context, result) => {
	const validator = new StructureValidator();
	await validator.validate(context, result);
};
