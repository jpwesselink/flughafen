import type { JSONSchema7 } from "json-schema";
import type { FileContext } from "../classification/types";
import { BaseHandler } from "./base-handler";

/**
 * Workflow configuration interface
 */
interface WorkflowConfig {
	name?: string;
	on?: unknown;
	jobs: Record<string, unknown>;
	env?: Record<string, unknown>;
	permissions?: Record<string, unknown>;
	concurrency?: Record<string, unknown>;
	defaults?: Record<string, unknown>;
}

/**
 * Handler for GitHub Actions workflows
 * Generates TypeScript interfaces and builders for workflow files
 */
export class WorkflowHandler extends BaseHandler {
	schema: JSONSchema7 = {
		type: "object",
		required: ["jobs"],
		properties: {
			name: {
				type: "string",
				description: "The name of the workflow",
			},
			on: {
				description: "Events that trigger the workflow",
				oneOf: [
					{ type: "string" },
					{
						type: "object",
						properties: {
							push: { type: "object" },
							pull_request: { type: "object" },
							schedule: { type: "array" },
							workflow_dispatch: { type: "object" },
						},
					},
				],
			},
			jobs: {
				type: "object",
				description: "Jobs that make up the workflow",
				patternProperties: {
					"^[a-zA-Z_][a-zA-Z0-9_-]*$": {
						type: "object",
						required: ["runs-on"],
						properties: {
							"runs-on": {
								oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
							},
							steps: {
								type: "array",
								items: { type: "object" },
							},
							needs: {
								oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
							},
						},
					},
				},
				additionalProperties: false,
			},
			env: {
				type: "object",
				description: "Environment variables",
			},
			permissions: {
				type: "object",
				description: "Permissions for the workflow",
			},
		},
		additionalProperties: false,
	};

	emit(content: unknown, context: FileContext): string {
		const workflow = content as WorkflowConfig;

		// Extract workflow name from content or filename
		const workflowName = workflow.name || this.extractNameFromPath(context.path);
		const safeWorkflowName = this.sanitizeIdentifier(workflowName);
		const pascalWorkflowName = this.toPascalCase(safeWorkflowName);
		const camelWorkflowName = this.toCamelCase(safeWorkflowName);

		// Generate imports
		const imports = this.generateImports(["{ Workflow, Job, Step } from '@flughafen/core'"]);

		// Generate JSDoc
		const jsdoc = this.generateJSDoc(`Generated from ${context.path}`, {
			generated: new Date().toISOString(),
			source: context.path,
		});

		// Generate TypeScript interface
		const interfaceCode = this.generateWorkflowInterface(pascalWorkflowName, workflow);

		// Generate workflow data export
		const dataCode = this.generateWorkflowData(camelWorkflowName, pascalWorkflowName, workflow);

		// Generate builder function
		const builderCode = this.generateWorkflowBuilder(pascalWorkflowName, camelWorkflowName, workflow);

		return [jsdoc, imports, interfaceCode, "", dataCode, "", builderCode].join("\n");
	}

	/**
	 * Extract workflow name from file path
	 */
	private extractNameFromPath(path: string): string {
		const filename = path.split("/").pop() || "workflow";
		return filename.replace(/\.(yml|yaml)$/, "");
	}

	/**
	 * Generate TypeScript interface for workflow configuration
	 */
	private generateWorkflowInterface(name: string, workflow: WorkflowConfig): string {
		return `export interface ${name}WorkflowConfig {
  name?: string;
  on?: unknown;
  jobs: Record<string, unknown>;
  env?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  concurrency?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}`;
	}

	/**
	 * Generate workflow data export
	 */
	private generateWorkflowData(camelName: string, pascalName: string, workflow: WorkflowConfig): string {
		return `export const ${camelName}WorkflowData: ${pascalName}WorkflowConfig = ${JSON.stringify(workflow, null, 2)};`;
	}

	/**
	 * Generate workflow builder function
	 */
	private generateWorkflowBuilder(pascalName: string, camelName: string, workflow: WorkflowConfig): string {
		const jsdoc = this.generateJSDoc(`Create a ${pascalName} workflow using Flughafen builders`, {
			returns: `Workflow builder instance`,
		});

		const workflowNameLine = workflow.name ? `.name('${workflow.name}')` : `.name('${pascalName}')`;

		return `${jsdoc}export function create${pascalName}Workflow(): Workflow {
  return new Workflow()${workflowNameLine}
    // TODO: Add workflow configuration
    // Use ${camelName}WorkflowData for reference
    // .on(/* trigger configuration */)
    // .job('job-name', job => job.runsOn('ubuntu-latest').steps(/* steps */))
    ;
}`;
	}
}
