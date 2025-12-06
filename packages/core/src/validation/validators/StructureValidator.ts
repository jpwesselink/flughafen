import yaml from "yaml";
import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

interface WorkflowObject {
	name?: string;
	on?: unknown;
	jobs?: Record<string, { "runs-on"?: string }>;
}

/**
 * Workflow structure validator
 * Validates workflow structure by parsing content to object
 */
export class StructureValidator {
	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		const { content, filePath, options } = context;

		try {
			const workflow = this.parseWorkflow(content, filePath);
			if (!workflow) return; // Parse failed, skip structure validation

			this.validateWorkflowObject(workflow, filePath, options, result);
		} catch (error) {
			result.errors.push({
				path: filePath,
				message: `Structure validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "structure-error",
			});
		}
	}

	private parseWorkflow(content: string, filePath: string): WorkflowObject | null {
		const isYaml = filePath.endsWith(".yml") || filePath.endsWith(".yaml");

		if (isYaml) {
			try {
				return yaml.parse(content) as WorkflowObject;
			} catch {
				return null; // YAML parse error handled elsewhere
			}
		}

		// For TS files, we can't easily parse to object without executing
		// Fall back to regex-based detection for now
		return {
			name: content.includes(".name(") ? "detected" : undefined,
			on: content.includes(".on(") ? "detected" : undefined,
			jobs: content.includes(".job(") ? { detected: { "runs-on": content.includes(".runsOn(") ? "detected" : undefined } } : undefined,
		};
	}

	private validateWorkflowObject(
		workflow: WorkflowObject,
		filePath: string,
		options: ValidationContext["options"],
		result: WorkflowValidationResult
	): void {
		if (!workflow.name) {
			result.warnings.push({
				path: filePath,
				message: "Workflow should have a name",
				severity: "warning",
				rule: "workflow-name",
			});
		}

		if (!workflow.on) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have trigger events",
				severity: "error",
				rule: "workflow-triggers",
			});
		}

		if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
			result.errors.push({
				path: filePath,
				message: "Workflow must have at least one job",
				severity: "error",
				rule: "workflow-jobs",
			});
		}

		if (options.strict && workflow.jobs) {
			for (const [jobName, job] of Object.entries(workflow.jobs)) {
				if (!job["runs-on"]) {
					result.errors.push({
						path: filePath,
						message: `Job '${jobName}' must specify runs-on in strict mode`,
						severity: "error",
						rule: "strict-runs-on",
					});
				}
			}
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
