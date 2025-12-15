import type { Document } from "yaml";
import { BaseYamlParser } from "../base-parser";

/**
 * Simplified workflow configuration for demonstration
 */
export interface WorkflowConfig {
	name?: string;
	on: any;
	jobs: Record<string, any>;
	env?: Record<string, string>;
	permissions?: Record<string, string>;
	concurrency?: Record<string, any>;
	defaults?: Record<string, any>;
}

/**
 * Analysis result for workflow files
 */
export interface WorkflowAnalysis {
	filePath: string;
	name: string;
	config: WorkflowConfig;
	triggers: string[];
	jobCount: number;
	hasSecrets: boolean;
	hasMatrix: boolean;
}

/**
 * Parser for GitHub Actions workflow files
 */
export class WorkflowParser extends BaseYamlParser<WorkflowConfig, WorkflowAnalysis> {
	readonly name = "workflow";

	/**
	 * Detect if this is a workflow file
	 */
	detectFileType(filePath: string): boolean {
		const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");
		return (
			normalizedPath.includes(".github/workflows/") &&
			(normalizedPath.endsWith(".yml") || normalizedPath.endsWith(".yaml"))
		);
	}

	/**
	 * Analyze workflow document
	 */
	analyze(doc: Document, filePath: string): WorkflowAnalysis {
		// Validate document structure
		if (!doc.contents || typeof doc.contents !== "object" || !("items" in doc.contents)) {
			throw new Error("Invalid workflow format - expected mapping");
		}

		// Convert to plain object
		const config = this.toJS<WorkflowConfig>(doc);

		if (!config || typeof config !== "object") {
			throw new Error("Invalid workflow format");
		}

		// Extract workflow information
		const name = config.name || this.extractNameFromPath(filePath);
		const triggers = this.extractTriggers(config.on);
		const jobCount = config.jobs ? Object.keys(config.jobs).length : 0;

		// Check for secrets and matrix usage
		const hasSecrets = this.hasSecretsUsage(config);
		const hasMatrix = this.hasMatrixUsage(config);

		return {
			filePath,
			name,
			config,
			triggers,
			jobCount,
			hasSecrets,
			hasMatrix,
		};
	}

	/**
	 * Generate TypeScript code from workflow configuration
	 */
	generateTypeScript(config: WorkflowConfig): string {
		const lines: string[] = [];
		lines.push('import { createWorkflow } from "@flughafen/core";');
		lines.push("");
		lines.push("export default createWorkflow()");

		// Add workflow name
		if (config.name) {
			lines.push(`\t.name("${config.name}")`);
		}

		// Add triggers
		if (config.on) {
			if (typeof config.on === "string") {
				lines.push(`\t.on("${config.on}")`);
			} else if (Array.isArray(config.on)) {
				for (const trigger of config.on) {
					lines.push(`\t.on("${trigger}")`);
				}
			} else {
				// Object format - simplified
				for (const [trigger, triggerConfig] of Object.entries(config.on)) {
					if (triggerConfig === null || triggerConfig === undefined) {
						lines.push(`\t.on("${trigger}")`);
					} else {
						lines.push(`\t.on("${trigger}", ${JSON.stringify(triggerConfig)})`);
					}
				}
			}
		}

		// Add jobs (simplified)
		if (config.jobs) {
			for (const [jobId, jobConfig] of Object.entries(config.jobs)) {
				lines.push(`\t.job("${jobId}", job => job`);
				if (jobConfig["runs-on"]) {
					lines.push(`\t\t.runsOn("${jobConfig["runs-on"]}")`);
				}
				lines.push(`\t)`);
			}
		}

		lines.push("\t.build();");
		return lines.join("\n");
	}

	/**
	 * Extract workflow name from file path
	 */
	private extractNameFromPath(filePath: string): string {
		const fileName = filePath.split("/").pop() || "";
		return fileName.replace(/\.(yml|yaml)$/, "").replace(/[-_]/g, " ");
	}

	/**
	 * Extract trigger names
	 */
	private extractTriggers(onConfig: any): string[] {
		if (!onConfig) return [];

		if (typeof onConfig === "string") {
			return [onConfig];
		}

		if (Array.isArray(onConfig)) {
			return onConfig.map(String);
		}

		if (typeof onConfig === "object") {
			return Object.keys(onConfig);
		}

		return [];
	}

	/**
	 * Check if workflow uses secrets
	 */
	private hasSecretsUsage(config: WorkflowConfig): boolean {
		const content = JSON.stringify(config);
		return content.includes("secrets.") || content.includes("${{ secrets");
	}

	/**
	 * Check if workflow uses matrix strategy
	 */
	private hasMatrixUsage(config: WorkflowConfig): boolean {
		const content = JSON.stringify(config);
		return content.includes("matrix.") || content.includes("strategy:");
	}
}
