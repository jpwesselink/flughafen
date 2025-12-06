import { readFileSync } from "node:fs";
import yaml from "yaml";
import type { ActionUsage, JobAnalysis, ReverseError, StepAnalysis, WorkflowAnalysis, WorkflowTrigger } from "./types";

/** Parsed YAML content - typed loosely since YAML structure is validated at runtime */
type ParsedYaml = Record<string, unknown>;

/**
 * Analyzes YAML workflow files and extracts structured information
 */
export class YamlAnalyzer {
	/**
	 * Parse a single workflow YAML file
	 */
	async analyzeWorkflow(filePath: string): Promise<WorkflowAnalysis> {
		try {
			const content = readFileSync(filePath, "utf-8");
			return this.analyzeWorkflowFromContent(content, filePath);
		} catch (error) {
			throw new Error(
				`Failed to analyze workflow ${filePath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Parse workflow from YAML content string (no file I/O)
	 */
	analyzeWorkflowFromContent(content: string, filePath: string): WorkflowAnalysis {
		const parsedYaml = yaml.parse(content) as ParsedYaml;

		if (!parsedYaml || typeof parsedYaml !== "object") {
			throw new Error("Invalid YAML structure");
		}

		return {
			filePath,
			name: (parsedYaml.name as string | undefined) || this.extractNameFromPath(filePath),
			yaml: parsedYaml,
			triggers: this.extractTriggers(parsedYaml.on),
			jobs: this.extractJobs(parsedYaml.jobs),
			actions: this.extractActionUsage(parsedYaml.jobs),
			comments: this.extractComments(content),
			env: parsedYaml.env as Record<string, string | number | boolean> | undefined,
			permissions: parsedYaml.permissions as Record<string, string> | undefined,
			concurrency: parsedYaml.concurrency as Record<string, unknown> | undefined,
			defaults: parsedYaml.defaults as Record<string, unknown> | undefined,
		};
	}

	/**
	 * Extract workflow name from file path
	 */
	private extractNameFromPath(filePath: string): string {
		const fileName = filePath.split("/").pop() || "";
		return fileName.replace(/\.(yml|yaml)$/, "").replace(/[-_]/g, " ");
	}

	/**
	 * Extract workflow triggers/events
	 */
	private extractTriggers(onConfig: unknown): WorkflowTrigger[] {
		if (!onConfig) return [];

		const triggers: WorkflowTrigger[] = [];

		if (typeof onConfig === "string") {
			// Simple trigger: on: push
			triggers.push({ event: onConfig });
		} else if (Array.isArray(onConfig)) {
			// Array of triggers: on: [push, pull_request]
			for (const event of onConfig) {
				triggers.push({ event: String(event) });
			}
		} else if (typeof onConfig === "object") {
			// Object with configurations
			for (const [event, config] of Object.entries(onConfig)) {
				triggers.push({
					event,
					config: config === null ? undefined : (config as Record<string, unknown>),
				});
			}
		}

		return triggers;
	}

	/**
	 * Extract jobs from workflow
	 */
	private extractJobs(jobsConfig: unknown): JobAnalysis[] {
		if (!jobsConfig || typeof jobsConfig !== "object") {
			return [];
		}

		const jobs: JobAnalysis[] = [];

		for (const [jobId, jobConfig] of Object.entries(jobsConfig as Record<string, unknown>)) {
			if (!jobConfig || typeof jobConfig !== "object") continue;

			const job = jobConfig as Record<string, unknown>;
			jobs.push({
				id: jobId,
				name: job.name as string | undefined,
				runsOn: (job["runs-on"] || job.runsOn) as string,
				needs: job.needs as string[] | undefined,
				if: job.if as string | undefined,
				environment: job.environment as Record<string, unknown> | undefined,
				strategy: job.strategy as Record<string, unknown> | undefined,
				timeoutMinutes: job["timeout-minutes"] as number | undefined,
				steps: this.extractSteps(job.steps as unknown[]),
				config: job as Record<string, unknown>,
				env: job.env as Record<string, string | number | boolean> | undefined,
				permissions: job.permissions as Record<string, string> | undefined,
				outputs: job.outputs as Record<string, string> | undefined,
				defaults: job.defaults as Record<string, unknown> | undefined,
				concurrency: job.concurrency as Record<string, unknown> | undefined,
				continueOnError: job["continue-on-error"] as boolean | undefined,
			});
		}

		return jobs;
	}

	/**
	 * Extract steps from a job
	 */
	private extractSteps(stepsConfig: unknown[]): StepAnalysis[] {
		if (!Array.isArray(stepsConfig)) {
			return [];
		}

		return stepsConfig.map((stepConfig) => {
			const step = stepConfig as Record<string, unknown>;
			return {
				name: step.name as string | undefined,
				id: step.id as string | undefined,
				uses: step.uses as string | undefined,
				with: step.with as Record<string, string | number | boolean> | undefined,
				run: step.run as string | undefined,
				shell: step.shell as string | undefined,
				env: step.env as Record<string, string> | undefined,
				if: step.if as string | undefined,
				workingDirectory: (step["working-directory"] || step.workingDirectory) as string | undefined,
			};
		});
	}

	/**
	 * Extract all GitHub Actions used in the workflow
	 */
	private extractActionUsage(jobsConfig: unknown): ActionUsage[] {
		const actionMap = new Map<string, ActionUsage>();

		if (!jobsConfig || typeof jobsConfig !== "object") {
			return [];
		}

		for (const job of Object.values(jobsConfig as Record<string, unknown>)) {
			if (!job || typeof job !== "object") continue;

			const jobData = job as Record<string, unknown>;
			if (!Array.isArray(jobData.steps)) continue;

			for (const stepConfig of jobData.steps) {
				const step = stepConfig as Record<string, unknown>;
				if (!step.uses) continue;

				const action = step.uses as string;
				if (!actionMap.has(action)) {
					actionMap.set(action, {
						action,
						count: 0,
						inputs: [],
					});
				}

				const usage = actionMap.get(action);
				if (usage) {
					usage.count++;
					if (step.with) {
						usage.inputs.push(step.with as Record<string, string | number | boolean>);
					}
				}
			}
		}

		return Array.from(actionMap.values());
	}

	/**
	 * Extract comments from YAML content
	 */
	private extractComments(content: string): string[] {
		const comments: string[] = [];
		const lines = content.split("\n");

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith("#")) {
				comments.push(trimmed.substring(1).trim());
			}
		}

		return comments;
	}

	/**
	 * Validate YAML structure
	 */
	validateWorkflowStructure(analysis: WorkflowAnalysis, options?: { strict?: boolean }): ReverseError[] {
		const errors: ReverseError[] = [];

		// Check for required fields
		if (!analysis.name) {
			errors.push({
				file: analysis.filePath,
				message: "Workflow missing required 'name' field",
				type: "parsing",
			});
		}

		if (!analysis.triggers.length) {
			errors.push({
				file: analysis.filePath,
				message: "Workflow missing required 'on' triggers",
				type: "parsing",
			});
		}

		if (!analysis.jobs.length) {
			errors.push({
				file: analysis.filePath,
				message: "Workflow has no jobs defined",
				type: "parsing",
			});
		}

		// Validate jobs
		for (const job of analysis.jobs) {
			if (!job.runsOn && options?.strict) {
				errors.push({
					file: analysis.filePath,
					message: `Job '${job.id}' missing required 'runs-on' field`,
					type: "parsing",
				});
			}

			if (!job.steps.length) {
				errors.push({
					file: analysis.filePath,
					message: `Job '${job.id}' has no steps defined`,
					type: "parsing",
				});
			}
		}

		return errors;
	}
}
