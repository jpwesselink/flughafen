import { describe, expect, it } from "vitest";
import type { NormalJob } from "../../../../generated/types/github-workflow";
import type { JobBuilder } from "../JobBuilder";
import { LocalActionBuilder } from "../LocalActionBuilder";
import type { TypedActionConfigBuilder } from "../TypedActionConfigBuilder";
import { createWorkflow, WorkflowBuilder } from "../WorkflowBuilder";

describe("WorkflowBuilder", () => {
	it("should create a minimal workflow with name", () => {
		const workflow = new WorkflowBuilder().name("Test Workflow");

		const config = workflow.build();
		expect(config.name).toBe("Test Workflow");
	});

	it("should set workflow filename", () => {
		const workflow = new WorkflowBuilder().name("Test").filename("test.yml");

		expect(workflow.getFilename()).toBe("test.yml");
	});

	it("should add workflow trigger events using on()", () => {
		const workflow = new WorkflowBuilder().name("Push Test").on("push", { branches: ["main", "develop"] });

		const config = workflow.build();
		expect(config.on).toBeDefined();
		expect(config.on).toHaveProperty("push");
	});

	it("should support multiple trigger events", () => {
		const workflow = new WorkflowBuilder()
			.name("Multi-Event Test")
			.on("push", { branches: ["main"] })
			.on("pull_request", { branches: ["main"] });

		const config = workflow.build();
		expect(config.on).toHaveProperty("push");
		expect(config.on).toHaveProperty("pull_request");
	});

	it("should add jobs using job() method", () => {
		const workflow = new WorkflowBuilder()
			.name("Job Test")
			.job("test", (job: JobBuilder) =>
				job.runsOn("ubuntu-latest").step((step) => step.name("Hello").run('echo "Hello"'))
			);

		const config = workflow.build();
		expect(config.jobs?.test).toBeDefined();
		const testJob = config.jobs?.test as NormalJob;
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
			.on("push", { branches: ["main"] })
			.job("test", (job: JobBuilder) =>
				job.runsOn("ubuntu-latest").step((step) => step.name("Hello").run('echo "Hello World"'))
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
				.step((step) => step.name("Step 1").uses(action1, (uses: TypedActionConfigBuilder<unknown>) => uses))
				.step((step) => step.name("Step 2").uses(action2, (uses: TypedActionConfigBuilder<unknown>) => uses))
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
				job
					.runsOn("ubuntu-latest")
					.step((step) => step.name("Step 1").uses(action, (uses: TypedActionConfigBuilder<unknown>) => uses))
			)
			.job("test2", (job: JobBuilder) =>
				job
					.runsOn("ubuntu-latest")
					.step((step) => step.name("Step 2").uses(action, (uses: TypedActionConfigBuilder<unknown>) => uses))
			);

		const localActions = workflow.getLocalActions();
		expect(localActions).toHaveLength(1);
		expect(localActions).toContain(action);
	});

	it("should validate workflow configuration", () => {
		const workflow = new WorkflowBuilder()
			.name("Valid Workflow")
			.on("push")
			.job("test", (job: JobBuilder) => job.runsOn("ubuntu-latest").step((step) => step.run("echo test")));

		const validation = workflow.validate();
		expect(validation.valid).toBe(true);
	});

	it("should detect invalid workflow configuration", () => {
		const workflow = new WorkflowBuilder().name("Invalid Workflow");
		// No trigger or jobs

		const validation = workflow.validate();
		expect(validation.valid).toBe(false);
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

		expect(workflow1.build().name).toBe("Workflow 1");
		expect(workflow2.build().name).toBe("Workflow 2");
	});
});
