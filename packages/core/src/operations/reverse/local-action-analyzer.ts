import { readFileSync } from "node:fs";
import * as yaml from "js-yaml";
import type { LocalActionAnalysis } from "./types";

/** Parsed YAML content - typed loosely since YAML structure is validated at runtime */
type ParsedYaml = Record<string, any>;

/**
 * Analyzes local GitHub Actions defined in action.yml files
 */
export class LocalActionAnalyzer {
	/**
	 * Parse a local action.yml file
	 */
	async analyzeLocalAction(actionPath: string): Promise<LocalActionAnalysis> {
		try {
			const content = readFileSync(actionPath, "utf-8");
			const parsedYaml = yaml.load(content) as ParsedYaml;

			if (!parsedYaml || typeof parsedYaml !== "object") {
				throw new Error("Invalid action.yml format");
			}

			// Extract action directory name from path
			const actionDir = actionPath.replace(/\/action\.ya?ml$/, "");
			const actionName = actionDir.split("/").pop() || "unknown";

			return {
				path: actionPath,
				name: actionName,
				config: {
					name: parsedYaml.name as string,
					description: parsedYaml.description as string,
					author: parsedYaml.author as string | undefined,
					inputs: this.extractInputs(parsedYaml.inputs as Record<string, unknown> | undefined),
					outputs: this.extractOutputs(parsedYaml.outputs as Record<string, unknown> | undefined),
					runs: this.extractRuns(parsedYaml.runs as Record<string, unknown>) as any,
					branding: parsedYaml.branding as { icon?: string; color?: string } | undefined,
				},
			};
		} catch (error) {
			throw new Error(
				`Failed to parse action.yml at ${actionPath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Extract and normalize input definitions
	 */
	private extractInputs(inputs?: Record<string, unknown>) {
		if (!inputs) return {};

		const result: Record<
			string,
			{
				description: string;
				required?: boolean;
				default?: string;
				deprecationMessage?: string;
			}
		> = {};

		for (const [key, input] of Object.entries(inputs)) {
			const inputObj = input as Record<string, unknown>;
			result[key] = {
				description: inputObj.description as string,
				required: inputObj.required as boolean | undefined,
				default: inputObj.default as string | undefined,
				deprecationMessage: inputObj.deprecationMessage as string | undefined,
			};
		}

		return result;
	}

	/**
	 * Extract and normalize output definitions
	 */
	private extractOutputs(outputs?: Record<string, unknown>) {
		if (!outputs) return {};

		const result: Record<
			string,
			{
				description: string;
				value?: string;
			}
		> = {};

		for (const [key, output] of Object.entries(outputs)) {
			if (typeof output === "object" && output !== null) {
				const outputObj = output as Record<string, unknown>;
				result[key] = {
					description: (outputObj.description as string) || "",
					value: outputObj.value as string | undefined,
				};
			}
		}

		return result;
	}

	/**
	 * Extract runs configuration
	 */
	private extractRuns(runs: Record<string, unknown>) {
		if (!runs || typeof runs !== "object") {
			throw new Error("Invalid runs configuration");
		}

		if ("using" in runs) {
			if (runs.using === "composite") {
				return {
					using: "composite" as const,
					steps: (runs.steps as unknown[]) || [],
				};
			} else if (runs.using === "docker") {
				return {
					using: "docker" as const,
					image: runs.image as string,
					entrypoint: runs.entrypoint as string | undefined,
					args: runs.args as string[] | undefined,
					env: runs.env as Record<string, unknown> | undefined,
				};
			} else if (["node12", "node16", "node20", "node24"].includes(runs.using as string)) {
				return {
					using: runs.using as "node12" | "node16" | "node20" | "node24",
					main: runs.main as string,
					pre: runs.pre as string | undefined,
					post: runs.post as string | undefined,
				};
			}
		}

		return runs;
	}

	/**
	 * Validate local action structure
	 */
	validateLocalActionStructure(analysis: LocalActionAnalysis): Array<{
		type: "error" | "warning";
		message: string;
	}> {
		const issues: Array<{ type: "error" | "warning"; message: string }> = [];

		if (!analysis.config) {
			issues.push({
				type: "error",
				message: "Failed to parse action configuration",
			});
			return issues;
		}

		// Check required fields
		if (!analysis.config.name) {
			issues.push({
				type: "error",
				message: "Action missing required 'name' field",
			});
		}

		if (!analysis.config.description) {
			issues.push({
				type: "error",
				message: "Action missing required 'description' field",
			});
		}

		if (!analysis.config.runs) {
			issues.push({
				type: "error",
				message: "Action missing required 'runs' field",
			});
		}

		// Validate runs configuration
		if (analysis.config.runs) {
			const runs = analysis.config.runs;

			if ("using" in runs) {
				if (runs.using === "composite" && (!runs.steps || runs.steps.length === 0)) {
					issues.push({
						type: "warning",
						message: "Composite action has no steps defined",
					});
				}

				if (runs.using === "docker" && !runs.image) {
					issues.push({
						type: "error",
						message: "Docker action missing required 'image' field",
					});
				}

				if (["node12", "node16", "node20", "node24"].includes(runs.using) && !(runs as Record<string, unknown>).main) {
					issues.push({
						type: "error",
						message: "Node.js action missing required 'main' field",
					});
				}
			}
		}

		// Check for deprecated node versions
		if (analysis.config.runs && "using" in analysis.config.runs) {
			if (analysis.config.runs.using === "node12") {
				issues.push({
					type: "warning",
					message: "Node.js 12 is deprecated, consider upgrading to node20",
				});
			}
			if (analysis.config.runs.using === "node16") {
				issues.push({
					type: "warning",
					message: "Node.js 16 will be deprecated, consider upgrading to node20",
				});
			}
		}

		return issues;
	}
}
