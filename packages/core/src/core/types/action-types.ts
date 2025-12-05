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

/** Value types allowed in action step inputs */
export type ActionStepInputValue = string | number | boolean;

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
	with?: Record<string, ActionStepInputValue>;
	env?: Record<string, string>;
	if?: string;
	workingDirectory?: string;
	continueOnError?: boolean | string;
}

/**
 * Built action step with kebab-case keys for YAML output
 */
export interface BuiltActionStep {
	name?: string;
	id?: string;
	run?: string;
	shell?: string;
	uses?: string;
	with?: Record<string, ActionStepInputValue>;
	env?: Record<string, string>;
	if?: string;
	"working-directory"?: string;
	"continue-on-error"?: boolean | string;
}

/** Supported action runtime types */
export type ActionRuntime = "composite" | "node12" | "node16" | "node20" | "node24" | "docker";

/**
 * Runs configuration for composite actions
 */
export interface CompositeActionRuns {
	using: "composite";
	steps?: BuiltActionStep[];
}

/**
 * Runs configuration for Node.js actions
 */
export interface NodeActionRuns {
	using: "node12" | "node16" | "node20" | "node24";
	main: string;
	pre?: string;
	post?: string;
	"pre-if"?: string;
	"post-if"?: string;
}

/**
 * Runs configuration for Docker actions
 */
export interface DockerActionRuns {
	using: "docker";
	image?: string;
	entrypoint?: string;
	"pre-entrypoint"?: string;
	"post-entrypoint"?: string;
	"pre-if"?: string;
	"post-if"?: string;
	args?: string[];
	env?: Record<string, string | number | boolean>;
}

/**
 * Union of all runs configurations
 */
export type ActionRuns = CompositeActionRuns | NodeActionRuns | DockerActionRuns;

/**
 * Branding configuration for GitHub Marketplace
 */
export interface ActionBrandingConfig {
	icon?: string;
	color?: "white" | "yellow" | "blue" | "green" | "orange" | "red" | "purple" | "gray-dark";
}

/**
 * Built local action configuration (output of LocalActionBuilder.build())
 */
export interface LocalActionBuildOutput {
	name?: string;
	description?: string;
	author?: string;
	branding?: ActionBrandingConfig;
	inputs?: Record<string, ActionInputConfig>;
	outputs?: Record<string, ActionOutputConfig>;
	runs: ActionRuns;
}
