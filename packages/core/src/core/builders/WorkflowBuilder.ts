import Ajv from "ajv";
import { stringify } from "yaml";
import type { Event } from "../../../generated/types/github-workflow";
import workflowSchema from "../../../schemas/github-workflow.schema.json";
import type {
	ConcurrencyConfig,
	DefaultsConfig,
	PermissionsConfig,
	PullRequestConfig,
	PushConfig,
	WorkflowConfig,
} from "../../types/builder-types";
import type { ReusableWorkflow } from "../types/workflow-references";

// Legacy validation result for basic schema validation
interface LegacyValidationResult {
	valid: boolean;
	errors?: string[];
}

import { createBuilderConfigurationError, ErrorCode, FlughafenValidationError } from "../../utils";
import { type Builder, buildValue } from "./Builder";
import { JobBuilder } from "./JobBuilder";
import type { LocalActionBuilder } from "./LocalActionBuilder";

// Type-safe event configuration mapping
// Note: 'schedule' is included separately because it's not technically a GitHub "event"
// but rather a time-based trigger that's handled differently in the workflow schema
type ScheduleConfig = Array<{ cron?: string }>;

// More practical WorkflowDispatchInput that matches actual usage
type PracticalWorkflowDispatchInput = {
	description: string;
	required?: boolean;
	default?: string | boolean | number;
	type?: "string" | "choice" | "boolean" | "number" | "environment";
	options?: string[];
};

type WorkflowDispatchConfig = {
	inputs?: Record<string, PracticalWorkflowDispatchInput>;
};

type WorkflowCallConfig = {
	inputs?: Record<
		string,
		{
			description?: string;
			required?: boolean;
			type: "boolean" | "number" | "string";
			default?: boolean | number | string;
		}
	>;
	secrets?: Record<
		string,
		{
			description?: string;
			required: boolean;
		}
	>;
};

// Event configuration type mapping for type safety
type EventConfig<T extends string> = T extends "push"
	? PushConfig
	: T extends "pull_request"
		? PullRequestConfig
		: T extends "pull_request_target"
			? PullRequestConfig
			: T extends "schedule"
				? ScheduleConfig
				: T extends "workflow_dispatch"
					? WorkflowDispatchConfig
					: T extends "workflow_call"
						? WorkflowCallConfig
						: T extends "release"
							? {
									types?: Array<
										"published" | "unpublished" | "created" | "edited" | "deleted" | "prereleased" | "released"
									>;
								}
							: T extends "issues"
								? {
										types?: Array<
											| "opened"
											| "edited"
											| "deleted"
											| "transferred"
											| "pinned"
											| "unpinned"
											| "closed"
											| "reopened"
											| "assigned"
											| "unassigned"
											| "labeled"
											| "unlabeled"
											| "locked"
											| "unlocked"
											| "milestoned"
											| "demilestoned"
										>;
									}
								: T extends "issue_comment"
									? { types?: Array<"created" | "edited" | "deleted"> }
									: T extends "pull_request_review"
										? { types?: Array<"submitted" | "edited" | "dismissed"> }
										: T extends "deployment"
											? never
											: T extends "deployment_status"
												? never
												: T extends "fork"
													? never
													: T extends "watch"
														? { types?: Array<"started"> }
														: T extends "create"
															? never
															: T extends "delete"
																? never
																: T extends "repository_dispatch"
																	? { types?: string[] }
																	: // Default for any other event - allow flexibility for new events
																		Record<string, unknown> | undefined;

/**
 * Workflow builder that prevents context switching
 */
export class WorkflowBuilder implements Builder<WorkflowConfig>, ReusableWorkflow {
	private config: Partial<WorkflowConfig> = {
		jobs: {},
	};
	private outputFilename?: string;
	private jobBuilders: Map<string, JobBuilder> = new Map(); // Store JobBuilder instances
	private workflowComment?: string; // Store comment for YAML generation
	private headerConfig: string | false = "default"; // Header: custom text, false to suppress, or "default"

	/**
	 * Add a comment to this workflow (will be rendered as YAML comment at the top)
	 */
	comment(comment: string): WorkflowBuilder {
		this.workflowComment = comment;
		return this;
	}

