import type { Builder } from "./Builder";
import type { LocalActionBuilder } from "./LocalActionBuilder";

/**
 * Typed action config builder that provides type-safe input configuration for local actions
 */
export class TypedActionConfigBuilder<TInputs> implements Builder<Record<string, unknown>> {
	private config: Record<string, unknown> = {};
	private action: LocalActionBuilder<TInputs, unknown>;

	/**
	 * Create a typed action config builder for the given action
	 */
	constructor(action: LocalActionBuilder<TInputs, unknown>) {
		this.action = action;
	}

	/**
	 * Set action inputs with type safety
	 */
	with(inputs: Partial<TInputs>): TypedActionConfigBuilder<TInputs> {
		this.config.with = {
			...(this.config.with && typeof this.config.with === "object" ? this.config.with : {}),
			...inputs,
		};
		return this;
	}

	/**
	 * Set action environment variables
	 */
	env(variables: Record<string, string | number | boolean>): TypedActionConfigBuilder<TInputs> {
		this.config.env = {
			...(this.config.env && typeof this.config.env === "object" ? this.config.env : {}),
			...variables,
		};
		return this;
	}

	/**
	 * Build the action configuration
	 */
	build(): Record<string, unknown> {
		return {
			...this.config,
			uses: this.action.getReference(),
		};
	}
}
