import { describe, expect, it } from "vitest";
import type { ActionBuilder } from "../ActionBuilder";
import { LocalActionBuilder } from "../LocalActionBuilder";
import { StepBuilder } from "../StepBuilder";
import type { TypedActionConfigBuilder } from "../TypedActionConfigBuilder";

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
		const step = new StepBuilder()
			.name("Checkout with callback")
			.uses("actions/checkout@v4", (action: ActionBuilder) => action);

		const config = step.build();
		expect(config).toEqual({
			name: "Checkout with callback",
			uses: "actions/checkout@v4",
		});
	});

	it("should use callback action form with configuration", () => {
		const step = new StepBuilder()
			.name("Setup Node")
			.uses("actions/setup-node@v4", (action: ActionBuilder) =>
				action.with({ "node-version": "18", cache: "npm" }).env({ NODE_ENV: "test" })
			);

		const config = step.build();
		expect(config.name).toBe("Setup Node");
		expect(config.uses).toBe("actions/setup-node@v4");
		expect(config.with).toEqual({ "node-version": "18", cache: "npm" });
		expect(config.env).toEqual({ NODE_ENV: "test" });
	});

	it("should use direct local action form", () => {
		const localAction = new LocalActionBuilder().name("test-action").description("Test local action");

		const step = new StepBuilder().name("Use Local Action").uses(localAction);

		const config = step.build();
		expect(config.name).toBe("Use Local Action");
		expect(config.uses).toBe("./.github/actions/test-action");
	});

	it("should use local action with custom filename", () => {
		const localAction = new LocalActionBuilder().filename("custom/path/action").description("Custom path action");

		const step = new StepBuilder().name("Use Custom Path").uses(localAction);

		const config = step.build();
		expect(config.uses).toBe("./custom/path/action");
	});

	it("should collect LocalActionBuilder instances when uses() is called", () => {
		const localAction1 = new LocalActionBuilder()
			.name("test-action-1")
			.description("First test action")
			.run('echo "Action 1"');

		const localAction2 = new LocalActionBuilder()
			.name("test-action-2")
			.description("Second test action")
			.run('echo "Action 2"');

		const step1 = new StepBuilder().name("Step 1").uses(localAction1);
		const step2 = new StepBuilder().name("Step 2").uses(localAction2);

		// Should collect multiple LocalActionBuilder instances if called multiple times
		expect(step1.getLocalActions()).toContain(localAction1);
		expect(step2.getLocalActions()).toContain(localAction2);
	});

	it("should not duplicate LocalActionBuilder instances", () => {
		const localAction = new LocalActionBuilder().name("test-action").description("Test action").run('echo "Test"');

		const step = new StepBuilder().name("Test").uses(localAction).uses(localAction);

		const actions = step.getLocalActions();
		expect(actions).toHaveLength(1);
		expect(actions[0]).toBe(localAction);
	});

	it("should use callback form with LocalActionBuilder", () => {
		const localAction = new LocalActionBuilder().name("test-action").description("Test action without inputs");

		const step = new StepBuilder()
			.name("Use with Callback")
			.uses(localAction, (builder: TypedActionConfigBuilder<unknown>) => builder);

		const config = step.build();
		expect(config.uses).toBe("./.github/actions/test-action");
	});

	it("should support callback form for LocalActionBuilder", () => {
		const localAction = new LocalActionBuilder().name("demo-action").description("Demo action for testing all forms");

		// Direct form (no callback)
		const step1 = new StepBuilder().name("Direct").uses(localAction);

		// Callback with builder
		const step2 = new StepBuilder()
			.name("Callback")
			.uses(localAction, (builder: TypedActionConfigBuilder<unknown>) => builder);

		expect(step1.build().uses).toBe("./.github/actions/demo-action");
		expect(step2.build().uses).toBe("./.github/actions/demo-action");
	});

	it("should add environment variables with env() method", () => {
		const step = new StepBuilder().name("Test").run("npm test").env({ NODE_ENV: "test", DEBUG: "true" });

		const config = step.build();
		expect(config.env).toEqual({
			NODE_ENV: "test",
			DEBUG: "true",
		});
	});

	it("should set conditional with if() method", () => {
		const step = new StepBuilder().name("Deploy").run("npm run deploy").if("github.ref == 'refs/heads/main'");

		const config = step.build();
		expect(config.if).toBe("github.ref == 'refs/heads/main'");
	});

	it("should set step ID with id() method", () => {
		const step = new StepBuilder().name("Get Version").id("get-version").run("echo version=1.0.0");

		const config = step.build();
		expect(config.id).toBe("get-version");
	});

	it("should chain multiple configuration methods", () => {
		const step = new StepBuilder()
			.name("Complex Step")
			.id("complex")
			.run("npm test")
			.env({ NODE_ENV: "test" })
			.if("success()");

		const config = step.build();
		expect(config.name).toBe("Complex Step");
		expect(config.id).toBe("complex");
		expect(config.run).toBe("npm test");
		expect(config.env).toEqual({ NODE_ENV: "test" });
		expect(config.if).toBe("success()");
	});
});

