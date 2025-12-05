import Ajv from "ajv";
import type { GitHubWorkflow, NormalJob, ReusableWorkflowCallJob } from "../../../../generated/types/github-workflow";

export interface SchemaValidationResult {
	valid: boolean;
	errors: SchemaError[];
	warnings: SchemaWarning[];
}

export interface SchemaError {
	path: string;
	message: string;
	expected: string;
	actual: string;
}

export interface SchemaWarning {
	path: string;
	message: string;
	suggestion: string;
}

export class GitHubSchemaValidator {
	private ajv: Ajv;
	private workflowSchema: unknown;

	constructor(workflowSchema?: unknown) {
		this.ajv = new Ajv({ allErrors: true, verbose: true });
		this.workflowSchema = workflowSchema || this.getDefaultWorkflowSchema();
	}

	/**
	 * Validates a workflow object against GitHub's workflow schema
	 */
	validateWorkflowSchema(workflow: unknown): SchemaValidationResult {
		const errors: SchemaError[] = [];
		const warnings: SchemaWarning[] = [];

		// First check basic required fields manually for better error messages
		this.validateRequiredFields(workflow, errors);

		// Then run full schema validation - AJV accepts unknown
		const valid = this.ajv.validate(this.workflowSchema as any, workflow);

		if (!valid && this.ajv.errors) {
			for (const error of this.ajv.errors) {
				// Filter out false-positive errors for workflow_call jobs
				const convertedError = this.convertAjvError(error);
				if (
					!this.isWorkflowCallRunsOnError(convertedError, workflow)
					// Note: isSecretsInheritError is no longer needed - SchemaStore schema fixed
					// && !this.isSecretsInheritError(convertedError, workflow)
				) {
					errors.push(convertedError);
				}
			}
		}

		// Check for job structure validation (only if workflow is valid GitHubWorkflow)
		if (workflow && typeof workflow === "object" && "jobs" in workflow) {
			const wf = workflow as GitHubWorkflow;
			if (wf.jobs && typeof wf.jobs === "object") {
				for (const [jobId, job] of Object.entries(wf.jobs)) {
					this.validateJob(jobId, job, errors, warnings);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors: this.deduplicateErrors(errors),
			warnings,
		};
	}

	private getDefaultWorkflowSchema() {
		// Basic GitHub workflow schema for validation
		// This is a simplified version of the full schema for essential validation
		return {
			type: "object",
			required: ["on", "jobs"],
			properties: {
				name: { type: "string" },
				on: {
					oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }, { type: "object" }],
				},
				jobs: {
					type: "object",
					patternProperties: {
						"^[a-zA-Z_][a-zA-Z0-9_-]*$": {
							type: "object",
							oneOf: [
								{
									// Normal job
									required: ["runs-on"],
									properties: {
										"runs-on": {
											oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
										},
										steps: {
											type: "array",
											items: { type: "object" },
										},
									},
								},
								{
									// Reusable workflow call
									required: ["uses"],
									properties: {
										uses: { type: "string" },
										with: { type: "object" },
										secrets: {
											oneOf: [{ type: "object" }, { type: "string", enum: ["inherit"] }],
										},
									},
								},
							],
						},
					},
				},
			},
		};
	}

	private validateRequiredFields(workflow: unknown, errors: SchemaError[]) {
		// Handle null/undefined workflow
		if (!workflow || typeof workflow !== "object") {
			errors.push({
				path: "root",
				message: "Workflow must be an object",
				expected: "object with workflow definition",
				actual: workflow === null ? "null" : typeof workflow,
			});
			return;
		}

		const wf = workflow as Partial<GitHubWorkflow>;

		if (!wf.jobs) {
			errors.push({
				path: "root",
				message: 'Missing required field "jobs"',
				expected: "object with job definitions",
				actual: "undefined",
			});
		}

		if (!wf.on) {
			errors.push({
				path: "root",
				message: 'Missing required field "on" (workflow trigger)',
				expected: "string | array | object",
				actual: "undefined",
			});
		}
	}

	private validateJob(
		jobId: string,
		job: NormalJob | ReusableWorkflowCallJob,
		errors: SchemaError[],
		warnings: SchemaWarning[]
	) {
		// Check if it's a reusable workflow call or normal job
		if ("uses" in job) {
			this.validateReusableWorkflowCall(jobId, job, errors, warnings);
		} else {
			this.validateNormalJob(jobId, job, errors, warnings);
		}
	}

