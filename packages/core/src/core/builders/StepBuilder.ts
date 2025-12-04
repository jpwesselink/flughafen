import type { StepConfig } from "../../types/builder-types";
import { normalizeToKebabCase } from "../../utils/property-mapper";
import { ActionBuilder } from "./ActionBuilder";
import { type Builder, buildValue } from "./Builder";
import { LocalActionBuilder } from "./LocalActionBuilder";
import { TypedActionConfigBuilder } from "./TypedActionConfigBuilder";

/** Input value types for step `with` configuration */
type StepInputValue = string | number | boolean;

// Re-export for convenience
export { ActionBuilder };

/**
 * Step builder that prevents context switching
 */
export class StepBuilder implements Builder<Record<string, unknown>> {
	private config: Record<string, unknown> = {};
	private localActions: Set<LocalActionBuilder> = new Set();
	private stepComment?: string; // Store comment for YAML generation

	/**
	 * Set step name
	 */
	name(name: string): StepBuilder {
		this.config.name = name;
		return this;
	}

	/**
	 * Set step id
	 */
	id(id: string): StepBuilder {
		this.config.id = id;
		return this;
	}

	/**
	 * Set step command
	 */
	run(command: string): StepBuilder {
		this.config.run = command;
		return this;
	}

	/**
	 * Set step to run multiple commands (convenience method)
	 */
	runCommands(commands: string[]): StepBuilder {
		this.config.run = commands.join("\n");
		return this;
	}

