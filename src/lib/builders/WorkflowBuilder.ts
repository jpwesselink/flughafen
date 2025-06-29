import { stringify } from "yaml";
import type { Event, Ref, Ref2 } from "../../../types/github-workflow";
import type {
	ConcurrencyConfig,
	DefaultsConfig,
	PermissionsConfig,
	PullRequestConfig,
	PushConfig,
	ValidationResult,
	WorkflowConfig,
} from "../../types/builder-types";
import { toKebabCase } from "../../utils/toKebabCase";
import { type Builder, buildValue } from "./Builder";
import { JobBuilder } from "./JobBuilder";
import { LocalActionBuilder } from "./LocalActionBuilder";
import Ajv from "ajv";
import workflowSchema from "../github-workflow.schema.json";

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
	? Ref2
	: T extends "pull_request"
		? Ref
		: T extends "pull_request_target"
			? Ref
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
export class WorkflowBuilder implements Builder<WorkflowConfig> {
	private config: Partial<WorkflowConfig> = {
		jobs: {},
	};
	private outputFilename?: string;
	private jobBuilders: Map<string, JobBuilder> = new Map(); // Store JobBuilder instances

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
		this.addToOnConfig(event, config || {});
		return this;
	}

	/**
	 * Add push trigger
	 * @deprecated Use `on('push', config)` instead for better flexibility
	 */
	onPush(config?: PushConfig): WorkflowBuilder {
		return this.on("push", config);
	}

	/**
	 * Add pull request trigger
	 * @deprecated Use `on('pull_request', config)` instead for better flexibility
	 */
	onPullRequest(config?: PullRequestConfig): WorkflowBuilder {
		return this.on("pull_request", config);
	}

	/**
	 * Add schedule trigger
	 * @deprecated Use `on('schedule', schedules)` instead for better flexibility
	 */
	onSchedule(cron: string | string[]): WorkflowBuilder {
		const schedules = Array.isArray(cron) ? cron.map((c) => ({ cron: c })) : [{ cron }];
		return this.on("schedule", schedules);
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
		const kebabId = toKebabCase(id);

		if (typeof jobOrCallback === "function") {
			// Callback form - create new JobBuilder and pass to callback
			const jobBuilder = new JobBuilder();
			finalJob = jobOrCallback(jobBuilder);
		} else {
			// Direct form - use the provided JobBuilder
			finalJob = jobOrCallback;
		}

		// Store the JobBuilder instance for local action collection
		this.jobBuilders.set(kebabId, finalJob);

		this.config.jobs[kebabId] = buildValue(finalJob);
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
	private addToOnConfig(event: string, config: any): void {
		if (!this.config.on) {
			this.config.on = {};
		}

		if (Array.isArray(this.config.on)) {
			// Convert array to object if needed
			const events = this.config.on;
			this.config.on = {};
			for (const evt of events) {
				if (typeof evt === "string") {
					(this.config.on as Record<string, any>)[evt] = {};
				}
			}
		}

		(this.config.on as Record<string, any>)[event] = config;
	}

	/**
	 * Validate the workflow configuration
	 */
	validate(): ValidationResult {
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
					throw new Error(message);
				} else {
					console.warn(message);
				}
			}
		}

		// Reorder properties for conventional GitHub Actions workflow structure
		const orderedConfig: any = {};

		if (this.config.name) orderedConfig.name = this.config.name;
		if (this.config["run-name"]) orderedConfig["run-name"] = this.config["run-name"];
		if (this.config.on) orderedConfig.on = this.config.on;
		if (this.config.permissions) orderedConfig.permissions = this.config.permissions;
		if (this.config.env) orderedConfig.env = this.config.env;
		if (this.config.defaults) orderedConfig.defaults = this.config.defaults;
		if (this.config.concurrency) orderedConfig.concurrency = this.config.concurrency;
		if (this.config.jobs) orderedConfig.jobs = this.config.jobs;

		return stringify(orderedConfig);
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

		// Update action references to use the correct absolute path from repo root
		// Replace the hardcoded ./.github/actions/ with the actual actions directory
		const correctActionPath = `./${actionsDir}`;
		workflowYaml = workflowYaml.replace(/uses:\s*\.\/.github\/actions\//g, `uses: ${correctActionPath}/`);

		// Determine workflow filename
		let workflowFilename = this.getFilename();
		if (!workflowFilename) {
			// Fallback: use workflow name or default
			const config = this.build();
			if (config.name) {
				// Inline implementation to avoid import issues in tests
				workflowFilename = `${config.name
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "-")
					.replace(/-+/g, "-")
					.replace(/^-|-$/g, "")}.yml`;
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
				throw new Error("Local action must have either a name or filename");
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
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("WorkflowBuilder", () => {
		it("should create a basic workflow", () => {
			const workflow = new WorkflowBuilder().name("Test Workflow").onPush({ branches: ["main"] });

			const config = workflow.build();
			expect(config.name).toBe("Test Workflow");
			expect(config.on).toEqual({ push: { branches: ["main"] } });
			expect(config.jobs).toEqual({});
		});

		it("should add jobs using callback form", () => {
			const workflow = new WorkflowBuilder()
				.name("Job Test")
				.job("test", (job: JobBuilder) =>
					job.runsOn("ubuntu-latest").step((step: any) => step.name("Test").run("npm test"))
				);

			const config = workflow.build();
			expect(config.jobs?.test).toBeDefined();
			const testJob = config.jobs?.test as any;
			expect(testJob?.["runs-on"]).toBe("ubuntu-latest");
			expect(testJob?.steps).toHaveLength(1);
		});

		it("should set workflow environment variables", () => {
			const workflow = new WorkflowBuilder().name("Env Test").env({ NODE_ENV: "test", CI: true });

			const config = workflow.build();
			expect(config.env).toEqual({ NODE_ENV: "test", CI: true });
		});

		it("should set workflow permissions", () => {
			const permissions = {
				contents: "read" as const,
				packages: "write" as const,
			};
			const workflow = new WorkflowBuilder().name("Permissions Test").permissions(permissions);

			const config = workflow.build();
			expect(config.permissions).toEqual(permissions);
		});

		it("should set workflow concurrency", () => {
			const concurrency = { group: "deploy", "cancel-in-progress": true };
			const workflow = new WorkflowBuilder().name("Concurrency Test").concurrency(concurrency);

			const config = workflow.build();
			expect(config.concurrency).toEqual(concurrency);
		});

		it("should export to YAML", () => {
			const workflow = new WorkflowBuilder()
				.name("YAML Test")
				.onPush({ branches: ["main"] })
				.job("test", (job: JobBuilder) =>
					job.runsOn("ubuntu-latest").step((step: any) => step.name("Hello").run('echo "Hello World"'))
				);

			const yaml = workflow.toYAML();
			expect(yaml).toContain("name: YAML Test");
			expect(yaml).toContain("runs-on: ubuntu-latest");
			expect(yaml).toContain('echo "Hello World"');
		});

		it("should automatically collect local actions from jobs and steps", () => {
			const action1 = new LocalActionBuilder().name("Test Action 1").description("A test action");

			const action2 = new LocalActionBuilder().name("Test Action 2").description("Another test action");

			const workflow = new WorkflowBuilder().name("Action Collection Test").job("test", (job: JobBuilder) =>
				job
					.runsOn("ubuntu-latest")
					.step((step: any) => step.name("Step 1").uses(action1, (uses: any) => uses))
					.step((step: any) => step.name("Step 2").uses(action2, (uses: any) => uses))
			);

			const localActions = workflow.getLocalActions();
			expect(localActions).toHaveLength(2);
			expect(localActions).toContain(action1);
			expect(localActions).toContain(action2);
		});

		it("should deduplicate local actions used multiple times", () => {
			const action = new LocalActionBuilder().name("Shared Action").description("A shared action");

			const workflow = new WorkflowBuilder()
				.name("Deduplication Test")
				.job("test1", (job: JobBuilder) =>
					job.runsOn("ubuntu-latest").step((step: any) => step.name("Step 1").uses(action, (uses: any) => uses))
				)
				.job("test2", (job: JobBuilder) =>
					job.runsOn("ubuntu-latest").step((step: any) => step.name("Step 2").uses(action, (uses: any) => uses))
				);

			const localActions = workflow.getLocalActions();
			expect(localActions).toHaveLength(1);
			expect(localActions).toContain(action);
		});

		it("should synth workflow with local actions (same as processWorkflow)", () => {
			// Create a simple workflow without external dependencies for testing
			const workflow = createWorkflow()
				.name("Test Workflow")
				.filename("test.yml")
				.onPush({ branches: ["main"] })
				.job("test", (job: JobBuilder) =>
					job
						.runsOn("ubuntu-latest")
						.step((step: any) => step.name("Checkout").uses("actions/checkout@v4", (action: any) => action))
						.step((step: any) => step.name("Run tests").run("npm test"))
				);

			const result = workflow.synth();

			// Verify structure matches WorkflowProcessorResult
			expect(result).toHaveProperty("workflow");
			expect(result).toHaveProperty("actions");
			expect(result.workflow).toHaveProperty("filename");
			expect(result.workflow).toHaveProperty("content");

			// Verify workflow file details
			expect(result.workflow.filename).toBe(".github/workflows/test.yml");
			expect(result.workflow.content).toContain("name: Test Workflow");
			expect(result.workflow.content).toContain("uses: actions/checkout@v4");
			expect(result.workflow.content).toContain("run: npm test");
		});

		it("should synth with custom options", () => {
			const workflow = createWorkflow()
				.name("Custom Workflow")
				.onPush({ branches: ["main"] }) // Add required trigger
				.job("test", (job: JobBuilder) =>
					job.runsOn("ubuntu-latest").step((step: any) => step.name("Test step").run('echo "test"'))
				);

			const result = workflow.synth({
				basePath: "ci",
				workflowsDir: "ci/workflows",
				actionsDir: "ci/actions",
				defaultFilename: "custom.yml",
			});

			// Verify custom paths are used
			expect(result.workflow.filename).toBe("ci/workflows/custom-workflow.yml");
			expect(result.workflow.content).toContain("name: Custom Workflow");
			expect(result.workflow.content).toContain('run: echo "test"');
		});
	});

	describe("createWorkflow factory", () => {
		it("should create a new WorkflowBuilder instance", () => {
			const workflow = createWorkflow();
			expect(workflow).toBeInstanceOf(WorkflowBuilder);
		});

		it("should create independent instances", () => {
			const workflow1 = createWorkflow().name("Workflow 1");
			const workflow2 = createWorkflow().name("Workflow 2");

			const config1 = workflow1.build();
			const config2 = workflow2.build();

			expect(config1.name).toBe("Workflow 1");
			expect(config2.name).toBe("Workflow 2");
		});
	});
}
