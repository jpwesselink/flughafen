import type { JSONSchema7 } from "json-schema";
import type { FileContext } from "../classification/types";
import { BaseHandler } from "./base-handler";

/**
 * Dependabot configuration interface
 */
interface DependabotConfig {
	version: 2;
	updates: DependabotUpdate[];
	registries?: Record<string, DependabotRegistry>;
}

interface DependabotUpdate {
	"package-ecosystem": string;
	directory: string;
	schedule: DependabotSchedule;
	"target-branch"?: string;
	reviewers?: string[];
	assignees?: string[];
	labels?: string[];
	"commit-message"?: DependabotCommitMessage;
}

interface DependabotSchedule {
	interval: "daily" | "weekly" | "monthly";
	day?: string;
	time?: string;
	timezone?: string;
}

interface DependabotRegistry {
	type: string;
	url: string;
	username?: string;
	password?: string;
}

interface DependabotCommitMessage {
	prefix?: string;
	"prefix-development"?: string;
	include?: "scope";
}

/**
 * Handler for Dependabot configuration
 * Generates TypeScript interfaces and helper functions for dependabot.yml files
 */
export class DependabotHandler extends BaseHandler {
	schema: JSONSchema7 = {
		type: "object",
		required: ["version", "updates"],
		properties: {
			version: {
				const: 2,
				description: "Dependabot configuration version",
			},
			updates: {
				type: "array",
				description: "Update configurations for different package ecosystems",
				items: {
					type: "object",
					required: ["package-ecosystem", "directory", "schedule"],
					properties: {
						"package-ecosystem": {
							type: "string",
							enum: [
								"bundler",
								"cargo",
								"composer",
								"docker",
								"elm",
								"gitsubmodule",
								"github-actions",
								"gomod",
								"gradle",
								"maven",
								"mix",
								"npm",
								"nuget",
								"pip",
								"pub",
								"terraform",
							],
						},
						directory: {
							type: "string",
							description: "Location of package manifests",
						},
						schedule: {
							type: "object",
							required: ["interval"],
							properties: {
								interval: {
									enum: ["daily", "weekly", "monthly"],
								},
							},
						},
					},
				},
			},
		},
	};

	emit(content: unknown, context: FileContext): string {
		const dependabot = content as DependabotConfig;

		// Generate imports
		const imports = this.generateImports([]);

		// Generate JSDoc
		const jsdoc = this.generateJSDoc(`Generated from ${context.path}`, {
			generated: new Date().toISOString(),
			source: context.path,
		});

		// Generate TypeScript interfaces
		const interfaceCode = this.generateDependabotInterface();

		// Generate dependabot data export
		const dataCode = this.generateDependabotData(dependabot);

		// Generate helper functions
		const helpersCode = this.generateDependabotHelpers();

		return [jsdoc, imports, interfaceCode, "", dataCode, "", helpersCode].join("\n");
	}

	/**
	 * Generate TypeScript interface for Dependabot configuration
	 */
	private generateDependabotInterface(): string {
		return `export interface DependabotConfig {
  version: 2;
  updates: DependabotUpdate[];
  registries?: Record<string, DependabotRegistry>;
}

export interface DependabotUpdate {
  'package-ecosystem': string;
  directory: string;
  schedule: DependabotSchedule;
  'target-branch'?: string;
  reviewers?: string[];
  assignees?: string[];
  labels?: string[];
  'commit-message'?: DependabotCommitMessage;
}

export interface DependabotSchedule {
  interval: 'daily' | 'weekly' | 'monthly';
  day?: string;
  time?: string;
  timezone?: string;
}

export interface DependabotRegistry {
  type: string;
  url: string;
  username?: string;
  password?: string;
}

export interface DependabotCommitMessage {
  prefix?: string;
  'prefix-development'?: string;
  include?: 'scope';
}`;
	}

	/**
	 * Generate Dependabot data export
	 */
	private generateDependabotData(dependabot: DependabotConfig): string {
		return `export const dependabotConfig: DependabotConfig = ${JSON.stringify(dependabot, null, 2)};`;
	}

	/**
	 * Generate helper functions for Dependabot configuration
	 */
	private generateDependabotHelpers(): string {
		return `/**
 * Get all package ecosystems configured for Dependabot updates
 */
export function getPackageEcosystems(): string[] {
  return dependabotConfig.updates.map(update => update['package-ecosystem']);
}

/**
 * Get updates for a specific package ecosystem
 */
export function getUpdatesForEcosystem(ecosystem: string): DependabotUpdate[] {
  return dependabotConfig.updates.filter(update => update['package-ecosystem'] === ecosystem);
}

/**
 * Check if an ecosystem is configured
 */
export function hasEcosystem(ecosystem: string): boolean {
  return getPackageEcosystems().includes(ecosystem);
}

/**
 * Get all configured directories
 */
export function getWatchedDirectories(): string[] {
  return dependabotConfig.updates.map(update => update.directory);
}

/**
 * Get the update schedule for a directory
 */
export function getScheduleForDirectory(directory: string): DependabotSchedule | undefined {
  const update = dependabotConfig.updates.find(update => update.directory === directory);
  return update?.schedule;
}

/**
 * Check if GitHub Actions updates are enabled
 */
export function hasGitHubActionsUpdates(): boolean {
  return hasEcosystem('github-actions');
}`;
	}
}
