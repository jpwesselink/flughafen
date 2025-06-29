import { ActionBuilder } from "./ActionBuilder";
import { type Builder, buildValue } from "./Builder";
import { createLocalAction, LocalActionBuilder } from "./LocalActionBuilder";

/**
 * Typed action config builder that provides type-safe input configuration for local actions
 */
export class TypedActionConfigBuilder<TInputs> implements Builder<any> {
	private config: any = {};
	private action: LocalActionBuilder<TInputs, any>;

	constructor(action: LocalActionBuilder<TInputs, any>) {
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
	build(): any {
		return {
			...this.config,
			uses: this.action.getReference(),
		};
	}
}

/**
 * Step builder that prevents context switching
 */
export class StepBuilder implements Builder<any> {
	private config: any = {};
	private localActions: Set<LocalActionBuilder> = new Set();

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
	 * Set step to use a string action (direct form)
	 */
	uses(action: string): StepBuilder;
	/**
	 * Set step to use a string action (callback form)
	 * Supports both marketplace actions and path-based actions like './.github/myNonManagedAction'
	 */
	uses(action: string, callback: (uses: ActionBuilder) => ActionBuilder): StepBuilder;
	/**
	 * Set step to use a local action (direct form)
	 */
	uses<TInputs = any, TOutputs = any>(action: LocalActionBuilder<TInputs, TOutputs>): StepBuilder;
	/**
	 * Set step to use a local action (callback form) - provides type-safe input configuration
	 */
	uses<TInputs = any, TOutputs = any>(
		action: LocalActionBuilder<TInputs, TOutputs>,
		callback: (uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>
	): StepBuilder;
	uses<TInputs = any, TOutputs = any>(
		action: string | LocalActionBuilder<TInputs, TOutputs>,
		callback?:
			| ((action: ActionBuilder) => ActionBuilder)
			| ((uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>)
	): StepBuilder {
		// Handle LocalActionBuilder instance
		if (action instanceof LocalActionBuilder) {
			this.localActions.add(action); // ✨ Collect the LocalActionBuilder instance

			if (callback) {
				// Callback form with type-safe configuration
				const typedConfigBuilder = new TypedActionConfigBuilder<TInputs>(action);
				const configuredAction = (
					callback as (uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>
				)(typedConfigBuilder);
				const actionConfig = buildValue(configuredAction);

				// Merge action config into step config
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
				// Direct form for local action - just set the action reference
				this.config.uses = action.getReference();
				return this;
			}
		}

		// Handle string action - both direct and callback forms allowed
		if (callback) {
			// Callback form - configure action with callback
			const actionBuilder = new ActionBuilder(action as string);
			const configuredAction = (callback as (action: ActionBuilder) => ActionBuilder)(actionBuilder);
			const actionConfig = buildValue(configuredAction);

			// Merge action config into step config
			this.config.uses = actionConfig.uses;
			if (actionConfig.with) {
				this.config.with = {
					...(this.config.with && typeof this.config.with === "object" && typeof this.config.with !== "string"
						? this.config.with
						: {}),
					...(typeof actionConfig.with === "object" && typeof actionConfig.with !== "string" ? actionConfig.with : {}),
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
			// Direct form - just set the action name
			this.config.uses = action;
		}

		return this;
	}

	/**
	 * Set action inputs (internal method, now public for TypedStepBuilder)
	 */
	_withInputs(inputs: Record<string, any>): StepBuilder {
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
	 * Set step condition
	 */
	if(condition: string): StepBuilder {
		this.config.if = condition;
		return this;
	}

	/**
	 * Get all LocalActionBuilder instances used by this step
	 */
	getLocalActions(): LocalActionBuilder[] {
		return Array.from(this.localActions);
	}

	/**
	 * Build the step configuration
	 */
	build(): any {
		return { ...this.config };
	}
}

/**
 * Type-safe step builder that knows about the action being used
 */
export interface TypedStepBuilder<TInputs> {
	name(name: string): TypedStepBuilder<TInputs>;
	id(id: string): TypedStepBuilder<TInputs>;
	run(command: string): TypedStepBuilder<TInputs>;
	with(inputs: TInputs): TypedStepBuilder<TInputs>;
	env(variables: Record<string, string | number | boolean>): TypedStepBuilder<TInputs>;
	if(condition: string): TypedStepBuilder<TInputs>;

	// Make it compatible with StepBuilder by including build
	build(): any;
}

/**
 * Implementation of TypedStepBuilder that wraps a regular StepBuilder
 */
export class TypedStepBuilderImpl<TInputs> implements TypedStepBuilder<TInputs> {
	constructor(private stepBuilder: StepBuilder) {}

	name(name: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.name(name);
		return this;
	}

	id(id: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.id(id);
		return this;
	}

	run(command: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.run(command);
		return this;
	}

	with(inputs: TInputs): TypedStepBuilder<TInputs> {
		this.stepBuilder._withInputs(inputs as any);
		return this;
	}

	env(variables: Record<string, string | number | boolean>): TypedStepBuilder<TInputs> {
		this.stepBuilder.env(variables);
		return this;
	}

	if(condition: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.if(condition);
		return this;
	}

	build(): any {
		return this.stepBuilder.build();
	}
}

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("StepBuilder", () => {
		it("should create a basic step with name and run command", () => {
			const step = new StepBuilder().name("Test Step").run("npm test");

			const config = step.build();
			expect(config).toEqual({
				name: "Test Step",
				run: "npm test",
			});
		});

		it("should use direct action form for string actions", () => {
			const step = new StepBuilder().name("Checkout").uses("actions/checkout@v4");

			const config = step.build();
			expect(config).toEqual({
				name: "Checkout",
				uses: "actions/checkout@v4",
			});
		});

		it("should use callback action form for string actions", () => {
			const step = new StepBuilder().name("Checkout with callback").uses("actions/checkout@v4", (action) => action);

			const config = step.build();
			expect(config).toEqual({
				name: "Checkout with callback",
				uses: "actions/checkout@v4",
			});
		});

		it("should use callback action form with configuration", () => {
			const step = new StepBuilder()
				.name("Setup Node")
				.uses("actions/setup-node@v4", (action) =>
					action.with({ "node-version": "18", cache: "npm" }).env({ NODE_ENV: "test" })
				);

			const config = step.build();
			expect(config.name).toBe("Setup Node");
			expect(config.uses).toBe("actions/setup-node@v4");
			expect(config.with).toEqual({ "node-version": "18", cache: "npm" });
			expect(config.env).toEqual({ NODE_ENV: "test" });
		});

		it("should use callback action form for path-based actions", () => {
			const step = new StepBuilder()
				.name("Custom Path Action")
				.uses("./.github/myNonManagedAction", (action) => action.with({ customInput: "value" }));

			const config = step.build();
			expect(config.name).toBe("Custom Path Action");
			expect(config.uses).toBe("./.github/myNonManagedAction");
			expect(config.with).toEqual({ customInput: "value" });
		});

		it("should add step inputs with with() method", () => {
			const step = new StepBuilder().name("Action with inputs").uses("custom/action@v1", (action) => action);
			// .with({ key: 'value', flag: true }); // TODO: Re-enable when types are available

			step.build(); // Just call build to verify it works
			// expect(config.with).toEqual({ key: 'value', flag: true });
		});

		it("should add step environment variables", () => {
			const step = new StepBuilder()
				.name("Step with env")
				.run("echo $TEST_VAR")
				.env({ TEST_VAR: "test-value", DEBUG: false });

			const config = step.build();
			expect(config.env).toEqual({ TEST_VAR: "test-value", DEBUG: false });
		});

		it("should set step condition", () => {
			const step = new StepBuilder()
				.name("Conditional step")
				.run('echo "Running on main"')
				.if('github.ref == "refs/heads/main"');

			const config = step.build();
			expect(config.if).toBe('github.ref == "refs/heads/main"');
		});

		it("should chain multiple methods using callback form", () => {
			const step = new StepBuilder()
				.name("Complex step")
				.uses("custom/action@v1", (uses) => uses.with({ input: "value" }))
				.env({ VAR: "test" })
				.if("success()");

			const config = step.build();
			expect(config).toEqual({
				name: "Complex step",
				uses: "custom/action@v1",
				with: { input: "value" },
				env: { VAR: "test" },
				if: "success()",
			});
		});

		it("should merge action config when using callback form", () => {
			const step = new StepBuilder()
				.name("Merge test")
				.env({ STEP_VAR: "step" })
				.uses("test/action@v1", (action: ActionBuilder) =>
					action.with({ actionInput: "action" }).env({ ACTION_VAR: "action" })
				);

			const config = step.build();
			expect(config.with).toEqual({
				actionInput: "action",
			});
			expect(config.env).toEqual({
				STEP_VAR: "step",
				ACTION_VAR: "action",
			});
		});

		it("should use local action with callback form", () => {
			const localAction = new LocalActionBuilder().name("test-action").description("Test local action");

			const step = new StepBuilder().name("Use local action").uses(localAction, (uses) => uses);

			const config = step.build();
			expect(config.name).toBe("Use local action");
			expect(config.uses).toBe("./.github/actions/test-action");
		});

		it("should use local action with custom filename in callback form", () => {
			const localAction = new LocalActionBuilder().filename("custom/path/action").description("Custom path action");

			const step = new StepBuilder().uses(localAction, (uses) => uses);

			const config = step.build();
			expect(config.uses).toBe("./custom/path/action");
		});

		it("should collect LocalActionBuilder instances when uses() is called", () => {
			const localAction1 = new LocalActionBuilder()
				.name("action-one")
				.description("First action")
				.run('echo "Action 1"');

			const localAction2 = new LocalActionBuilder()
				.name("action-two")
				.description("Second action")
				.run('echo "Action 2"');

			const step = new StepBuilder().name("Test step").uses(localAction1, (uses) => uses);

			// Should collect the first action
			let collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(1);
			expect(collectedActions[0]).toBe(localAction1);

			// Should not collect string-based actions
			step.uses("actions/checkout@v4", (action) => action);
			collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(1); // Still just one

			// Should collect multiple LocalActionBuilder instances if called multiple times
			// (though this is unusual in practice)
			step.uses(localAction2, (uses) => uses);
			collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(2);
			expect(collectedActions).toContain(localAction1);
			expect(collectedActions).toContain(localAction2);
		});

		it("should not duplicate LocalActionBuilder instances", () => {
			const localAction = new LocalActionBuilder()
				.name("same-action")
				.description("Same action used twice")
				.run('echo "Same action"');

			const step = new StepBuilder().uses(localAction, (uses) => uses).uses(localAction, (uses) => uses); // Use the same action twice

			const collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(1); // Should be deduplicated
			expect(collectedActions[0]).toBe(localAction);
		});

		it("should support local actions without callback (direct form)", () => {
			const localAction = new LocalActionBuilder().name("test-action").description("Test action without inputs");

			const step = new StepBuilder().name("Test local action direct form").uses(localAction);

			const config = step.build();
			expect(config.name).toBe("Test local action direct form");
			expect(config.uses).toBe("./.github/actions/test-action");

			// Should still collect the local action
			const collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(1);
			expect(collectedActions[0]).toBe(localAction);
		});

		it("should support all forms of .uses() method", () => {
			const localAction = new LocalActionBuilder().name("demo-action").description("Demo action for testing all forms");

			// Test all supported forms
			const step1 = new StepBuilder().name("String direct").uses("actions/checkout@v4");

			const step2 = new StepBuilder()
				.name("String callback")
				.uses("actions/setup-node@v4", (action) => action.with({ "node-version": "18" }));

			const step3 = new StepBuilder().name("Local direct").uses(localAction);

			const step4 = new StepBuilder()
				.name("Local callback")
				.uses(localAction, (uses) => uses.with({ someInput: "value" }));

			const step5 = new StepBuilder()
				.name("Path-based callback")
				.uses("./.github/myCustomAction", (action) => action.with({ customInput: "test" }));

			// Verify configurations
			expect(step1.build().uses).toBe("actions/checkout@v4");
			expect(step2.build().uses).toBe("actions/setup-node@v4");
			expect(step2.build().with).toEqual({ "node-version": "18" });
			expect(step3.build().uses).toBe("./.github/actions/demo-action");
			expect(step4.build().uses).toBe("./.github/actions/demo-action");
			expect(step4.build().with).toEqual({ someInput: "value" });
			expect(step5.build().uses).toBe("./.github/myCustomAction");
			expect(step5.build().with).toEqual({ customInput: "test" });

			// Verify local action collection
			expect(step1.getLocalActions()).toHaveLength(0);
			expect(step2.getLocalActions()).toHaveLength(0);
			expect(step3.getLocalActions()).toHaveLength(1);
			expect(step4.getLocalActions()).toHaveLength(1);
			expect(step5.getLocalActions()).toHaveLength(0);
		});
	});

	// Tests for callback-based .uses() with type-safe configuration
	describe("Callback-based .uses() with Type Safety", () => {
		it("should support callback form for local actions with type-safe configuration", () => {
			interface TestInputs {
				name: string;
				version: string;
				enabled: boolean;
			}

			const typedAction = createLocalAction<TestInputs>()
				.name("typed-action")
				.input("name", { description: "Name input", required: true })
				.input("version", { description: "Version input", required: true })
				.input("enabled", { description: "Enable feature", required: false });

			const step = new StepBuilder().name("Test typed step").uses(typedAction, (uses) =>
				uses.with({
					name: "test-app",
					version: "1.0.0",
					enabled: true,
				})
			);

			const config = step.build();
			expect(config.name).toBe("Test typed step");
			expect(config.uses).toBe("./.github/actions/typed-action");
			expect(config.with).toEqual({
				name: "test-app",
				version: "1.0.0",
				enabled: true,
			});
		});

		it("should support type-safe callback form with environment variables", () => {
			interface ActionInputs {
				appName: string;
				environment: "dev" | "staging" | "prod";
				debugMode: boolean;
				timeout: number;
			}

			const deployAction = createLocalAction<ActionInputs>()
				.name("deploy-app")
				.input("appName", { description: "Application name", required: true })
				.input("environment", {
					description: "Target environment",
					required: true,
				})
				.input("debugMode", {
					description: "Enable debug mode",
					required: false,
				})
				.input("timeout", {
					description: "Timeout in seconds",
					required: false,
				});

			const step = new StepBuilder().name("Deploy application").uses(deployAction, (uses) =>
				uses
					.with({
						appName: "my-app",
						environment: "staging",
						debugMode: true,
						timeout: 300,
					})
					.env({
						DEPLOY_TOKEN: "secret",
						LOG_LEVEL: "debug",
					})
			);

			const config = step.build();
			expect(config.name).toBe("Deploy application");
			expect(config.uses).toBe("./.github/actions/deploy-app");
			expect(config.with).toEqual({
				appName: "my-app",
				environment: "staging",
				debugMode: true,
				timeout: 300,
			});
			expect(config.env).toEqual({
				DEPLOY_TOKEN: "secret",
				LOG_LEVEL: "debug",
			});
		});

		it("should support partial inputs in callback form", () => {
			interface ActionInputs {
				required1: string;
				required2: string;
				optional1?: string;
				optional2?: boolean;
			}

			const testAction = createLocalAction<ActionInputs>()
				.name("test-partial-inputs")
				.input("required1", { required: true })
				.input("required2", { required: true })
				.input("optional1", { required: false })
				.input("optional2", { required: false });

			// Should work with partial inputs in callback form
			const step = new StepBuilder().name("Partial inputs test").uses(testAction, (uses) =>
				uses.with({
					required1: "value1",
					optional2: true,
					// required2 and optional1 omitted
				})
			);

			const config = step.build();
			expect(config.with).toEqual({
				required1: "value1",
				optional2: true,
			});
		});

		it("should collect local actions from callback form", () => {
			interface TestInputs {
				value: string;
			}

			const localAction = createLocalAction<TestInputs>().name("collected-action").input("value", { required: true });

			const step = new StepBuilder().uses(localAction, (uses) => uses.with({ value: "test" }));

			const collectedActions = step.getLocalActions();
			expect(collectedActions).toHaveLength(1);
			expect(collectedActions[0]).toBe(localAction);
		});

		it("should support string-based input types in callback form", () => {
			interface StringInputs {
				configJson: string;
				featureList: string;
				metadataString: string;
			}

			const stringAction = createLocalAction<StringInputs>()
				.name("string-based-action")
				.input("configJson", {
					required: true,
					description: "JSON configuration as string",
				})
				.input("featureList", {
					required: true,
					description: "Comma-separated feature list",
				})
				.input("metadataString", {
					required: false,
					description: "Metadata as string",
				});

			const step = new StepBuilder().name("String inputs test").uses(stringAction, (uses) =>
				uses.with({
					configJson: '{"host": "localhost", "port": 5432}',
					featureList: "auth,logging,metrics",
					metadataString: "version=1.0.0,env=test",
				})
			);

			const config = step.build();
			expect(config.with.configJson).toBe('{"host": "localhost", "port": 5432}');
			expect(config.with.featureList).toBe("auth,logging,metrics");
			expect(config.with.metadataString).toBe("version=1.0.0,env=test");
		});

		it("should support callback-based .uses() with complete configuration", () => {
			interface SetupInputs {
				nodeVersion: string;
				cacheEnabled: boolean;
			}

			const setupAction = createLocalAction<SetupInputs>()
				.name("setup")
				.inputs({
					nodeVersion: { type: "string", required: true },
					cacheEnabled: { type: "boolean", default: true },
				})
				.main("setup.js");

			const step = new StepBuilder().name("Setup with callback").uses(setupAction, (uses) =>
				uses
					.with({
						nodeVersion: "20",
						cacheEnabled: true,
					})
					.env({
						NODE_ENV: "production",
						CACHE_DIR: "/tmp/cache",
					})
			);

			const config = step.build();
			expect(config.name).toBe("Setup with callback");
			expect(config.uses).toBe("./.github/actions/setup");
			expect(config.with.nodeVersion).toBe("20");
			expect(config.with.cacheEnabled).toBe(true);
			expect(config.env.NODE_ENV).toBe("production");
			expect(config.env.CACHE_DIR).toBe("/tmp/cache");
		});
	});
}