	/**
	 * Get the comment for this workflow
	 */
	getComment(): string | undefined {
		return this.workflowComment;
	}

	/**
	 * Configure the generated YAML file header
	 * @param value - false to suppress header, or string for custom header text
	 * @example
	 * .header(false) // No header
	 * .header("Custom header\nMultiple lines supported")
	 */
	header(value: false | string): WorkflowBuilder {
		this.headerConfig = value;
		return this;
	}

	/**
	 * Set the workflow name
	 */
	name(name: string): WorkflowBuilder {
		this.config.name = name;
		return this;
	}

	/**
	 * Set the run name for workflow runs
	 */
	runName(runName: string): WorkflowBuilder {
		this.config["run-name"] = runName;
		return this;
	}

	/**
	 * Set the output filename for this workflow
	 */
	filename(filename: string): WorkflowBuilder {
		this.outputFilename = filename;
		return this;
	}

	/**
	 * Get the output filename for this workflow
	 */
	getFilename(): string | undefined {
		return this.outputFilename;
	}

	/**
	 * Get all local actions used in this workflow
	 */
	getLocalActions(): LocalActionBuilder[] {
		const allActions = new Set<LocalActionBuilder>();

		// Collect from all job builders
		for (const jobBuilder of this.jobBuilders.values()) {
			const jobActions = jobBuilder.getLocalActions();
			for (const action of jobActions) {
				allActions.add(action);
			}
		}

		return Array.from(allActions);
	}

	/**
	 * Generic method to add any event trigger with type-safe configuration
	 *
	 * @param event - The GitHub event name or 'schedule' for time-based triggers
	 *   - Event: Repository events like 'push', 'pull_request', 'issues', etc.
	 *   - 'schedule': Time-based trigger (not technically an "event" but a cron-based trigger)
	 * @param config - The event-specific configuration object with proper typing
	 *
	 * For events that don't accept configuration (like 'create', 'fork'), no config parameter should be provided.
	 * TypeScript will enforce this by making config parameter unavailable for such events.
	 */
	on<T extends Event | "schedule">(
		event: T,
		...args: EventConfig<T> extends never
			? []
			: T extends "schedule"
				? [config: EventConfig<T>] // Required for schedule
				: [config?: EventConfig<T>] // Optional for other events
	): WorkflowBuilder {
		const config = args[0];
		// Preserve undefined/null for roundtrip validation - only use {} if config is explicitly provided
		// undefined means no config was passed, which should remain as null in YAML
		this.addToOnConfig(event, config !== undefined ? config : null);
		return this;
	}

	/**
	 * Add a job using a pre-built JobBuilder (direct form)
	 */
	job(id: string, job: JobBuilder): WorkflowBuilder;
	/**
	 * Add a job using a function (callback form)
	 */
	job(id: string, callback: (job: JobBuilder) => JobBuilder): WorkflowBuilder;
	job(id: string, jobOrCallback: JobBuilder | ((job: JobBuilder) => JobBuilder)): WorkflowBuilder {
		if (!this.config.jobs) {
			this.config.jobs = {};
		}

		let finalJob: JobBuilder;

		if (typeof jobOrCallback === "function") {
			// Callback form: .job("build", job => job.runsOn("ubuntu-latest")...)
			const jobBuilder = new JobBuilder();
			finalJob = jobOrCallback(jobBuilder);
		} else {
			// Direct form: .job("build", existingJobBuilder)
			finalJob = jobOrCallback;
		}

		// Track job builder for local action extraction during workflow build
		// Preserve original job ID exactly as provided for roundtrip validation
		this.jobBuilders.set(id, finalJob);

		this.config.jobs[id] = buildValue(finalJob);
		return this;
	}

	/**
	 * Set workflow permissions
	 */
	permissions(permissions: PermissionsConfig): WorkflowBuilder {
		this.config.permissions = permissions;
		return this;
	}

	/**
	 * Set workflow environment variables
	 */
	env(variables: Record<string, string | number | boolean>): WorkflowBuilder {
		this.config.env = {
			...(this.config.env && typeof this.config.env === "object" ? this.config.env : {}),
			...variables,
		};
		return this;
	}

	/**
	 * Set workflow concurrency
	 */
	concurrency(concurrency: ConcurrencyConfig): WorkflowBuilder {
		this.config.concurrency = concurrency;
		return this;
	}

