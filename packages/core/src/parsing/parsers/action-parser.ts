import type { Document } from "yaml";
import { BaseYamlParser } from "../base-parser";

/**
 * Action configuration structure
 */
export interface ActionConfig {
	name: string;
	description?: string;
	author?: string;
	inputs?: Record<string, any>;
	outputs?: Record<string, any>;
	runs: {
		using: "composite" | "node20" | "node16" | "docker";
		steps?: any[];
		main?: string;
		image?: string;
		entrypoint?: string;
		args?: string[];
		env?: Record<string, string>;
	};
	branding?: {
		icon?: string;
		color?: string;
	};
}

/**
 * Analysis result for action.yml files
 */
export interface ActionAnalysis {
	filePath: string;
	name: string;
	config: ActionConfig;
	actionType: "composite" | "node" | "docker";
	inputCount: number;
	outputCount: number;
	stepCount: number;
	hasInputs: boolean;
	hasOutputs: boolean;
	hasBranding: boolean;
}

/**
 * Parser for GitHub Action files (action.yml/action.yaml)
 */
export class ActionParser extends BaseYamlParser<ActionConfig, ActionAnalysis> {
	readonly name = "action";

	/**
	 * Detect if this is an action.yml file
	 */
	detectFileType(filePath: string): boolean {
		const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");
		return (
			normalizedPath.endsWith("/action.yml") ||
			normalizedPath.endsWith("/action.yaml") ||
			normalizedPath === "action.yml" ||
			normalizedPath === "action.yaml"
		);
	}

	/**
	 * Analyze action document
	 */
	analyze(doc: Document, filePath: string): ActionAnalysis {
		// Validate document structure
		if (!doc.contents || typeof doc.contents !== "object" || !("items" in doc.contents)) {
			throw new Error("Invalid action format - expected mapping");
		}

		// Convert to plain object
		const config = this.toJS<ActionConfig>(doc);

		if (!config || typeof config !== "object") {
			throw new Error("Invalid action format");
		}

		// Validate required fields
		if (!config.name) {
			throw new Error("Action missing required 'name' field");
		}

		if (!config.runs) {
			throw new Error("Action missing required 'runs' field");
		}

		// Extract action information
		const actionType = this.determineActionType(config.runs.using);
		const inputCount = config.inputs ? Object.keys(config.inputs).length : 0;
		const outputCount = config.outputs ? Object.keys(config.outputs).length : 0;
		const stepCount = config.runs.steps ? config.runs.steps.length : 0;

		return {
			filePath,
			name: config.name,
			config,
			actionType,
			inputCount,
			outputCount,
			stepCount,
			hasInputs: inputCount > 0,
			hasOutputs: outputCount > 0,
			hasBranding: !!config.branding,
		};
	}

	/**
	 * Generate TypeScript code from action configuration
	 */
	generateTypeScript(config: ActionConfig): string {
		const lines: string[] = [];
		lines.push('import { createLocalAction } from "@flughafen/core";');
		lines.push("");
		lines.push("export default createLocalAction()");

		// Add basic info
		lines.push(`\t.name("${config.name}")`);

		if (config.description) {
			lines.push(`\t.description("${config.description}")`);
		}

		if (config.author) {
			lines.push(`\t.author("${config.author}")`);
		}

		// Add inputs
		if (config.inputs) {
			for (const [inputName, inputConfig] of Object.entries(config.inputs)) {
				if (typeof inputConfig === "object" && inputConfig.description) {
					lines.push(`\t.input("${inputName}", "${inputConfig.description}", ${inputConfig.required || false})`);
				} else {
					lines.push(`\t.input("${inputName}")`);
				}
			}
		}

		// Add outputs
		if (config.outputs) {
			for (const [outputName, outputConfig] of Object.entries(config.outputs)) {
				if (typeof outputConfig === "object" && outputConfig.description) {
					lines.push(`\t.output("${outputName}", "${outputConfig.description}")`);
				} else {
					lines.push(`\t.output("${outputName}")`);
				}
			}
		}

		// Add runs configuration
		this.addRunsConfiguration(lines, config.runs);

		// Add branding
		if (config.branding) {
			const branding: string[] = [];
			if (config.branding.icon) branding.push(`icon: "${config.branding.icon}"`);
			if (config.branding.color) branding.push(`color: "${config.branding.color}"`);
			if (branding.length > 0) {
				lines.push(`\t.branding({ ${branding.join(", ")} })`);
			}
		}

		lines.push("\t.build();");
		return lines.join("\n");
	}

	/**
	 * Determine action type from 'using' field
	 */
	private determineActionType(using: string): "composite" | "node" | "docker" {
		if (using === "composite") return "composite";
		if (using.startsWith("node")) return "node";
		if (using === "docker") return "docker";
		return "composite"; // default
	}

	/**
	 * Add runs configuration to TypeScript generation
	 */
	private addRunsConfiguration(lines: string[], runs: ActionConfig["runs"]): void {
		switch (runs.using) {
			case "composite":
				if (runs.steps && runs.steps.length > 0) {
					for (let i = 0; i < runs.steps.length; i++) {
						const step = runs.steps[i];
						if (step.run) {
							lines.push(`\t.step("${step.run}")`);
						} else if (step.uses) {
							lines.push(`\t.step(step => step.uses("${step.uses}"))`);
						}
					}
				}
				break;

			case "node20":
			case "node16":
				if (runs.main) {
					lines.push(`\t.main("${runs.main}")`);
				}
				break;

			case "docker":
				if (runs.image) {
					lines.push(`\t.image("${runs.image}")`);
				}
				if (runs.entrypoint) {
					lines.push(`\t.entrypoint("${runs.entrypoint}")`);
				}
				break;
		}
	}
}