describe("StepBuilder - continueOnError and timeoutMinutes", () => {
	describe("continueOnError()", () => {
		it("should set continue-on-error to true", () => {
			const step = new StepBuilder().name("Flaky Test").run("npm test").continueOnError(true);

			const config = step.build();
			expect(config["continue-on-error"]).toBe(true);
		});

		it("should set continue-on-error to false", () => {
			const step = new StepBuilder().name("Critical Test").run("npm test").continueOnError(false);

			const config = step.build();
			expect(config["continue-on-error"]).toBe(false);
		});

		it("should set continue-on-error as expression", () => {
			const step = new StepBuilder()
				.name("Experimental Test")
				.run("npm test")
				.continueOnError("${{ matrix.experimental }}");

			const config = step.build();
			expect(config["continue-on-error"]).toBe("${{ matrix.experimental }}");
		});
	});

	describe("timeoutMinutes()", () => {
		it("should set timeout-minutes as number", () => {
			const step = new StepBuilder().name("Long Running Task").run("npm run build").timeoutMinutes(30);

			const config = step.build();
			expect(config["timeout-minutes"]).toBe(30);
		});

		it("should set timeout-minutes as expression", () => {
			const step = new StepBuilder()
				.name("Dynamic Timeout")
				.run("npm test")
				.timeoutMinutes("${{ inputs.timeout || 60 }}");

			const config = step.build();
			expect(config["timeout-minutes"]).toBe("${{ inputs.timeout || 60 }}");
		});
	});

	describe("combined usage", () => {
		it("should chain continueOnError and timeoutMinutes with other methods", () => {
			const step = new StepBuilder()
				.name("Complex Step")
				.id("complex-step")
				.run("npm test")
				.env({ NODE_ENV: "test" })
				.if("always()")
				.continueOnError(true)
				.timeoutMinutes(15);

			const config = step.build();
			expect(config.name).toBe("Complex Step");
			expect(config.id).toBe("complex-step");
			expect(config.run).toBe("npm test");
			expect(config.env).toEqual({ NODE_ENV: "test" });
			expect(config.if).toBe("always()");
			expect(config["continue-on-error"]).toBe(true);
			expect(config["timeout-minutes"]).toBe(15);
		});

		it("should work with uses() action", () => {
			const step = new StepBuilder()
				.name("Checkout with Timeout")
				.uses("actions/checkout@v4")
				.continueOnError(false)
				.timeoutMinutes(5);

			const config = step.build();
			expect(config.uses).toBe("actions/checkout@v4");
			expect(config["continue-on-error"]).toBe(false);
			expect(config["timeout-minutes"]).toBe(5);
		});
	});
});
