import type { Container, Matrix, ReusableWorkflowCallJob } from "../../../generated/types/github-workflow";
import type { ConcurrencyConfig, DefaultsConfig, JobConfig, PermissionsConfig } from "../../types/builder-types";
import { resolveWorkflowReference, type WorkflowReference } from "../types/workflow-references";
import { type Builder, buildValue } from "./Builder";
import type { LocalActionBuilder } from "./LocalActionBuilder";
import { StepBuilder } from "./StepBuilder";

/**
 * Container configuration for job container or services
 */
export type ContainerConfig = string | Container;

/**
 * Services configuration - map of service name to container config
 */
export type ServicesConfig = Record<string, Container>;

/**
 * Job builder that prevents context switching
 * Supports both regular jobs and reusable workflow calls
 */
export class JobBuilder implements Builder<JobConfig | ReusableWorkflowCallJob> {
	private config: Partial<JobConfig> & Partial<ReusableWorkflowCallJob> = {};
	private stepsArray: Array<Record<string, unknown>> = [];
	private stepBuilders: StepBuilder[] = []; // Keep track of StepBuilder instances
	private isReusableWorkflowCall = false;
	private jobComment?: string; // Store comment for YAML generation

	/**
	 * Set the display name for this job
	 */
	name(name: string): JobBuilder {
		this.config.name = name;
		return this;
	}

	/**
	 * Set the runner for this job
	 */
	runsOn(runner: string): JobBuilder {
		this.config["runs-on"] = runner;
		return this;
	}

	/**
	 * Add a step using various forms
	 * @example
	 * // Callback form for full control
	 * .step(step => step
	 *   .name("Build")
	 *   .uses("docker/build-push-action@v5")
	 *   .with({ context: ".", push: true })
	 * )
	 *
	 * // String shorthand for actions
	 * .step("actions/checkout@v4")
	 * .step("actions/setup-node@v4", { "node-version": "20" })
	 */
	step(
		callback: ((step: StepBuilder) => StepBuilder) | string,
		inputs?: Record<string, string | number | boolean>
	): JobBuilder {
		if (typeof callback === "string") {
			// String shorthand for using an action
			const stepBuilder = new StepBuilder();
			stepBuilder.uses(callback);
			if (inputs) {
				stepBuilder._withInputs(inputs);
			}

			const builtStep = buildValue(stepBuilder);
			this.stepsArray.push(builtStep);
			this.stepBuilders.push(stepBuilder);
		} else {
			// Callback form
			const stepBuilder = new StepBuilder();
			const finalStep = callback(stepBuilder);

			// Build the step configuration and store it
			const builtStep = buildValue(finalStep);
			this.stepsArray.push(builtStep);

			// Store the StepBuilder for local action collection
			this.stepBuilders.push(finalStep);
		}

		return this;
	}

	/**
	 * Set job environment variables
	 */
	env(variables: Record<string, string | number | boolean>): JobBuilder {
		this.config.env = {
			...(this.config.env && typeof this.config.env === "object" ? this.config.env : {}),
			...variables,
		};
		return this;
	}

	/**
	 * Set job permissions
	 */
	permissions(permissions: PermissionsConfig): JobBuilder {
		this.config.permissions = permissions;
		return this;
	}

	/**
	 * Set job strategy (matrix, etc.)
	 */
	strategy(strategy: { matrix: Matrix; "fail-fast"?: boolean | string; "max-parallel"?: number | string }): JobBuilder {
		this.config.strategy = strategy as any;
		return this;
	}

	/**
	 * Set job timeout
	 */
	timeoutMinutes(minutes: number): JobBuilder {
		this.config["timeout-minutes"] = minutes;
		return this;
	}

	/**
	 * Set job needs (dependencies)
	 */
	needs(needs: string | string[]): JobBuilder {
		// GitHub Actions requires at least one dependency - empty needs array is invalid
		if (Array.isArray(needs) && needs.length === 0) {
			throw new Error("Job needs array must contain at least one job name");
		}
		// Cast to non-empty array type to match GitHub Actions schema requirements
		this.config.needs = needs as string | [string, ...string[]];
		return this;
	}

	/**
	 * Set job condition
	 */
	if(condition: string): JobBuilder {
		this.config.if = condition;
		return this;
	}

	/**
	 * Set job outputs
	 */
	outputs(outputs: Record<string, string>): JobBuilder {
		this.config.outputs = outputs;
		return this;
	}

