import { DEFAULT_NODE_RUNTIME, type SupportedNodeRuntime } from "../../../generated/types/schema-defaults";
import { createBuilderConfigurationError } from "../../utils";
import { normalizeToKebabCase } from "../../utils/property-mapper";
import type {
	ActionBrandingConfig,
	ActionInputConfig,
	ActionOutputConfig,
	ActionStep,
	ActionStepInputValue,
	BuiltActionStep,
	ExtractInputTypes,
	ExtractOutputTypes,
	LocalActionBuildOutput,
} from "../types/action-types";
import { ActionStepBuilder } from "./ActionStepBuilder";
import type { Builder } from "./Builder";

/**
 * Branding configuration for GitHub Marketplace
 * @deprecated Use ActionBrandingConfig from action-types instead
 */
export type ActionBranding = ActionBrandingConfig;

/**
 * Builder for local custom GitHub Actions with typed inputs and outputs
 */
export class LocalActionBuilder<TInputs = Record<string, unknown>, TOutputs = Record<string, unknown>>
	implements Builder<LocalActionBuildOutput>
{
	private config: {
		name?: string;
		filename?: string;
		description?: string;
		author?: string;
		branding?: ActionBrandingConfig;
		inputs?: Record<string, ActionInputConfig>;
		outputs?: Record<string, ActionOutputConfig>;
		runs?: {
			using: "composite" | SupportedNodeRuntime | "docker";
			steps?: BuiltActionStep[];
			main?: string; // for node actions
			// Docker action properties
			image?: string;
			entrypoint?: string;
			"pre-entrypoint"?: string;
			"post-entrypoint"?: string;
			args?: string[];
			env?: Record<string, string | number | boolean>;
			"pre-if"?: string;
			"post-if"?: string;
		};
	} = {
		runs: {
			using: "composite",
		},
	};
	private stepBuilders: ActionStepBuilder[] = []; // Track step builders for comments
	private actionComment?: string; // Store comment for action YAML

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
	 * Set the action's author
	 * @example
	 * .author("Your Name")
	 * .author("Your Organization <email@example.com>")
	 */
	author(author: string): LocalActionBuilder<TInputs, TOutputs> {
		this.config.author = author;
		return this;
	}

	/**
	 * Set branding for GitHub Marketplace display
	 * @example
	 * .branding({ icon: "check-circle", color: "green" })
	 * .branding({ icon: "upload-cloud", color: "blue" })
	 */
	branding(branding: ActionBrandingConfig): LocalActionBuilder<TInputs, TOutputs> {
		this.config.branding = branding;
		return this;
	}

	/**
	 * Add a comment to the action (will be rendered at the top of action.yml)
	 */
	comment(comment: string): LocalActionBuilder<TInputs, TOutputs> {
		this.actionComment = comment;
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
	using(type: "composite" | SupportedNodeRuntime | "docker"): LocalActionBuilder<TInputs, TOutputs> {
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
	 * Add a step using various forms
	 * @example
	 * // Helper function form
	 * .step(uses("actions/checkout@v4"))
	 * .step(uses("docker/build-push-action@v5", { context: ".", push: true }))
	 * .step(run("echo hello"))
	 *
	 * // Callback form for fluent configuration
	 * .step(step => step
	 *   .name("Build and push")
	 *   .uses("docker/build-push-action@v5")
	 *   .with({ context: ".", push: true })
	 *   .if("github.event_name == 'push'")
	 * )
	 *
	 * // String shorthand for actions
	 * .step("actions/checkout@v4")
	 * .step("actions/setup-node@v4", { "node-version": "20" })
	 */
	step(
		stepConfig: ActionStep | string | ((step: ActionStepBuilder) => ActionStepBuilder),
		inputs?: Record<string, ActionStepInputValue>
	): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "composite", steps: [] };
		}

		if (!this.config.runs.steps) {
			this.config.runs.steps = [];
		}

		if (typeof stepConfig === "string") {
			// String shorthand: "actions/checkout@v4" → { uses: "actions/checkout@v4" }
			this.config.runs.steps.push({
				uses: stepConfig,
				...(inputs ? { with: normalizeToKebabCase(inputs) as Record<string, ActionStepInputValue> } : {}),
			});
			// Comments not supported in shorthand form - use callback if comments needed
			this.stepBuilders.push(new ActionStepBuilder());
		} else if (typeof stepConfig === "function") {
			// Callback form allows full step configuration with type safety
			const builder = new ActionStepBuilder();
			const result = stepConfig(builder);
			const builtStep = result.build();
			// GitHub Actions requires explicit shell for run steps (defaults to bash for consistency)
			if (builtStep.run && !builtStep.shell) {
				builtStep.shell = "bash";
			}
			this.config.runs.steps.push(builtStep);
			// Preserve builder reference to extract step-level comments during YAML generation
			this.stepBuilders.push(result);
		} else {
			// Direct object form - convert ActionStep to BuiltActionStep
			const builtStep: BuiltActionStep = {
				...(stepConfig.name && { name: stepConfig.name }),
				...(stepConfig.id && { id: stepConfig.id }),
				...(stepConfig.run && { run: stepConfig.run }),
				...(stepConfig.shell && { shell: stepConfig.shell }),
				...(!stepConfig.shell && stepConfig.run && { shell: "bash" }),
				...(stepConfig.uses && { uses: stepConfig.uses }),
				...(stepConfig.with && { with: stepConfig.with }),
				...(stepConfig.env && { env: stepConfig.env }),
				...(stepConfig.if && { if: stepConfig.if }),
				...(stepConfig.workingDirectory && { "working-directory": stepConfig.workingDirectory }),
				...(stepConfig.continueOnError !== undefined && { "continue-on-error": stepConfig.continueOnError }),
			};
			this.config.runs.steps.push(builtStep);
			// Comments not supported with direct objects - use callback if comments needed
			this.stepBuilders.push(new ActionStepBuilder());
		}

		return this;
	}

	/**
	 * Set main entry point (for Node.js actions)
	 */
	main(entryPoint: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: DEFAULT_NODE_RUNTIME };
		} else if (!this.config.runs.using || this.config.runs.using === "composite") {
			// Composite actions cannot have main - switch to Node.js runtime
			this.config.runs.using = DEFAULT_NODE_RUNTIME;
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
		} else {
			this.config.runs.using = "docker";
		}
		this.config.runs.image = imageName;
		return this;
	}

	/**
	 * Set Docker entrypoint (for Docker actions)
	 * Overrides the Docker ENTRYPOINT in the Dockerfile
	 */
	entrypoint(entrypointPath: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		} else if (this.config.runs.using !== "docker") {
			this.config.runs.using = "docker";
		}
		this.config.runs.entrypoint = entrypointPath;
		return this;
	}

	/**
	 * Set pre-entrypoint script (for Docker actions)
	 * Runs before the main entrypoint
	 */
	preEntrypoint(scriptPath: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		} else if (this.config.runs.using !== "docker") {
			this.config.runs.using = "docker";
		}
		this.config.runs["pre-entrypoint"] = scriptPath;
		return this;
	}

	/**
	 * Set post-entrypoint script (for Docker actions)
	 * Runs after the main entrypoint completes
	 */
	postEntrypoint(scriptPath: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		} else if (this.config.runs.using !== "docker") {
			this.config.runs.using = "docker";
		}
		this.config.runs["post-entrypoint"] = scriptPath;
		return this;
	}

	/**
	 * Set condition for pre-entrypoint (for Docker actions)
	 */
	preIf(condition: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		}
		this.config.runs["pre-if"] = condition;
		return this;
	}

	/**
	 * Set condition for post-entrypoint (for Docker actions)
	 */
	postIf(condition: string): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		}
		this.config.runs["post-if"] = condition;
		return this;
	}

	/**
	 * Set Docker container arguments (for Docker actions)
	 * These are passed to the container's ENTRYPOINT
	 */
	args(containerArgs: string[]): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		} else if (this.config.runs.using !== "docker") {
			this.config.runs.using = "docker";
		}
		this.config.runs.args = containerArgs;
		return this;
	}

	/**
	 * Set Docker container environment variables (for Docker actions)
	 * These are set in the container environment
	 */
	dockerEnv(env: Record<string, string | number | boolean>): LocalActionBuilder<TInputs, TOutputs> {
		if (!this.config.runs) {
			this.config.runs = { using: "docker" };
		} else if (this.config.runs.using !== "docker") {
			this.config.runs.using = "docker";
		}
		this.config.runs.env = env;
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
	build(): LocalActionBuildOutput {
		// Build inputs if present
		let inputs: Record<string, ActionInputConfig> | undefined;
		if (this.config.inputs && Object.keys(this.config.inputs).length > 0) {
			inputs = {};
			for (const [name, input] of Object.entries(this.config.inputs)) {
				inputs[name] = {
					description: input.description,
					required: input.required,
					default: input.default,
					...(input.type && { type: input.type }),
					...(input.type === "choice" && input.options && { options: input.options }),
				};
			}
		}

		// Build the runs configuration - must always be present
		const runs = this.config.runs ?? { using: "composite" as const };

		const result: LocalActionBuildOutput = {
			...(this.config.name && { name: this.config.name }),
			...(this.config.description && { description: this.config.description }),
			...(this.config.author && { author: this.config.author }),
			...(this.config.branding && { branding: this.config.branding }),
			...(inputs && { inputs }),
			...(this.config.outputs && Object.keys(this.config.outputs).length > 0 && { outputs: this.config.outputs }),
			runs: runs as LocalActionBuildOutput["runs"],
		};

		return result;
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
	 * Generate the action.yml content as YAML string
	 */
	toYAML(): string {
		const config = this.build();
		const yaml = require("js-yaml");
		let yamlContent = yaml.dump(config, {
			indent: 2,
			lineWidth: -1,
			noRefs: true,
			sortKeys: false,
		});

		// Add warning header
		const warningHeader = `# ⚠️  WARNING: This file is generated by Flughafen
#
# This action was generated from TypeScript source code.
# Direct edits to this YAML file will be lost on the next build.
#
# To make changes:
#   1. Edit the source TypeScript action file
#   2. Run: flughafen build
#
# Learn more: https://github.com/jpwesselink/flughafen
#\n`;
		yamlContent = warningHeader + yamlContent;

		// Inject action-level comment at the top (after warning header)
		if (this.actionComment) {
			const commentLines = this.actionComment
				.split("\n")
				.map((line) => `# ${line}`)
				.join("\n");
			yamlContent = yamlContent.replace(warningHeader, `${warningHeader}${commentLines}\n`);
		}

		// Inject step comments
		const stepComments = this.getStepComments();
		if (stepComments.size > 0) {
			const lines = yamlContent.split("\n");
			let inStepsSection = false;
			let stepIndex = -1;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				// Detect entering steps section
				if (line.match(/^runs:\s*$/)) {
					// Look ahead for steps
					if (i + 1 < lines.length && lines[i + 1].match(/^\s+steps:\s*$/)) {
						inStepsSection = false; // Will be set on next iteration
					}
				}

				if (line.match(/^\s+steps:\s*$/)) {
					inStepsSection = true;
					continue;
				}

				// Detect step start (array item with -)
				if (inStepsSection && line.match(/^\s+- /)) {
					stepIndex++;
					const stepComment = stepComments.get(stepIndex);
					if (stepComment) {
						const indent = line.match(/^(\s+)-/)?.[1] || "    ";
						const commentLines = stepComment
							.split("\n")
							.map((l) => `${indent}# ${l}`)
							.join("\n");
						lines[i] = `${commentLines}\n${line}`;
					}
				}

				// Exit steps section if we hit a top-level key
				if (inStepsSection && line.match(/^[a-z]/)) {
					inStepsSection = false;
				}
			}

			yamlContent = lines.join("\n");
		}

		return yamlContent;
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