	private validateNormalJob(jobId: string, job: NormalJob, errors: SchemaError[], warnings: SchemaWarning[]) {
		const jobPath = `jobs.${jobId}`;

		// Normal jobs must have runs-on
		if (!job["runs-on"]) {
			errors.push({
				path: jobPath,
				message: 'Normal job must have "runs-on" field',
				expected: "string | array (runner specification)",
				actual: "undefined",
			});
		}

		// Check for steps (optional but common)
		if (!job.steps && !job.strategy) {
			warnings.push({
				path: jobPath,
				message: "Job has no steps defined",
				suggestion: "Add steps array to define job actions",
			});
		}
	}

	private validateReusableWorkflowCall(
		jobId: string,
		job: ReusableWorkflowCallJob,
		errors: SchemaError[],
		warnings: SchemaWarning[]
	) {
		const jobPath = `jobs.${jobId}`;

		// Reusable workflow calls should not have runs-on or steps (check at runtime as they may be present incorrectly)
		const jobObj = job as unknown as Record<string, unknown>;
		if ("runs-on" in jobObj) {
			warnings.push({
				path: jobPath,
				message: 'Reusable workflow call should not have "runs-on" field',
				suggestion: "Remove runs-on field - the target workflow defines its own runner",
			});
		}

		if ("steps" in jobObj) {
			errors.push({
				path: jobPath,
				message: 'Reusable workflow call cannot have "steps" field',
				expected: "no steps (steps defined in target workflow)",
				actual: "steps array",
			});
		}

		// Validate workflow path format
		if (typeof job.uses === "string") {
			this.validateWorkflowPath(jobPath, job.uses, errors, warnings);
		}
	}

	private validateWorkflowPath(
		jobPath: string,
		workflowPath: string,
		errors: SchemaError[],
		warnings: SchemaWarning[]
	) {
		// Local workflow call
		if (workflowPath.startsWith("./") || workflowPath.startsWith("../")) {
			if (!workflowPath.endsWith(".yml") && !workflowPath.endsWith(".yaml")) {
				warnings.push({
					path: jobPath,
					message: "Local workflow path should end with .yml or .yaml",
					suggestion: "Ensure the file extension is correct",
				});
			}
		}
		// External workflow call
		else if (workflowPath.includes("@")) {
			const parts = workflowPath.split("@");
			if (parts.length !== 2) {
				errors.push({
					path: jobPath,
					message: "Invalid external workflow path format",
					expected: "owner/repo/.github/workflows/file.yml@ref",
					actual: workflowPath,
				});
			}
		}
		// Invalid format
		else {
			errors.push({
				path: jobPath,
				message: "Invalid workflow path format",
				expected: "local path (./path) or external (owner/repo/.github/workflows/file.yml@ref)",
				actual: workflowPath,
			});
		}
	}

	private convertAjvError(error: unknown): SchemaError {
		// Type guard for AJV error structure
		if (!error || typeof error !== "object") {
			return {
				path: "root",
				message: "Unknown validation error",
				expected: "valid value",
				actual: String(error),
			};
		}

		const err = error as Record<string, any>;
		const path = err.instancePath || err.dataPath || "root";
		let message = err.message || "Schema validation failed";

		// Improve error messages for common cases
		if (err.keyword === "required") {
			message = `Missing required property '${err.params?.missingProperty}'`;
		} else if (err.keyword === "type") {
			message = `Expected ${err.params?.type} but got ${typeof err.data}`;
		} else if (err.keyword === "enum") {
			message = `Value must be one of: ${err.params?.allowedValues?.join(", ")}`;
		}

		return {
			path: path.replace(/^\//, "").replace(/\//g, ".") || "root",
			message,
			expected: err.schema?.toString() || "valid value",
			actual: typeof err.data === "object" ? JSON.stringify(err.data) : String(err.data),
		};
	}

	/**
	 * Check if an error is a false-positive runs-on requirement for a workflow_call job
	 */
	private isWorkflowCallRunsOnError(error: SchemaError, workflow: unknown): boolean {
		// Check if this is a "Missing required property 'runs-on'" error
		if (!error.message.includes("runs-on")) {
			return false;
		}

		// Type guard for workflow structure
		if (!workflow || typeof workflow !== "object") {
			return false;
		}

		const wf = workflow as { jobs?: Record<string, unknown> };
		if (!wf.jobs || typeof wf.jobs !== "object") {
			return false;
		}

		// Extract job ID from path (e.g., "jobs.cleanup" -> "cleanup")
		const match = error.path.match(/^jobs\.([^.]+)/);
		if (!match) {
			return false;
		}

		const jobId = match[1];
		const job = wf.jobs[jobId];

		// If the job has 'uses', it's a workflow_call and doesn't need runs-on
		return Boolean(job && typeof job === "object" && "uses" in job);
	}

	private deduplicateErrors(errors: SchemaError[]): SchemaError[] {
		const seen = new Set<string>();
		return errors.filter((error) => {
			const key = `${error.path}:${error.message}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
	}
}
