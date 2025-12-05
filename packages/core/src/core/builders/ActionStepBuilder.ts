import { normalizeToKebabCase } from "../../utils/property-mapper";
import type { ActionStep, ActionStepInputValue, BuiltActionStep } from "../types/action-types";

/**
 * Fluent builder for action steps
 * Used with LocalActionBuilder.step() callback form
 *
 * @example
 * .step(step => step
 *   .name("Build and push")
 *   .uses("docker/build-push-action@v5")
 *   .with({ context: ".", push: true })
 *   .if("github.event_name == 'push'")
 * )
 */
export class ActionStepBuilder {
	private config: ActionStep = {};
	private stepComment?: string; // Store comment for YAML generation

	/**
	 * Set step name
	 */
	name(name: string): ActionStepBuilder {
		this.config.name = name;
		return this;
	}

	/**
	 * Set step id for referencing outputs
	 */
	id(id: string): ActionStepBuilder {
		this.config.id = id;
		return this;
	}

	/**
	 * Set step to run a shell command
	 */
	run(command: string): ActionStepBuilder {
		this.config.run = command;
		this.config.shell = this.config.shell || "bash";
		return this;
	}

	/**
	 * Set the shell to use
	 */
	shell(shell: string): ActionStepBuilder {
		this.config.shell = shell;
		return this;
	}

	/**
	 * Set step to use an action
	 */
	uses(action: string): ActionStepBuilder {
		this.config.uses = action;
		return this;
	}

	/**
	 * Set action inputs
	 */
	with(inputs: Record<string, any>): ActionStepBuilder {
		this.config.with = { ...this.config.with, ...inputs };
		return this;
	}

	/**
	 * Set environment variables
	 */
	env(variables: Record<string, string>): ActionStepBuilder {
		this.config.env = { ...this.config.env, ...variables };
		return this;
	}

	/**
	 * Set conditional execution
	 */
	if(condition: string): ActionStepBuilder {
		this.config.if = condition;
		return this;
	}

	/**
	 * Set working directory
	 */
	workingDirectory(dir: string): ActionStepBuilder {
		this.config.workingDirectory = dir;
		return this;
	}

	/**
	 * Prevent action from failing when this step fails
	 * @example
	 * .continueOnError(true)
	 * .continueOnError("${{ inputs.allow-failure }}")
	 */
	continueOnError(value: boolean | string): ActionStepBuilder {
		this.config.continueOnError = value;
		return this;
	}

	/**
	 * Add a comment to this step (will be rendered as YAML comment)
	 */
	comment(comment: string): ActionStepBuilder {
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
	 * Build the step configuration
	 * Normalizes input keys to kebab-case for GitHub Actions compatibility
	 */
	build(): BuiltActionStep {
		const result: BuiltActionStep = {
			...(this.config.name !== undefined && { name: this.config.name }),
			...(this.config.id !== undefined && { id: this.config.id }),
			...(this.config.run !== undefined && { run: this.config.run }),
			...(this.config.shell !== undefined && { shell: this.config.shell }),
			...(this.config.uses !== undefined && { uses: this.config.uses }),
			...(this.config.with !== undefined && {
				with: normalizeToKebabCase(this.config.with) as Record<string, ActionStepInputValue>,
			}),
			...(this.config.env !== undefined && { env: this.config.env }),
			...(this.config.if !== undefined && { if: this.config.if }),
			...(this.config.workingDirectory !== undefined && { "working-directory": this.config.workingDirectory }),
			...(this.config.continueOnError !== undefined && { "continue-on-error": this.config.continueOnError }),
		};

		return result;
	}
}
