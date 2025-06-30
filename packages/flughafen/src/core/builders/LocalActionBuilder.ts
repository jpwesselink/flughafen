import { createBuilderConfigurationError } from "../../utils";
import type { Builder } from "./Builder";

/**
 * Configuration for action inputs
 */
export interface ActionInputConfig {
	description?: string;
	required?: boolean;
	default?: string | number | boolean;
	type?: "string" | "number" | "boolean" | "choice";
	options?: string[]; // for choice type
}

/**
 * Configuration for action outputs
 */
export interface ActionOutputConfig {
	description?: string;
	value?: string;
}

/**
 * Type helper to extract input types from input configuration
 */
export type ExtractInputTypes<T extends Record<string, ActionInputConfig>> = {
	[K in keyof T]: T[K]["required"] extends true
		? T[K]["default"] extends string | number | boolean
			? T[K]["default"]
			: string | number | boolean
		: T[K]["default"] extends string | number | boolean
			? T[K]["default"]
			: string | number | boolean | undefined;
};

/**
 * Type helper to extract output types from output configuration
 */
export type ExtractOutputTypes<T extends Record<string, ActionOutputConfig>> = {
	[K in keyof T]: string;
};

/**
 * Action step configuration for composite actions
 * Supports both run steps and action steps (uses)
 */
export interface ActionStep {
	name?: string;
	id?: string;
	run?: string;
	shell?: string;
	uses?: string;
	with?: Record<string, any>;
	env?: Record<string, string>;
	if?: string;
	workingDirectory?: string;
}

/**
 * Builder for local custom GitHub Actions with typed inputs and outputs
 */
export class LocalActionBuilder<TInputs = any, TOutputs = any> implements Builder<any> {
	private config: {
		name?: string;
		filename?: string;
		description?: string;
		inputs?: Record<string, ActionInputConfig>;
		outputs?: Record<string, ActionOutputConfig>;
		runs?: {
			using: "composite" | "node16" | "node20" | "docker";
			steps?: ActionStep[];
			main?: string; // for node actions
			image?: string; // for docker actions
		};
	} = {
		runs: {
			using: "composite",
		},
	};

	/**
	 * Set the action name (used for directory name)
	 */
	name(name: string): LocalActionBuilder<TInputs, TOutputs> {
		this.config.name = name;
		return this;
	}

	/**
	 * Set custom filename/path (optional override)
	 */
	filename(path: string): LocalActionBuilder<TInputs, TOutputs> {
		this.config.filename = path;
		return this;
	}

	/**
	 * Set action description
	 */
	description(description: string): LocalActionBuilder<TInputs, TOutputs> {
		this.config.description = description;
		return this;
	}

	/**
	 * Add an input parameter (typed version)
	 */
	input<K extends keyof TInputs>(name: K, config: ActionInputConfig): LocalActionBuilder<TInputs, TOutputs>;
	/**
	 * Add an input parameter (untyped version)
	 */
	input(name: string, config: ActionInputConfig): LocalActionBuilder<TInputs, TOutputs>;
	input(name: string | keyof TInputs, config: ActionInputConfig): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.inputs) {
			this.config.inputs = {};
		}
		this.config.inputs[name as string] = config;
		return this;
	}

	/**
	 * Add an output parameter (typed version)
	 */
	output<K extends keyof TOutputs>(name: K, config: ActionOutputConfig): LocalActionBuilder<TInputs, TOutputs>;
	/**
	 * Add an output parameter (untyped version)
	 */
	output(name: string, config: ActionOutputConfig): LocalActionBuilder<TInputs, TOutputs>;
	output(name: string | keyof TOutputs, config: ActionOutputConfig): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.outputs) {
			this.config.outputs = {};
		}
		this.config.outputs[name as string] = config;
		return this;
	}

	/**
	 * Set the action type
	 */
	using(type: "composite" | "node16" | "node20" | "docker"): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: type };
		} else {
			this.config.runs.using = type;
		}
		return this;
	}

	/**
	 * Set composite action steps (for composite actions)
	 */
	steps(steps: (string | ActionStep)[]): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "composite" };
		}

		this.config.runs.steps = steps.map((step) => {
			if (typeof step === "string") {
				return {
					run: step,
					shell: "bash",
				};
			}
			return step;
		});
		return this;
	}

	/**
	 * Convenience method for simple run commands (chainable)
	 */
	run(command: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "composite", steps: [] };
		}

		if (!this.config.runs.steps) {
			this.config.runs.steps = [];
		}

		this.config.runs.steps.push({
			run: command,
			shell: "bash",
		});

		return this;
	}

	/**
	 * Set main entry point (for Node.js actions)
	 */
	main(entryPoint: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "node20" };
		}
		this.config.runs.main = entryPoint;
		return this;
	}

	/**
	 * Set Docker image (for Docker actions)
	 */
	image(imageName: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		}
		this.config.runs.image = imageName;
		return this;
	}

	/**
	 * Get the action name for referencing
	 */
	getName(): string | undefined {
		return this.config.name;
	}

	/**
	 * Get the filename/path for the action
	 */
	getFilename(): string | undefined {
		return this.config.filename;
	}

	/**
	 * Get the reference path for use in workflows
	 */
	getReference(): string {
		if (this.config.filename) {
			return this.config.filename.startsWith("./") ? this.config.filename : `./${this.config.filename}`;
		}
		if (this.config.name) {
			return `./.github/actions/${this.config.name}`;
		}
		throw createBuilderConfigurationError(
			"localAction",
			{ name: this.config.name, filename: this.config.filename },
			"Local action must have either a name or filename"
		);
	}

	/**
	 * Build the action configuration for action.yml
	 */
	build(): any {
		const result: any = {};

		if (this.config.name) {
			result.name = this.config.name;
		}

		if (this.config.description) {
			result.description = this.config.description;
		}

		if (this.config.inputs && Object.keys(this.config.inputs).length > 0) {
			result.inputs = {};
			for (const [name, input] of Object.entries(this.config.inputs)) {
				result.inputs[name] = {
					description: input.description,
					required: input.required,
					default: input.default,
				};

				// Add type property if specified
				if (input.type) {
					result.inputs[name].type = input.type;
				}

				// Add options for choice type
				if (input.type === "choice" && input.options) {
					result.inputs[name].options = input.options;
				}
			}
		}

		if (this.config.outputs && Object.keys(this.config.outputs).length > 0) {
			result.outputs = this.config.outputs;
		}

		if (this.config.runs) {
			result.runs = { ...this.config.runs };
		}

		return result;
	}

	/**
	 * Generate the action.yml content as YAML string
	 */
	toYAML(): string {
		const config = this.build();
		const yaml = require("js-yaml");
		return yaml.dump(config, {
			indent: 2,
			lineWidth: -1,
			noRefs: true,
			sortKeys: false,
		});
	}

	/**
	 * Set all inputs at once with type inference (NEW APPROACH)
	 */
	inputs<T extends Record<string, ActionInputConfig>>(
		inputsConfig: T
	): LocalActionBuilder<ExtractInputTypes<T>, TOutputs> {
		this.config.inputs = inputsConfig;
		return this as any; // Type assertion needed for generic transformation
	}

	/**
	 * Set all outputs at once with type inference (NEW APPROACH)
	 */
	outputs<T extends Record<string, ActionOutputConfig>>(
		outputsConfig: T
	): LocalActionBuilder<TInputs, ExtractOutputTypes<T>> {
		this.config.outputs = outputsConfig;
		return this as any; // Type assertion needed for generic transformation
	}
}

