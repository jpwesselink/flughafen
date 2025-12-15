import type { JSONSchema7 } from "json-schema";
import type { FileContext } from "../classification/types";
import { BaseHandler } from "./base-handler";

/**
 * Action configuration interface
 */
interface ActionConfig {
	name: string;
	description?: string;
	author?: string;
	inputs?: Record<string, ActionInput>;
	outputs?: Record<string, ActionOutput>;
	runs: ActionRuns;
	branding?: ActionBranding;
}

interface ActionInput {
	description?: string;
	required?: boolean;
	default?: string;
	deprecationMessage?: string;
}

interface ActionOutput {
	description?: string;
	value?: string;
}

interface ActionRuns {
	using: "composite" | "docker" | "node20" | "node16";
	main?: string;
	image?: string;
	steps?: unknown[];
}

interface ActionBranding {
	icon?: string;
	color?: string;
}

/**
 * Handler for GitHub Actions (local actions)
 * Generates TypeScript interfaces and builders for action.yml files
 */
export class ActionHandler extends BaseHandler {
	schema: JSONSchema7 = {
		type: "object",
		required: ["name", "runs"],
		properties: {
			name: {
				type: "string",
				description: "The name of the action",
			},
			description: {
				type: "string",
				description: "A short description of the action",
			},
			author: {
				type: "string",
				description: "The author of the action",
			},
			inputs: {
				type: "object",
				description: "Input parameters for the action",
				patternProperties: {
					"^[a-zA-Z_][a-zA-Z0-9_-]*$": {
						type: "object",
						properties: {
							description: { type: "string" },
							required: { type: "boolean" },
							default: { type: "string" },
							deprecationMessage: { type: "string" },
						},
					},
				},
			},
			outputs: {
				type: "object",
				description: "Output parameters for the action",
				patternProperties: {
					"^[a-zA-Z_][a-zA-Z0-9_-]*$": {
						type: "object",
						properties: {
							description: { type: "string" },
							value: { type: "string" },
						},
					},
				},
			},
			runs: {
				type: "object",
				required: ["using"],
				properties: {
					using: {
						enum: ["composite", "docker", "node20", "node16"],
					},
					main: { type: "string" },
					image: { type: "string" },
					steps: { type: "array" },
				},
			},
			branding: {
				type: "object",
				properties: {
					icon: { type: "string" },
					color: { type: "string" },
				},
			},
		},
		additionalProperties: false,
	};

	emit(content: unknown, context: FileContext): string {
		const action = content as ActionConfig;

		// Extract action name from directory structure or content
		const actionName = this.extractActionName(context.path, action.name);
		const safeActionName = this.sanitizeIdentifier(actionName);
		const pascalActionName = this.toPascalCase(safeActionName);
		const camelActionName = this.toCamelCase(safeActionName);

		// Generate imports
		const imports = this.generateImports([
			"{ LocalAction, ActionInput, ActionOutput, ActionRuns } from '@flughafen/core'",
		]);

		// Generate JSDoc
		const jsdoc = this.generateJSDoc(`Generated from ${context.path}`, {
			generated: new Date().toISOString(),
			source: context.path,
		});

		// Generate TypeScript interfaces
		const interfaceCode = this.generateActionInterface(pascalActionName, action);

		// Generate action data export
		const dataCode = this.generateActionData(camelActionName, pascalActionName, action);

		// Generate builder function
		const builderCode = this.generateActionBuilder(pascalActionName, camelActionName, action);

		return [jsdoc, imports, interfaceCode, "", dataCode, "", builderCode].join("\n");
	}

	/**
	 * Extract action name from path or content
	 */
	private extractActionName(path: string, contentName: string): string {
		// Try to extract from path: .github/actions/{actionName}/action.yml
		const pathParts = path.split("/");
		const actionsIndex = pathParts.indexOf("actions");

		if (actionsIndex >= 0 && actionsIndex < pathParts.length - 1) {
			const actionDir = pathParts[actionsIndex + 1];
			if (actionDir && actionDir !== "action.yml" && actionDir !== "action.yaml") {
				return actionDir;
			}
		}

		// Fallback to content name
		return contentName || "unknown-action";
	}

	/**
	 * Generate TypeScript interface for action configuration
	 */
	private generateActionInterface(name: string, action: ActionConfig): string {
		let inputsType = "Record<string, unknown>";
		let outputsType = "Record<string, unknown>";

		// Generate specific input types if available
		if (action.inputs && Object.keys(action.inputs).length > 0) {
			const inputProps = Object.entries(action.inputs)
				.map(([key, input]) => {
					const optional = input.required === false ? "?" : "";
					const desc = input.description ? `/** ${input.description} */\n  ` : "";
					return `${desc}${key}${optional}: string;`;
				})
				.join("\n  ");

			inputsType = `{
  ${inputProps}
}`;
		}

		// Generate specific output types if available
		if (action.outputs && Object.keys(action.outputs).length > 0) {
			const outputProps = Object.entries(action.outputs)
				.map(([key, output]) => {
					const desc = output.description ? `/** ${output.description} */\n  ` : "";
					return `${desc}${key}: string;`;
				})
				.join("\n  ");

			outputsType = `{
  ${outputProps}
}`;
		}

		return `export interface ${name}ActionConfig {
  name: string;
  description?: string;
  author?: string;
  inputs?: ${inputsType};
  outputs?: ${outputsType};
  runs: {
    using: '${action.runs.using}';
    main?: string;
    image?: string;
    steps?: unknown[];
  };
  branding?: {
    icon?: string;
    color?: string;
  };
}`;
	}

	/**
	 * Generate action data export
	 */
	private generateActionData(camelName: string, pascalName: string, action: ActionConfig): string {
		return `export const ${camelName}ActionData: ${pascalName}ActionConfig = ${JSON.stringify(action, null, 2)};`;
	}

	/**
	 * Generate action builder function
	 */
	private generateActionBuilder(pascalName: string, camelName: string, action: ActionConfig): string {
		const jsdoc = this.generateJSDoc(`Create a ${pascalName} local action using Flughafen builders`, {
			returns: `LocalAction builder instance`,
		});

		const nameeLine = `.name('${action.name}')`;
		const descriptionLine = action.description ? `\n    .description('${action.description}')` : "";

		return `${jsdoc}export function create${pascalName}Action(): LocalAction {
  return new LocalAction()${nameeLine}${descriptionLine}
    // TODO: Add action configuration
    // Use ${camelName}ActionData for reference
    // .input('input-name', { description: 'Input description', required: true })
    // .output('output-name', { description: 'Output description', value: 'output-value' })
    // .runs({ using: '${action.runs.using}' })
    ;
}`;
	}
}