	/**
	 * Set workflow defaults
	 */
	defaults(defaults: DefaultsConfig): WorkflowBuilder {
		this.config.defaults = defaults;
		return this;
	}

	/**
	 * Helper method to add events to the 'on' configuration
	 */
	private addToOnConfig(event: string, config: unknown): void {
		if (!this.config.on) {
			this.config.on = {};
		}

		if (Array.isArray(this.config.on)) {
			// Convert array to object if needed
			const events = this.config.on;
			this.config.on = {};
			for (const evt of events) {
				if (typeof evt === "string") {
					(this.config.on as Record<string, EventConfig<string>>)[evt] = {};
				}
			}
		}

		(this.config.on as Record<string, unknown>)[event] = config;
	}

	/**
	 * Validate the workflow configuration
	 */
	validate(): LegacyValidationResult {
		try {
			const ajv = new Ajv({
				allErrors: true,
				strictRequired: false,
				strictTypes: false,
				strictTuples: false,
				allowUnionTypes: true,
			});
			const validate = ajv.compile(workflowSchema);
			const valid = validate(this.config);

			if (!valid) {
				return {
					valid: false,
					errors: validate.errors?.map((err) => `${err.instancePath || "root"}: ${err.message}`) || [
						"Unknown validation error",
					],
				};
			}

			return { valid: true };
		} catch (error) {
			return {
				valid: false,
				errors: [`Validation error: ${(error as Error).message}`],
			};
		}
	}

	/**
	 * Convert to YAML with optional validation
	 */
	toYAML(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
		const { validate = true, throwOnError = true } = options;

		if (validate) {
			const result = this.validate();
			if (!result.valid) {
				const message = `Workflow validation failed:\n${result.errors?.join("\n")}`;
				if (throwOnError) {
					throw new FlughafenValidationError(message, ErrorCode.WORKFLOW_VALIDATION_ERROR, { errors: result.errors }, [
						"Check that all required fields are provided",
						"Verify job and step configurations are valid",
						"Review trigger event configuration",
					]);
				} else {
					console.warn(message);
				}
			}
		}

		// Reorder properties for conventional GitHub Actions workflow structure
		const orderedConfig: Partial<WorkflowConfig> = {};

		if (this.config.name) orderedConfig.name = this.config.name;
		if (this.config["run-name"]) orderedConfig["run-name"] = this.config["run-name"];
		if (this.config.on) orderedConfig.on = this.config.on;
		if (this.config.permissions) orderedConfig.permissions = this.config.permissions;
		if (this.config.env) orderedConfig.env = this.config.env;
		if (this.config.defaults) orderedConfig.defaults = this.config.defaults;
		if (this.config.concurrency) orderedConfig.concurrency = this.config.concurrency;
		if (this.config.jobs) orderedConfig.jobs = this.config.jobs;

		let yamlContent = stringify(orderedConfig, {
			lineWidth: 0, // Disable line wrapping
		});

		// Transform TypeScript expr() calls back to GitHub Actions ${{ }} syntax
		// This ensures roundtrip validation: YAML → TS (expr()) → YAML (${{ }})
		// Handles: ${expr('!cancelled()')} → ${{ !cancelled() }}
		// Handles: ${expr('runner.os == \'Linux\'')} → ${{ runner.os == 'Linux' }}
		yamlContent = yamlContent.replace(/\$\{expr\('((?:[^'\\]|\\.)*)'\)\}/g, (_match, expr) => {
			// Unescape single quotes that were escaped for JavaScript
			const unescaped = expr.replace(/\\'/g, "'");
			return `\${{ ${unescaped} }}`;
		});

		// Build header based on settings
		if (this.headerConfig !== false) {
			let header: string;

			if (this.headerConfig !== "default") {
				// Custom header - format as YAML comments
				header =
					this.headerConfig
						.split("\n")
						.map((line) => `# ${line}`)
						.join("\n") + "\n";
			} else {
				// Default warning header
				header = `# ⚠️  WARNING: This file is generated by Flughafen
#
# This workflow was generated from TypeScript source code.
# Direct edits to this YAML file will be lost on the next build.
#
# To make changes:
#   1. Edit the source TypeScript workflow file
#   2. Run: flughafen build
#
# Learn more: https://github.com/your-org/flughafen
#\n`;
			}

			// Add workflow comment if present
			if (this.workflowComment) {
				const commentLines = this.workflowComment
					.split("\n")
					.map((line) => `# ${line}`)
					.join("\n");
				header = `${header}${commentLines}\n#\n`;
			}

			yamlContent = header + yamlContent;
		}