/**
 * Factory function to create a new local action with optional type constraints for inputs and outputs
 * @example
 * // OLD APPROACH: Define input and output types for type safety
 * interface MyInputs {
 *   name: string;
 *   version: string;
 * }
 *
 * interface MyOutputs {
 *   result: string;
 *   status: string;
 * }
 *
 * const action = createLocalAction<MyInputs, MyOutputs>()
 *   .name('my-action')
 *   .input('name', { description: 'Name input', required: true })
 *   .input('version', { description: 'Version input', required: true })
 *   .output('result', { description: 'Result output' })
 *   .output('status', { description: 'Status output' });
 *
 * @example
 * // NEW APPROACH: Type inference from inputs/outputs configuration
 * const action = createLocalAction()
 *   .name('my-action')
 *   .inputs({
 *     name: { description: 'Name input', required: true },
 *     version: { description: 'Version input', required: true }
 *   })
 *   .outputs({
 *     result: { description: 'Result output' },
 *     status: { description: 'Status output' }
 *   });
 */
export function createLocalAction<TInputs = any, TOutputs = any>(): LocalActionBuilder<TInputs, TOutputs> {
	return new LocalActionBuilder<TInputs, TOutputs>();
}

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

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
			expect(config.runs.steps).toHaveLength(2);
			expect(config.runs.steps[0].run).toBe('echo "Hello World"');
			expect(config.runs.steps[1].run).toBe("npm test");
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
			expect(config.inputs.version).toEqual({
				description: "Node.js version",
				required: true,
				default: "18",
			});
			expect(config.outputs["cache-hit"]).toEqual({
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
			expect(config.inputs.name.required).toBe(true);
			expect(config.inputs.enabled.default).toBe(true);
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
			expect(config.runs.steps).toHaveLength(2);
			expect(config.inputs.param1.required).toBe(true);
			expect(config.inputs.param2.required).toBe(true);
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
			expect(config.inputs.config.required).toBe(true);
			expect(config.inputs.metadata.required).toBe(false);
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
			expect(config.inputs.appName.required).toBe(true);
			expect(config.inputs.debug.default).toBe(false);
			expect(config.inputs.timeout.default).toBe(300);
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
			expect(config.inputs.stringInput.required).toBe(true);
			expect(config.inputs.numberInput.type).toBe("number");
			expect(config.inputs.booleanInput.type).toBe("boolean");
			expect(config.inputs.booleanInput.default).toBe(true);
			expect(config.inputs.choiceInput.type).toBe("choice");
			expect(config.inputs.choiceInput.options).toEqual(["dev", "staging", "prod"]);
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
			expect(config.runs.steps).toHaveLength(2);
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
}