	/**
	 * Configure this job to call a reusable workflow
	 */
	uses(workflow: WorkflowReference): JobBuilder {
		this.isReusableWorkflowCall = true;
		(this.config as Partial<ReusableWorkflowCallJob>).uses = resolveWorkflowReference(workflow);
		return this;
	}

	/**
	 * Set inputs for a reusable workflow call
	 */
	with(inputs: Record<string, string | number | boolean>): JobBuilder {
		if (!this.isReusableWorkflowCall) {
			throw new Error(".with() can only be used on reusable workflow jobs. Call .uses() first.");
		}
		(this.config as Partial<ReusableWorkflowCallJob>).with = inputs;
		return this;
	}

	/**
	 * Set secrets for a reusable workflow call
	 */
	secrets(secrets: Record<string, string> | "inherit"): JobBuilder {
		if (!this.isReusableWorkflowCall) {
			throw new Error(".secrets() can only be used on reusable workflow jobs. Call .uses() first.");
		}
		(this.config as Partial<ReusableWorkflowCallJob>).secrets = secrets;
		return this;
	}

	/**
	 * Set job environment
	 */
	environment(environment: { name: string; url?: string }): JobBuilder {
		this.config.environment = environment;
		return this;
	}

	/**
	 * Set container to run job steps in
	 * @example
	 * .container("node:20")
	 * .container({ image: "node:20", credentials: { username: "user", password: "secret" } })
	 */
	container(container: ContainerConfig): JobBuilder {
		this.config.container = container;
		return this;
	}

	/**
	 * Set service containers for the job
	 * @example
	 * .services({
	 *   postgres: { image: "postgres:15", ports: ["5432:5432"], env: { POSTGRES_PASSWORD: "test" } },
	 *   redis: { image: "redis:7" }
	 * })
	 */
	services(services: ServicesConfig): JobBuilder {
		this.config.services = services;
		return this;
	}

	/**
	 * Set job-level defaults for run steps
	 * @example
	 * .defaults({ run: { shell: "bash", "working-directory": "src" } })
	 */
	defaults(defaults: DefaultsConfig): JobBuilder {
		this.config.defaults = defaults as any;
		return this;
	}

	/**
	 * Set job-level concurrency settings
	 * @example
	 * .concurrency("deploy-group")
	 * .concurrency({ group: "deploy-${{ github.ref }}", "cancel-in-progress": true })
	 */
	concurrency(concurrency: ConcurrencyConfig): JobBuilder {
		this.config.concurrency = concurrency;
		return this;
	}

	/**
	 * Allow workflow run to pass even when this job fails
	 * @example
	 * .continueOnError(true)
	 * .continueOnError("${{ github.event_name == 'workflow_dispatch' }}")
	 */
	continueOnError(value: boolean | string): JobBuilder {
		this.config["continue-on-error"] = value;
		return this;
	}

	/**
	 * Add a comment to this job (will be rendered as YAML comment)
	 */
	comment(comment: string): JobBuilder {
		this.jobComment = comment;
		return this;
	}

	/**
	 * Get the comment for this job
	 */
	getComment(): string | undefined {
		return this.jobComment;
	}

	/**
	 * Get step comments indexed by step index
	 */
	getStepComments(): Map<number, string> {
		const comments = new Map<number, string>();
		this.stepBuilders.forEach((stepBuilder, index) => {
			const comment = stepBuilder.getComment();
			if (comment) {
				comments.set(index, comment);
			}
		});
		return comments;
	}

	/**
	 * Get all LocalActionBuilder instances used by this job's steps
	 */
	getLocalActions(): LocalActionBuilder[] {
		const localActions: LocalActionBuilder[] = [];

		for (const stepBuilder of this.stepBuilders) {
			const stepLocalActions = stepBuilder.getLocalActions();
			localActions.push(...stepLocalActions);
		}

		// Deduplicate using Set and return as array
		return Array.from(new Set(localActions));
	}

	/**
	 * Build the job configuration
	 * Normalizes input keys to kebab-case for GitHub Actions compatibility
	 */
	build(): JobConfig | ReusableWorkflowCallJob {
		if (this.isReusableWorkflowCall) {
			// Return reusable workflow call job (no steps)
			// Do NOT normalize 'with' inputs - they must match the exact input names
			// defined in the reusable workflow (can be camelCase, SCREAMING_SNAKE_CASE, etc.)
			return this.config as ReusableWorkflowCallJob;
		} else {
			// Return regular job with steps
			return {
				...this.config,
				steps: this.stepsArray,
			} as JobConfig;
		}
	}
}

/**
 * Factory function to create a new job builder
 */
export function createJob(): JobBuilder {
	return new JobBuilder();
}

// In-source tests