	/**
	 * Set step to use an action
	 *
	 * Type-safe overloads for GitHub Actions are provided via flughafen-actions.d.ts
	 * The implementation signature below accepts all forms, but external callers
	 * see the typed overloads from module augmentation.
	 *
	 * @example Type-safe shorthand (requires action in ActionInputMap)
	 * .uses("actions/setup-node@v4", { nodeVersion: "20", cache: "npm" })
	 *
	 * @example Type-safe callback form
	 * .uses("actions/setup-node@v4", (action) => action.with({ nodeVersion: "20" }))
	 *
	 * @example Local action
	 * .uses(myLocalAction, (action) => action.with({ input1: "value" }))
	 */
	uses<TInputs = Record<string, unknown>, TOutputs = Record<string, unknown>>(
		action: string | LocalActionBuilder<TInputs, TOutputs>,
		callbackOrInputs?:
			| ((action: ActionBuilder) => ActionBuilder)
			| ((uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>)
			| Record<string, string | number | boolean>
	): StepBuilder {
		// Handle LocalActionBuilder instance
		if (action instanceof LocalActionBuilder) {
			// Track local action for file generation during workflow build
			this.localActions.add(action);

			if (callbackOrInputs) {
				// Callback form: .uses(myAction, action => action.with({...}))
				const typedConfigBuilder = new TypedActionConfigBuilder<TInputs>(action);
				const configuredAction = (
					callbackOrInputs as (uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>
				)(typedConfigBuilder);
				const actionConfig = buildValue(configuredAction);

				// Apply configuration from callback to step
				this.config.uses = actionConfig.uses;
				if (actionConfig.with) {
					this.config.with = {
						...(this.config.with && typeof this.config.with === "object" && typeof this.config.with !== "string"
							? this.config.with
							: {}),
						...(typeof actionConfig.with === "object" && typeof actionConfig.with !== "string"
							? actionConfig.with
							: {}),
					};
				}
				if (actionConfig.env) {
					this.config.env = {
						...(this.config.env && typeof this.config.env === "object" && typeof this.config.env !== "string"
							? this.config.env
							: {}),
						...(typeof actionConfig.env === "object" && typeof actionConfig.env !== "string" ? actionConfig.env : {}),
					};
				}
				return this;
			} else {
				// Direct form: .uses(myAction) without configuration
				this.config.uses = action.getReference();
				return this;
			}
		}

		// Handle GitHub marketplace action (e.g., "actions/checkout@v4")
		if (callbackOrInputs) {
			if (typeof callbackOrInputs === "function") {
				// Callback form: .uses("actions/checkout@v4", action => action.with({...}))
				const actionBuilder = new ActionBuilder(action as string);
				const configuredAction = (callbackOrInputs as (action: ActionBuilder) => ActionBuilder)(actionBuilder);
				const actionConfig = buildValue(configuredAction);

				// Apply configuration from callback to step
				this.config.uses = actionConfig.uses;
				if (actionConfig.with) {
					this.config.with = {
						...(this.config.with && typeof this.config.with === "object" && typeof this.config.with !== "string"
							? this.config.with
							: {}),
						...(typeof actionConfig.with === "object" && typeof actionConfig.with !== "string"
							? actionConfig.with
							: {}),
					};
				}
				if (actionConfig.env) {
					this.config.env = {
						...(this.config.env && typeof this.config.env === "object" && typeof this.config.env !== "string"
							? this.config.env
							: {}),
						...(typeof actionConfig.env === "object" && typeof actionConfig.env !== "string" ? actionConfig.env : {}),
					};
				}
			} else {
				// Shorthand form: .uses("actions/checkout@v4", { ref: "main" })
				this.config.uses = action;
				this._withInputs(callbackOrInputs);
			}
		} else {
			// Direct form: .uses("actions/checkout@v4") without configuration
			this.config.uses = action;
		}

		return this;
	}

	/**
	 * Set action inputs (internal method, now public for TypedStepBuilder)
	 */
	_withInputs(inputs: Record<string, StepInputValue>): StepBuilder {
		this.config.with = {
			...(this.config.with && typeof this.config.with === "object" ? this.config.with : {}),
			...inputs,
		};
		return this;
	}

	/**
	 * Set action inputs (REMOVED - use callback form in .uses() instead)
	 *
	 * Instead of:
	 *   .uses('actions/setup-node@v4').with({ 'node-version': '18' })
	 *
	 * Use:
	 *   .uses('actions/setup-node@v4', uses => uses.with({ 'node-version': '18' }))
	 *
	 * This ensures type safety and makes the API more explicit.
	 */
	// with() method removed - use callback form instead

	/**
	 * Set step environment variables
	 */
	env(variables: Record<string, string | number | boolean>): StepBuilder {
		this.config.env = {
			...(this.config.env && typeof this.config.env === "object" ? this.config.env : {}),
			...variables,
		};
		return this;
	}

	/**
	 * Set step working directory
	 */
	workingDirectory(dir: string): StepBuilder {
		this.config["working-directory"] = dir;
		return this;
	}

	/**
	 * Set shell for run commands
	 */
	shell(shell: string): StepBuilder {
		this.config.shell = shell;
		return this;
	}

	/**
	 * Set step condition
	 */
	if(condition: string): StepBuilder {
		this.config.if = condition;
		return this;
	}

	/**
	 * Prevent job from failing when this step fails
	 * @example
	 * .continueOnError(true)
	 * .continueOnError("${{ matrix.experimental }}")
	 */
	continueOnError(value: boolean | string): StepBuilder {
		this.config["continue-on-error"] = value;
		return this;
	}

	/**
	 * Set maximum number of minutes to run the step before killing the process
	 * @example
	 * .timeoutMinutes(30)
	 * .timeoutMinutes("${{ inputs.timeout }}")
	 */
	timeoutMinutes(minutes: number | string): StepBuilder {
		this.config["timeout-minutes"] = minutes;
		return this;
	}

	/**
	 * Add a comment to this step (will be rendered as YAML comment)
	 */
	comment(comment: string): StepBuilder {
		this.stepComment = comment;
		return this;
	}

	/**
	 * Get the comment for this step
	 */
	getComment(): string | undefined {
		return this.stepComment;
	}

	/**
	 * Get all LocalActionBuilder instances used by this step
	 */
	getLocalActions(): LocalActionBuilder[] {
		return Array.from(this.localActions);
	}

	/**
	 * Build the step configuration
	 * Normalizes input keys to kebab-case for GitHub Actions compatibility
	 */
	build(): StepConfig {
		return {
			...this.config,
			...(this.config.with ? { with: normalizeToKebabCase(this.config.with as Record<string, StepInputValue>) } : {}),
		} as StepConfig;
	}
}
