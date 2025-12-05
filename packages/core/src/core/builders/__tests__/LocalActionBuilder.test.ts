import { describe, expect, it } from "vitest";
import { createLocalAction, run } from "../../helpers/action-helpers";
import type { ActionRuns, CompositeActionRuns } from "../../types/action-types";
import { ActionStepBuilder } from "../ActionStepBuilder";
import { LocalActionBuilder } from "../LocalActionBuilder";

// Type guard for ActionRuns union
const isCompositeRuns = (runs: ActionRuns): runs is CompositeActionRuns => runs.using === "composite";

describe("LocalActionBuilder", () => {
	it("should create a basic composite action", () => {
		const action = new LocalActionBuilder()
			.name("test-action")
			.description("A test action")
			.run('echo "Hello World"')
			.run("npm test");

		const config = action.build();
		expect(config.name).toBe("test-action");
		expect(config.description).toBe("A test action");
		expect(config.runs.using).toBe("composite");
		if (!isCompositeRuns(config.runs)) throw new Error("Expected composite runs");
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(2);
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].run).toBe('echo "Hello World"');
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[1].run).toBe("npm test");
	});

	it("should add inputs and outputs", () => {
		const action = new LocalActionBuilder()
			.name("setup-action")
			.input("version", {
				description: "Node.js version",
				required: true,
				default: "18",
			})
			.output("cache-hit", {
				description: "Whether cache was hit",
				value: "${{ steps.cache.outputs.cache-hit }}",
			});

		const config = action.build();
		expect(config.inputs?.version).toEqual({
			description: "Node.js version",
			required: true,
			default: "18",
		});
		expect(config.outputs?.["cache-hit"]).toEqual({
			description: "Whether cache was hit",
			value: "${{ steps.cache.outputs.cache-hit }}",
		});
	});

	it("should generate correct reference path", () => {
		const action1 = new LocalActionBuilder().name("my-action");
		expect(action1.getReference()).toBe("./.github/actions/my-action");

		const action2 = new LocalActionBuilder().filename("custom/path");
		expect(action2.getReference()).toBe("./custom/path");

		const action3 = new LocalActionBuilder().filename("./already/relative");
		expect(action3.getReference()).toBe("./already/relative");
	});

	it("should support different action types", () => {
		const nodeAction = new LocalActionBuilder().name("node-action").using("node20").main("dist/index.js");

		const dockerAction = new LocalActionBuilder().name("docker-action").using("docker").image("alpine:latest");

		expect(nodeAction.build().runs).toEqual({
			using: "node20",
			main: "dist/index.js",
		});

		expect(dockerAction.build().runs).toEqual({
			using: "docker",
			image: "alpine:latest",
		});
	});

	it("should generate valid YAML", () => {
		const action = new LocalActionBuilder()
			.name("test-yaml")
			.description("Test YAML generation")
			.input("test-input", { required: true })
			.run('echo "test"');

		const yaml = action.toYAML();
		expect(yaml).toContain("name: test-yaml");
		expect(yaml).toContain("description: Test YAML generation");
		expect(yaml).toContain("inputs:");
		expect(yaml).toContain("runs:");
	});

	// Tests for generic type safety functionality
	it("should support typed local actions with generics", () => {
		interface TestInputs {
			name: string;
			version: string;
			enabled: boolean;
		}

		interface TestOutputs {
			result: string;
			status: "success" | "failed";
		}

		const typedAction = createLocalAction<TestInputs, TestOutputs>()
			.name("typed-test-action")
			.description("A test action with typed inputs and outputs")
			.input("name", { description: "Name input", required: true })
			.input("version", { description: "Version input", required: true })
			.input("enabled", {
				description: "Enable feature",
				required: false,
				default: true,
			})
			.output("result", { description: "Operation result" })
			.output("status", { description: "Operation status" })
			.run('echo "Processing ${{ inputs.name }} v${{ inputs.version }}"');

		const config = typedAction.build();
		expect(config.name).toBe("typed-test-action");
		expect(config.inputs).toHaveProperty("name");
		expect(config.inputs).toHaveProperty("version");
		expect(config.inputs).toHaveProperty("enabled");
		expect(config.outputs).toHaveProperty("result");
		expect(config.outputs).toHaveProperty("status");
		expect(config.inputs?.name.required).toBe(true);
		expect(config.inputs?.enabled.default).toBe(true);
	});

	it("should support createLocalAction without generics (backward compatibility)", () => {
		const untypedAction = createLocalAction()
			.name("untyped-action")
			.description("An action without type constraints")
			.input("anyInput", { description: "Any input" })
			.output("anyOutput", { description: "Any output" })
			.run('echo "No type constraints"');

		const config = untypedAction.build();
		expect(config.name).toBe("untyped-action");
		expect(config.inputs).toHaveProperty("anyInput");
		expect(config.outputs).toHaveProperty("anyOutput");
	});

	it("should maintain fluent API with generics", () => {
		interface ChainInputs {
			param1: string;
			param2: number;
		}

		const chainedAction = createLocalAction<ChainInputs>()
			.name("chained-action")
			.description("Test method chaining with generics")
			.input("param1", { description: "First parameter", required: true })
			.input("param2", { description: "Second parameter", required: true })
			.using("composite")
			.run('echo "Step 1"')
			.run('echo "Step 2"');

		const config = chainedAction.build();
		expect(config.name).toBe("chained-action");
		expect(config.runs.using).toBe("composite");
		if (!isCompositeRuns(config.runs)) throw new Error("Expected composite runs");
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(2);
		expect(config.inputs?.param1.required).toBe(true);
		expect(config.inputs?.param2.required).toBe(true);
	});

	it("should support partial output generics", () => {
		interface OnlyInputs {
			input1: string;
			input2: boolean;
		}

		// Test with only input generics, outputs untyped
		const partialAction = createLocalAction<OnlyInputs>()
			.name("partial-generic-action")
			.input("input1", { description: "Typed input 1", required: true })
			.input("input2", { description: "Typed input 2", required: false })
			.output("dynamicOutput", { description: "Untyped output" })
			.run('echo "Partial generics test"');

		const config = partialAction.build();
		expect(config.name).toBe("partial-generic-action");
		expect(config.inputs).toHaveProperty("input1");
		expect(config.inputs).toHaveProperty("input2");
		expect(config.outputs).toHaveProperty("dynamicOutput");
	});

	it("should support complex nested interface types", () => {
		interface ComplexInputs {
			config: {
				database: {
					host: string;
					port: number;
				};
				features: string[];
			};
			metadata: Record<string, any>;
		}

		// This tests that complex TypeScript types can be used as generics
		const complexAction = createLocalAction<ComplexInputs>()
			.name("complex-typed-action")
			.description("Action with complex input types")
			.input("config", {
				description: "Complex configuration object",
				required: true,
			})
			.input("metadata", {
				description: "Metadata key-value pairs",
				required: false,
			})
			.run('echo "Complex types supported"');

		const config = complexAction.build();
		expect(config.name).toBe("complex-typed-action");
		expect(config.inputs).toHaveProperty("config");
		expect(config.inputs).toHaveProperty("metadata");
		expect(config.inputs?.config.required).toBe(true);
		expect(config.inputs?.metadata.required).toBe(false);
	});

	// Tests for NEW APPROACH: Type inference from inputs/outputs
	it("should support type inference from inputs() method", () => {
		const action = createLocalAction()
			.name("typed-action-new")
			.description("Action with type inference from inputs")
			.inputs({
				appName: { description: "Application name", required: true },
				environment: { description: "Target environment", required: true },
				debug: {
					description: "Enable debug mode",
					required: false,
					default: false,
				},
				timeout: {
					description: "Timeout in seconds",
					required: false,
					default: 300,
				},
			})
			.outputs({
				deployUrl: { description: "Deployment URL" },
				status: { description: "Deployment status" },
			})
			.run('echo "Deploying ${inputs.appName} to ${inputs.environment}"');

		const config = action.build();
		expect(config.name).toBe("typed-action-new");
		expect(config.inputs).toHaveProperty("appName");
		expect(config.inputs).toHaveProperty("environment");
		expect(config.inputs).toHaveProperty("debug");
		expect(config.inputs).toHaveProperty("timeout");
		expect(config.outputs).toHaveProperty("deployUrl");
		expect(config.outputs).toHaveProperty("status");
		expect(config.inputs?.appName.required).toBe(true);
		expect(config.inputs?.debug.default).toBe(false);
		expect(config.inputs?.timeout.default).toBe(300);
	});

	it("should support inputs() with different input types", () => {
		const action = createLocalAction()
			.name("multi-type-inputs")
			.inputs({
				stringInput: { description: "String input", required: true },
				numberInput: {
					description: "Number input",
					required: true,
					type: "number",
				},
				booleanInput: {
					description: "Boolean input",
					required: false,
					type: "boolean",
					default: true,
				},
				choiceInput: {
					description: "Choice input",
					required: false,
					type: "choice",
					options: ["dev", "staging", "prod"],
				},
			})
			.run('echo "Multi-type inputs"');

		const config = action.build();
		expect(config.inputs?.stringInput.required).toBe(true);
		expect(config.inputs?.numberInput.type).toBe("number");
		expect(config.inputs?.booleanInput.type).toBe("boolean");
		expect(config.inputs?.booleanInput.default).toBe(true);
		expect(config.inputs?.choiceInput.type).toBe("choice");
		expect(config.inputs?.choiceInput.options).toEqual(["dev", "staging", "prod"]);
	});

	it("should support fluent chaining with inputs() and outputs()", () => {
		const action = createLocalAction()
			.name("fluent-new-approach")
			.description("Test fluent API with new approach")
			.inputs({
				param1: { description: "First parameter", required: true },
				param2: { description: "Second parameter", required: false },
			})
			.outputs({
				result1: { description: "First result" },
				result2: { description: "Second result" },
			})
			.using("composite")
			.run('echo "Step 1"')
			.run('echo "Step 2"');

		const config = action.build();
		expect(config.name).toBe("fluent-new-approach");
		expect(config.description).toBe("Test fluent API with new approach");
		expect(config.runs.using).toBe("composite");
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(2);
		expect(config.inputs).toHaveProperty("param1");
		expect(config.inputs).toHaveProperty("param2");
		expect(config.outputs).toHaveProperty("result1");
		expect(config.outputs).toHaveProperty("result2");
	});

	it("should work with inputs() only (no outputs)", () => {
		const action = createLocalAction()
			.name("inputs-only")
			.inputs({
				command: { description: "Command to run", required: true },
				workingDir: {
					description: "Working directory",
					required: false,
					default: "./",
				},
			})
			.run("cd ${inputs.workingDir} && ${inputs.command}");

		const config = action.build();
		expect(config.inputs).toHaveProperty("command");
		expect(config.inputs).toHaveProperty("workingDir");
		expect(config.outputs).toBeUndefined();
	});

	it("should work with outputs() only (no inputs)", () => {
		const action = createLocalAction()
			.name("outputs-only")
			.outputs({
				timestamp: { description: "Current timestamp" },
				hostname: { description: "Current hostname" },
			})
			.run('echo "timestamp=$(date)" >> $GITHUB_OUTPUT')
			.run('echo "hostname=$(hostname)" >> $GITHUB_OUTPUT');

		const config = action.build();
		expect(config.outputs).toHaveProperty("timestamp");
		expect(config.outputs).toHaveProperty("hostname");
		expect(config.inputs).toBeUndefined();
	});
});

