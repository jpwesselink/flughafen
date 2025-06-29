import type { Env } from "../../../types/github-workflow";
import type { Builder } from "./Builder";

/**
 * Action step configuration interface based on the workflow schema
 */
export interface ActionStepConfig {
	uses: string;
	with?: Env;
	env?: { [k: string]: string | number | boolean } | string;
}
export class ActionBuilder implements Builder<ActionStepConfig> {
	private config: ActionStepConfig;

	constructor(actionName: string) {
		this.config = { uses: actionName };
	}

	/**
	 * Set action inputs
	 */
	with(inputs: Record<string, string | number | boolean>): ActionBuilder {
		this.config.with = {
			...(this.config.with && typeof this.config.with === "object" && typeof this.config.with !== "string"
				? this.config.with
				: {}),
			...inputs,
		};
		return this;
	}

	/**
	 * Set action environment variables
	 */
	env(variables: Record<string, string | number | boolean>): ActionBuilder {
		this.config.env = {
			...(this.config.env && typeof this.config.env === "object" && typeof this.config.env !== "string"
				? this.config.env
				: {}),
			...variables,
		};
		return this;
	}

	/**
	 * Build the action configuration
	 */
	build(): ActionStepConfig {
		return this.config;
	}
}

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("ActionBuilder", () => {
		it("should create action with basic configuration", () => {
			const action = new ActionBuilder("actions/checkout@v4");
			const config = action.build();

			expect(config.uses).toBe("actions/checkout@v4");
		});

		it("should add inputs with with() method", () => {
			const action = new ActionBuilder("actions/setup-node@v4").with({
				"node-version": "18",
				cache: "npm",
			});

			const config = action.build();
			expect(config.uses).toBe("actions/setup-node@v4");
			expect(config.with).toEqual({
				"node-version": "18",
				cache: "npm",
			});
		});

		it("should add environment variables with env() method", () => {
			const action = new ActionBuilder("custom/action@v1").env({
				NODE_ENV: "production",
				DEBUG: false,
			});

			const config = action.build();
			expect(config.env).toEqual({
				NODE_ENV: "production",
				DEBUG: false,
			});
		});

		it("should chain with() and env() methods", () => {
			const action = new ActionBuilder("actions/deploy@v2").with({ target: "production" }).env({ API_KEY: "secret" });

			const config = action.build();
			expect(config.uses).toBe("actions/deploy@v2");
			expect(config.with).toEqual({ target: "production" });
			expect(config.env).toEqual({ API_KEY: "secret" });
		});

		it("should merge multiple with() calls", () => {
			const action = new ActionBuilder("test/action@v1").with({ first: "value1" }).with({ second: "value2" });

			const config = action.build();
			expect(config.with).toEqual({
				first: "value1",
				second: "value2",
			});
		});

		it("should merge multiple env() calls", () => {
			const action = new ActionBuilder("test/action@v1").env({ VAR1: "value1" }).env({ VAR2: "value2" });

			const config = action.build();
			expect(config.env).toEqual({
				VAR1: "value1",
				VAR2: "value2",
			});
		});
	});
}