		// Inject job comments
		for (const [jobId, jobBuilder] of this.jobBuilders.entries()) {
			const comment = jobBuilder.getComment();
			if (comment) {
				// Find the job in the YAML and add the comment above it
				const jobPattern = new RegExp(`^( *)${jobId}:`, "m");
				const match = yamlContent.match(jobPattern);
				if (match) {
					const indent = match[1];
					const commentLines = comment
						.split("\n")
						.map((line) => `${indent}# ${line}`)
						.join("\n");
					yamlContent = yamlContent.replace(jobPattern, `${commentLines}\n${indent}${jobId}:`);
				}
			}

			// Inject step comments for this job
			const stepComments = jobBuilder.getStepComments();
			if (stepComments.size > 0) {
				// Find the steps section for this job
				const jobStepsPattern = new RegExp(`^( *)${jobId}:[\\s\\S]*?^\\1  steps:`, "m");
				const jobMatch = yamlContent.match(jobStepsPattern);
				if (jobMatch) {
					const baseIndent = jobMatch[1];
					const stepIndent = baseIndent + "    ";

					// Split into lines and process steps
					const lines = yamlContent.split("\n");
					let inStepsSection = false;
					let stepIndex = -1;
					let stepsStartLine = -1;

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];

						// Check if we're entering this job's steps section
						if (line.match(new RegExp(`^${baseIndent}${jobId}:`))) {
							inStepsSection = false;
							stepIndex = -1;
						}

						if (inStepsSection === false && line.match(new RegExp(`^${stepIndent.slice(0, -2)}steps:`))) {
							// Check if this steps section belongs to current job by looking backwards
							let belongsToCurrentJob = false;
							for (let j = i - 1; j >= 0; j--) {
								if (lines[j].match(new RegExp(`^${baseIndent}${jobId}:`))) {
									belongsToCurrentJob = true;
									break;
								}
								if (lines[j].match(new RegExp(`^${baseIndent}\\w+:`))) {
									break; // Hit another job
								}
							}
							if (belongsToCurrentJob) {
								inStepsSection = true;
								stepsStartLine = i;
							}
						}

						// Check for step start (array item with - at correct indentation)
						if (inStepsSection && line.match(new RegExp(`^${stepIndent}- `))) {
							stepIndex++;
							const stepComment = stepComments.get(stepIndex);
							if (stepComment) {
								const commentLines = stepComment
									.split("\n")
									.map((l) => `${stepIndent}# ${l}`)
									.join("\n");
								lines[i] = `${commentLines}\n${line}`;
							}
						}

						// Exit steps section if we hit another top-level job key or decrease indentation significantly
						if (inStepsSection && i > stepsStartLine && line.match(new RegExp(`^${baseIndent}\\w+:`))) {
							inStepsSection = false;
						}
					}

					yamlContent = lines.join("\n");
				}
			}
		}

		return yamlContent;
	}

	/**
	 * Alias for toYAML
	 */
	toYaml(options?: { validate?: boolean; throwOnError?: boolean }): string {
		return this.toYAML(options);
	}

	/**
	 * Build the workflow configuration
	 */
	build(): WorkflowConfig {
		return this.config as WorkflowConfig;
	}

	/**
	 * Get the workflow reference path for use in reusable workflow calls
	 * This returns the path relative to the repository root
	 *
	 * For same-repository workflows, GitHub Actions requires the path to start with ./
	 */
	getWorkflowPath(): string {
		let path: string;
		const filename = this.getFilename();

		if (filename) {
			// If explicit filename is set, use it
			if (filename.startsWith(".github/workflows/")) {
				path = filename;
			} else {
				path = `.github/workflows/${filename}`;
			}
		} else {
			// Generate path from workflow name
			const config = this.build();
			if (config.name) {
				// Preserve leading underscore for reusable workflow convention
				const hasLeadingUnderscore = config.name.startsWith("_");
				const nameWithoutUnderscore = hasLeadingUnderscore ? config.name.slice(1) : config.name;

				const kebabName = nameWithoutUnderscore
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "-")
					.replace(/-+/g, "-")
					.replace(/^-|-$/g, "");

				const filename = hasLeadingUnderscore ? `_${kebabName}.yml` : `${kebabName}.yml`;
				path = `.github/workflows/${filename}`;
			} else {
				throw new Error("Cannot generate workflow path: workflow must have a name or explicit filename");
			}
		}

		// Ensure path starts with ./ (required by GitHub Actions for local workflows)
		if (!path.startsWith("./")) {
			path = `./${path}`;
		}
		return path;
	}

	/**
	 * Get the workflow builder instance (for type checking)
	 */
	getWorkflowBuilder(): WorkflowBuilder {
		return this;
	}

	/**
	 * Synthesize the complete workflow with all local actions - returns same output as workflow processor
	 * This method recursively builds the workflow and all its local actions
	 */
	synth(options: { basePath?: string; workflowsDir?: string; actionsDir?: string; defaultFilename?: string } = {}): {
		workflow: {
			filename: string;
			content: string;
		};
		actions: Record<string, string>; // filename -> content
	} {
		const { basePath = ".github", defaultFilename = "workflow.yml" } = options;

		// Construct default paths using basePath
		const workflowsDir = options.workflowsDir || (basePath ? `${basePath}/workflows` : "workflows");
		const actionsDir = options.actionsDir || (basePath ? `${basePath}/actions` : "actions");

		// Generate workflow YAML
		let workflowYaml = this.toYAML();

		// Update action references to use the correct path from repo root
		// Only replace if actionsDir is a relative path (not absolute)
		// This preserves ./.github/actions/ when synthesizing from temp directories
		const isAbsolutePath = actionsDir.startsWith("/") || /^[a-zA-Z]:/.test(actionsDir);
		if (!isAbsolutePath && actionsDir !== ".github/actions") {
			const correctActionPath = `./${actionsDir}`;
			workflowYaml = workflowYaml.replace(/uses:\s*\.\/.github\/actions\//g, `uses: ${correctActionPath}/`);
		}

		// Determine workflow filename
		let workflowFilename = this.getFilename();
		if (!workflowFilename) {
			// Fallback: use workflow name or default
			const config = this.build();
			if (config.name) {
				// Inline implementation to avoid import issues in tests
				// Preserve leading underscore for reusable workflow convention
				const hasLeadingUnderscore = config.name.startsWith("_");
				const nameWithoutUnderscore = hasLeadingUnderscore ? config.name.slice(1) : config.name;

				const kebabName = nameWithoutUnderscore
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "-")
					.replace(/-+/g, "-")
					.replace(/^-|-$/g, "");

				workflowFilename = hasLeadingUnderscore ? `_${kebabName}.yml` : `${kebabName}.yml`;
			} else {
				workflowFilename = defaultFilename;
			}
		}

		// Ensure .yml extension
		if (workflowFilename && !workflowFilename.endsWith(".yml") && !workflowFilename.endsWith(".yaml")) {
			workflowFilename += ".yml";
		}

		// Extract local actions
		const localActions = this.getLocalActions();
		const actionFiles: Record<string, string> = {};

		for (const action of localActions) {
			const actionYaml = action.toYAML();
			const actionName = action.getName();
			const actionFilename = action.getFilename();

			// Use action name for filename if no custom filename is set
			const finalActionName = actionFilename || actionName;
			if (!finalActionName) {
				throw createBuilderConfigurationError(
					"localAction",
					{ name: actionName, filename: actionFilename },
					"Local action must have either a name or filename"
				);
			}

			// Construct action file path
			const actionPath = `${actionsDir}/${finalActionName}/action.yml`;
			actionFiles[actionPath] = actionYaml;
		}

		return {
			workflow: {
				filename: `${workflowsDir}/${workflowFilename}`,
				content: workflowYaml,
			},
			actions: actionFiles,
		};
	}
}

/**
 * Create a new workflow builder
 */
export function createWorkflow(): WorkflowBuilder {
	return new WorkflowBuilder();
}

// In-source tests