describe("ActionStepBuilder", () => {
	it("should build step with shell command", () => {
		const step = new ActionStepBuilder().name("Run script").run("npm test").shell("bash");

		const config = step.build();
		expect(config.name).toBe("Run script");
		expect(config.run).toBe("npm test");
		expect(config.shell).toBe("bash");
	});

	it("should build step with uses and with", () => {
		const step = new ActionStepBuilder().name("Checkout").uses("actions/checkout@v4").with({
			repository: "owner/repo",
			fetchDepth: 1,
		});

		const config = step.build();
		expect(config.uses).toBe("actions/checkout@v4");
		expect(config.with).toEqual({
			repository: "owner/repo",
			"fetch-depth": 1,
		});
	});

	it("should build step with env variables", () => {
		const step = new ActionStepBuilder().run("echo $MY_VAR").env({ MY_VAR: "test", DEBUG: "true" });

		const config = step.build();
		expect(config.env).toEqual({ MY_VAR: "test", DEBUG: "true" });
	});

	it("should build step with condition", () => {
		const step = new ActionStepBuilder().run("deploy").if("github.ref == 'refs/heads/main'");

		const config = step.build();
		expect(config.if).toBe("github.ref == 'refs/heads/main'");
	});

	it("should build step with working directory", () => {
		const step = new ActionStepBuilder().run("npm install").workingDirectory("./frontend");

		const config = step.build();
		expect(config["working-directory"]).toBe("./frontend");
	});

	it("should support step comments", () => {
		const step = new ActionStepBuilder().name("Build").run("npm run build").comment("Build the application");

		expect(step.getComment()).toBe("Build the application");
	});

	it("should build step with id", () => {
		const step = new ActionStepBuilder().id("my-step").run("echo test");

		const config = step.build();
		expect(config.id).toBe("my-step");
	});

	it("should chain multiple methods", () => {
		const step = new ActionStepBuilder()
			.name("Complex Step")
			.id("complex")
			.uses("actions/setup-node@v4")
			.with({ nodeVersion: "20" })
			.env({ NODE_ENV: "production" })
			.if("success()")
			.comment("Setup Node.js");

		const config = step.build();
		expect(config.name).toBe("Complex Step");
		expect(config.id).toBe("complex");
		expect(config.uses).toBe("actions/setup-node@v4");
		expect(config.with).toEqual({ "node-version": "20" });
		expect(config.env).toEqual({ NODE_ENV: "production" });
		expect(config.if).toBe("success()");
		expect(step.getComment()).toBe("Setup Node.js");
	});
});

