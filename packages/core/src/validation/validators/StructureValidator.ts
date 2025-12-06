import { YamlAnalyzer } from "../../operations/reverse/yaml-analyzer";
import type { WorkflowAnalysis } from "../../operations/reverse/types";
import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

/**
 * Workflow structure validator
 * Uses YamlAnalyzer for YAML files, regex detection for TS files
 */
export class StructureValidator {
	private yamlAnalyzer = new YamlAnalyzer();

	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		const { content, filePath, options } = context;
		const isYaml = filePath.endsWith(".yml") || filePath.endsWith(".yaml");

		try {
			if (isYaml) {
				this.validateYaml(content, filePath, options, result);
			} else {
				this.validateTypeScript(content, filePath, options, result);
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
	 * Validate YAML workflow using YamlAnalyzer
	 */
	private validateYaml(
		content: string,
		filePath: string,
		_options: ValidationContext["options"],
		result: WorkflowValidationResult
	): void {
		let analysis: WorkflowAnalysis;
		try {
			analysis = this.yamlAnalyzer.analyzeWorkflowFromContent(content, filePath);
		} catch {
			// YAML parse error - skip structure validation (handled by SyntaxValidator)
			return;
		}

		// Check if name is present in original YAML (not derived from file path)
		if (!analysis.yaml.name) {
			result.warnings.push({
				path: filePath,
				message: "Workflow should have a name",
				severity: "warning",
				rule: "schema",
			});
		}

		// Always run all structure checks - filtering happens at result level
		const errors = this.yamlAnalyzer.validateWorkflowStructure(analysis, { strict: true });

		for (const error of errors) {
			if (error.message.includes("missing required 'on' triggers")) {
				result.errors.push({
					path: filePath,
					message: "Workflow must have trigger events",
					severity: "error",
					rule: "schema",
				});
			} else if (error.message.includes("has no jobs defined")) {
				result.errors.push({
					path: filePath,
					message: "Workflow must have at least one job",
					severity: "error",
					rule: "schema",
				});
			} else if (error.message.includes("missing required 'runs-on'")) {
				result.errors.push({
					path: filePath,
					message: error.message,
					severity: "error",
					rule: "schema",
				});
			} else if (error.message.includes("has no steps defined")) {
				result.errors.push({
					path: filePath,
					message: error.message,
					severity: "error",
					rule: "schema",
				});
			}
		}
	}

	/**
	 * Validate TypeScript workflow using regex detection
	 */
	private validateTypeScript(
		content: string,
		filePath: string,
		_options: ValidationContext["options"],
		result: WorkflowValidationResult
	): void {
		// For TS files, use regex-based detection
		const hasName = content.includes(".name(");
		const hasOn = content.includes(".on(");
		const hasJob = content.includes(".job(");
		const hasRunsOn = content.includes(".runsOn(");

		if (!hasName) {
			result.warnings.push({
				path: filePath,
				message: "Workflow should have a name",
				severity: "warning",
				rule: "schema",
			});
		}

		if (!hasOn) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have trigger events",
				severity: "error",
				rule: "schema",
			});
		}

		if (!hasJob) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have at least one job",
				severity: "error",
				rule: "schema",
			});
		}

		// Always check for runs-on - filtering happens at result level
		if (hasJob && !hasRunsOn) {
			result.errors.push({
				path: filePath,
				message: "Job must specify runs-on",
				severity: "error",
				rule: "schema",
			});
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateStructure: ValidatorFunction = (context, result) => {
	const validator = new StructureValidator();
	validator.validate(context, result);
};