describe("LocalActionBuilder - Advanced Features", () => {
	it("should use step callback with configuration", () => {
		const action = new LocalActionBuilder()
			.name("callback-steps")
			.step((step) => step.name("Build").run("npm run build").env({ NODE_ENV: "production" }))
			.step((step) => step.name("Test").run("npm test").if("success()"));

		const config = action.build();
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(2);
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].name).toBe("Build");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].env).toEqual({ NODE_ENV: "production" });
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[1].if).toBe("success()");
	});

	it("should support string shorthand for steps", () => {
		const action = new LocalActionBuilder()
			.name("string-steps")
			.step("actions/checkout@v4")
			.step("actions/setup-node@v4", { nodeVersion: "20" });

		const config = action.build();
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(2);
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].uses).toBe("actions/checkout@v4");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[1].uses).toBe("actions/setup-node@v4");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[1].with).toEqual({ "node-version": "20" });
	});

	it("should support step object configuration", () => {
		const action = new LocalActionBuilder().name("object-steps").step({
			name: "Custom Step",
			run: "echo test",
			shell: "bash",
			env: { DEBUG: "true" },
		});

		const config = action.build();
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].name).toBe("Custom Step");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].shell).toBe("bash");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0].env).toEqual({ DEBUG: "true" });
	});

	it("should get step comments", () => {
		const action = new LocalActionBuilder()
			.name("commented-action")
			.step((step) => step.run("echo 1").comment("First step"))
			.step((step) => step.run("echo 2"))
			.step((step) => step.run("echo 3").comment("Third step"));

		const comments = action.getStepComments();
		expect(comments.size).toBe(2);
		expect(comments.get(0)).toBe("First step");
		expect(comments.get(2)).toBe("Third step");
	});

	it("should include comment in YAML output", () => {
		const action = new LocalActionBuilder()
			.name("commented")
			.description("Deploys application")
			.comment("This is a deployment action")
			.using("composite")
			.step("echo test");

		const yaml = action.toYAML();
		expect(yaml).toContain("# This is a deployment action");
		expect(yaml).toContain("name: commented");
		expect(yaml).toContain("description: Deploys application");
	});

	it("should get custom filename", () => {
		const action = new LocalActionBuilder().name("custom-filename").filename("custom/location");

		expect(action.getFilename()).toBe("custom/location");
	});

	it("should use Docker configuration", () => {
		const action = new LocalActionBuilder().name("docker-action").using("docker").image("alpine:latest");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("image" in config.runs ? config.runs.image : undefined).toBe("alpine:latest");
	});

	it("should use Node configuration with main", () => {
		const action = new LocalActionBuilder().name("node-action").using("node20").main("dist/index.js");

		const config = action.build();
		expect(config.runs.using).toBe("node20");
		expect("main" in config.runs ? config.runs.main : undefined).toBe("dist/index.js");
	});

	it("should use run() helper function", () => {
		const action = new LocalActionBuilder()
			.name("test-run-helper")
			.description("Test run helper")
			.step(run("npm install"));

		const config = action.build();
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(1);
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0]?.run).toBe("npm install");
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0]?.shell).toBe("bash");
	});

	it("should use run() helper with options", () => {
		const action = new LocalActionBuilder()
			.name("test-run-options")
			.description("Test run helper with options")
			.step(
				run("npm test", {
					name: "Run tests",
					id: "test-step",
					env: { CI: "true", NODE_ENV: "test" },
					if: "always()",
					workingDirectory: "./app",
				})
			);

		const config = action.build();
		expect("steps" in config.runs ? config.runs.steps : undefined).toHaveLength(1);
		const step = ("steps" in config.runs ? config.runs.steps : undefined)?.[0];
		expect(step?.run).toBe("npm test");
		expect(step?.name).toBe("Run tests");
		expect(step?.id).toBe("test-step");
		expect(step?.env).toEqual({ CI: "true", NODE_ENV: "test" });
		expect(step?.if).toBe("always()");
		expect(step?.["working-directory"]).toBe("./app");
	});

	it("should include action-level comment in YAML", () => {
		const action = new LocalActionBuilder()
			.name("test-action-comment")
			.description("Test action comment")
			.comment("This is an action comment")
			.run('echo "test"');

		const yaml = action.toYAML();
		expect(yaml).toContain("# This is an action comment");
	});

	it("should include multi-line action comment in YAML", () => {
		const action = new LocalActionBuilder()
			.name("test-multiline-comment")
			.description("Test multiline comment")
			.comment("Line 1\nLine 2\nLine 3")
			.run('echo "test"');

		const yaml = action.toYAML();
		expect(yaml).toContain("# Line 1");
		expect(yaml).toContain("# Line 2");
		expect(yaml).toContain("# Line 3");
	});

	it("should use main() method to set Node.js entry point without prior runs config", () => {
		const action = new LocalActionBuilder().name("test-main").main("dist/index.js");

		const config = action.build();
		expect(config.runs.using).toBe("node24");
		expect("main" in config.runs ? config.runs.main : undefined).toBe("dist/index.js");
	});

	it("should use image() method to set Docker image without prior runs config", () => {
		const action = new LocalActionBuilder().name("test-image").image("node:20-alpine");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("image" in config.runs ? config.runs.image : undefined).toBe("node:20-alpine");
	});
});

describe("LocalActionBuilder - Docker Action Support", () => {
	it("should set Docker entrypoint", () => {
		const action = new LocalActionBuilder()
			.name("docker-entrypoint")
			.image("alpine:latest")
			.entrypoint("/entrypoint.sh");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("image" in config.runs ? config.runs.image : undefined).toBe("alpine:latest");
		expect("entrypoint" in config.runs ? config.runs.entrypoint : undefined).toBe("/entrypoint.sh");
	});

	it("should set entrypoint and auto-switch to docker using", () => {
		const action = new LocalActionBuilder().name("auto-docker").entrypoint("/entrypoint.sh");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("entrypoint" in config.runs ? config.runs.entrypoint : undefined).toBe("/entrypoint.sh");
	});

	it("should set pre-entrypoint script", () => {
		const action = new LocalActionBuilder().name("docker-pre").image("node:20").preEntrypoint("/pre-setup.sh");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("pre-entrypoint" in config.runs ? config.runs["pre-entrypoint"] : undefined).toBe("/pre-setup.sh");
	});

	it("should set post-entrypoint script", () => {
		const action = new LocalActionBuilder().name("docker-post").image("node:20").postEntrypoint("/cleanup.sh");

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("post-entrypoint" in config.runs ? config.runs["post-entrypoint"] : undefined).toBe("/cleanup.sh");
	});

	it("should set pre-if condition", () => {
		const action = new LocalActionBuilder()
			.name("docker-pre-if")
			.image("alpine:latest")
			.preEntrypoint("/setup.sh")
			.preIf("runner.os == 'Linux'");

		const config = action.build();
		expect("pre-entrypoint" in config.runs ? config.runs["pre-entrypoint"] : undefined).toBe("/setup.sh");
		expect("pre-if" in config.runs ? config.runs["pre-if"] : undefined).toBe("runner.os == 'Linux'");
	});

	it("should set post-if condition", () => {
		const action = new LocalActionBuilder()
			.name("docker-post-if")
			.image("alpine:latest")
			.postEntrypoint("/cleanup.sh")
			.postIf("always()");

		const config = action.build();
		expect("post-entrypoint" in config.runs ? config.runs["post-entrypoint"] : undefined).toBe("/cleanup.sh");
		expect("post-if" in config.runs ? config.runs["post-if"] : undefined).toBe("always()");
	});

	it("should set Docker container args", () => {
		const action = new LocalActionBuilder()
			.name("docker-args")
			.image("alpine:latest")
			.args(["--verbose", "--config", "/app/config.json"]);

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("args" in config.runs ? config.runs.args : undefined).toEqual(["--verbose", "--config", "/app/config.json"]);
	});

	it("should set Docker container environment variables", () => {
		const action = new LocalActionBuilder().name("docker-env").image("alpine:latest").dockerEnv({
			NODE_ENV: "production",
			DEBUG: true,
			PORT: 3000,
		});

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("env" in config.runs ? config.runs.env : undefined).toEqual({
			NODE_ENV: "production",
			DEBUG: true,
			PORT: 3000,
		});
	});

	it("should support full Docker action configuration", () => {
		const action = new LocalActionBuilder()
			.name("full-docker-action")
			.description("A complete Docker action")
			.input("config-path", { description: "Config file path", required: true })
			.output("result", { description: "Action result" })
			.image("Dockerfile")
			.entrypoint("/entrypoint.sh")
			.preEntrypoint("/pre.sh")
			.postEntrypoint("/post.sh")
			.preIf("runner.os == 'Linux'")
			.postIf("always()")
			.args(["${{ inputs.config-path }}"])
			.dockerEnv({
				DOCKER_ACTION: "true",
				DEBUG: false,
			});

		const config = action.build();
		expect(config.name).toBe("full-docker-action");
		expect(config.description).toBe("A complete Docker action");
		expect(config.inputs?.["config-path"]).toBeDefined();
		expect(config.outputs?.result).toBeDefined();
		expect(config.runs).toEqual({
			using: "docker",
			image: "Dockerfile",
			entrypoint: "/entrypoint.sh",
			"pre-entrypoint": "/pre.sh",
			"post-entrypoint": "/post.sh",
			"pre-if": "runner.os == 'Linux'",
			"post-if": "always()",
			args: ["${{ inputs.config-path }}"],
			env: {
				DOCKER_ACTION: "true",
				DEBUG: false,
			},
		});
	});

	it("should generate valid YAML for Docker action", () => {
		const action = new LocalActionBuilder()
			.name("docker-yaml-test")
			.description("Test Docker YAML generation")
			.image("alpine:latest")
			.entrypoint("/entrypoint.sh")
			.args(["--help"])
			.dockerEnv({ MY_VAR: "value" });

		const yaml = action.toYAML();
		expect(yaml).toContain("name: docker-yaml-test");
		expect(yaml).toContain("using: docker");
		expect(yaml).toContain("image: alpine:latest");
		expect(yaml).toContain("entrypoint: /entrypoint.sh");
		expect(yaml).toContain("args:");
		expect(yaml).toMatch(/- ['"]?--help['"]?/);
		expect(yaml).toContain("env:");
		expect(yaml).toContain("MY_VAR: value");
	});

	it("should switch from composite to docker when docker methods called", () => {
		const action = new LocalActionBuilder().name("switch-to-docker").using("composite").image("alpine:latest"); // This should switch to docker

		const config = action.build();
		expect(config.runs.using).toBe("docker");
		expect("image" in config.runs ? config.runs.image : undefined).toBe("alpine:latest");
	});

	it("should support Dockerfile reference as image", () => {
		const action = new LocalActionBuilder()
			.name("dockerfile-action")
			.image("Dockerfile")
			.entrypoint("/action/entrypoint.sh");

		const config = action.build();
		expect("image" in config.runs ? config.runs.image : undefined).toBe("Dockerfile");
	});

	it("should support Docker Hub image references", () => {
		const action = new LocalActionBuilder().name("dockerhub-action").image("docker://myuser/myimage:v1.0");

		const config = action.build();
		expect("image" in config.runs ? config.runs.image : undefined).toBe("docker://myuser/myimage:v1.0");
	});
});

describe("LocalActionBuilder - Author and Branding", () => {
	describe("author()", () => {
		it("should set author string", () => {
			const action = new LocalActionBuilder().name("my-action").description("Test action").author("John Doe");

			const config = action.build();
			expect(config.author).toBe("John Doe");
		});

		it("should set author with email", () => {
			const action = new LocalActionBuilder()
				.name("my-action")
				.description("Test action")
				.author("Jane Smith <jane@example.com>");

			const config = action.build();
			expect(config.author).toBe("Jane Smith <jane@example.com>");
		});

		it("should include author in YAML output", () => {
			const action = new LocalActionBuilder()
				.name("my-action")
				.description("Test action")
				.author("Test Author")
				.run('echo "hello"');

			const yaml = action.toYAML();
			expect(yaml).toContain("author: Test Author");
		});
	});

	describe("branding()", () => {
		it("should set branding with icon and color", () => {
			const action = new LocalActionBuilder().name("my-action").description("Test action").branding({
				icon: "check-circle",
				color: "green",
			});

			const config = action.build();
			expect(config.branding).toEqual({
				icon: "check-circle",
				color: "green",
			});
		});

		it("should set branding with only icon", () => {
			const action = new LocalActionBuilder().name("my-action").description("Test action").branding({
				icon: "upload-cloud",
			});

			const config = action.build();
			expect(config.branding?.icon).toBe("upload-cloud");
		});

		it("should set branding with only color", () => {
			const action = new LocalActionBuilder().name("my-action").description("Test action").branding({
				color: "blue",
			});

			const config = action.build();
			expect(config.branding?.color).toBe("blue");
		});

		it("should include branding in YAML output", () => {
			const action = new LocalActionBuilder()
				.name("my-action")
				.description("Test action")
				.branding({
					icon: "zap",
					color: "yellow",
				})
				.run('echo "hello"');

			const yaml = action.toYAML();
			expect(yaml).toContain("branding:");
			expect(yaml).toContain("icon: zap");
			expect(yaml).toContain("color: yellow");
		});
	});

	describe("combined usage", () => {
		it("should support author and branding together", () => {
			const action = new LocalActionBuilder()
				.name("complete-action")
				.description("A complete action with metadata")
				.author("Acme Corp")
				.branding({
					icon: "package",
					color: "purple",
				})
				.input("name", { description: "Your name", required: true })
				.run('echo "Hello ${{ inputs.name }}"');

			const config = action.build();
			expect(config.name).toBe("complete-action");
			expect(config.description).toBe("A complete action with metadata");
			expect(config.author).toBe("Acme Corp");
			expect(config.branding).toEqual({
				icon: "package",
				color: "purple",
			});
			expect(config.inputs?.name).toBeDefined();
		});
	});
});

describe("ActionStepBuilder - continueOnError", () => {
	it("should set continue-on-error to true", () => {
		const action = new LocalActionBuilder()
			.name("test-action")
			.description("Test")
			.step((step) => step.name("Flaky step").run("npm test").continueOnError(true));

		const config = action.build();
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0]["continue-on-error"]).toBe(true);
	});

	it("should set continue-on-error to false", () => {
		const action = new LocalActionBuilder()
			.name("test-action")
			.description("Test")
			.step((step) => step.name("Critical step").run("npm test").continueOnError(false));

		const config = action.build();
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0]["continue-on-error"]).toBe(false);
	});

	it("should set continue-on-error as expression", () => {
		const action = new LocalActionBuilder()
			.name("test-action")
			.description("Test")
			.step((step) => step.name("Conditional step").run("npm test").continueOnError("${{ inputs.allow-failure }}"));

		const config = action.build();
		expect(("steps" in config.runs ? config.runs.steps : undefined)?.[0]["continue-on-error"]).toBe(
			"${{ inputs.allow-failure }}"
		);
	});
});
