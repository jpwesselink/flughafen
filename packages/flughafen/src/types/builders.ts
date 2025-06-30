/**
 * Builder Pattern Types
 *
 * Type aliases and extensions for the builder pattern, based on generated GitHub schema types.
 * These provide a clean, builder-friendly interface while leveraging the official GitHub schemas.
 */

import type { GitHubAction } from "../../generated/types/github-action";
// Import core generated types
import type {
	Concurrency,
	Container,
	Defaults,
	Environment,
	GitHubWorkflow,
	NormalJob,
	PermissionsEvent,
} from "../../generated/types/github-workflow";

// Re-export for external use
export type {
	GitHubWorkflow,
	NormalJob,
	Container,
	Defaults,
	Concurrency,
	Environment,
	PermissionsEvent,
	GitHubAction,
};

// Builder-friendly type aliases
export type WorkflowConfig = GitHubWorkflow;
export type JobConfig = NormalJob;
export type ContainerConfig = Container;
export type DefaultsConfig = Defaults;
export type ConcurrencyConfig = Concurrency;
export type EnvironmentConfig = Environment;
export type PermissionsConfig = PermissionsEvent;

// Additional builder-specific types that extend the generated ones
export interface StepConfig {
	id?: string;
	name?: string;
	if?: string;
	run?: string;
	uses?: string;
	with?: Record<string, any>;
	env?: Record<string, string>;
	"working-directory"?: string;
	shell?: ShellType;
	"continue-on-error"?: boolean;
	"timeout-minutes"?: number;
}

// Trigger configuration types (extend generated where needed)
export interface TriggerConfig {
	push?: PushConfig | null;
	pull_request?: PullRequestConfig | null;
	schedule?: ScheduleConfig[];
	workflow_dispatch?: WorkflowDispatchConfig;
	workflow_call?: WorkflowCallConfig;
	issues?: IssuesConfig;
	release?: ReleaseConfig;
	repository_dispatch?: RepositoryDispatchConfig;
	[key: string]: any;
}

export interface PushConfig {
	branches?: string[];
	tags?: string[];
	paths?: string[];
	"branches-ignore"?: string[];
	"tags-ignore"?: string[];
	"paths-ignore"?: string[];
}

export interface PullRequestConfig {
	types?: PullRequestEventType[];
	branches?: string[];
	paths?: string[];
	"branches-ignore"?: string[];
	"paths-ignore"?: string[];
}

export interface ScheduleConfig {
	cron: string;
}

export interface WorkflowDispatchConfig {
	inputs?: WorkflowInputs;
}

export interface WorkflowCallConfig {
	inputs?: WorkflowCallInputs;
	secrets?: WorkflowCallSecrets;
}

export interface IssuesConfig {
	types?: IssueEventType[];
}

export interface ReleaseConfig {
	types?: ReleaseEventType[];
}

export interface RepositoryDispatchConfig {
	types?: string[];
}

// Permission types
export type PermissionLevel = "read" | "write" | "none";

// Runner types
export type Runner =
	| "ubuntu-latest"
	| "ubuntu-22.04"
	| "ubuntu-20.04"
	| "ubuntu-18.04"
	| "windows-latest"
	| "windows-2022"
	| "windows-2019"
	| "macos-latest"
	| "macos-12"
	| "macos-11"
	| "macos-10.15"
	| "self-hosted"
	| string[]
	| { group: string; labels?: string | string[] };

// Strategy types
export interface MatrixStrategy {
	matrix: Record<string, (string | number | boolean)[]> & {
		include?: Record<string, any>[];
		exclude?: Record<string, any>[];
	};
	"fail-fast"?: boolean;
	"max-parallel"?: number;
}

// Service configuration
export interface ServiceConfig extends ContainerConfig {}

// Shell types
export type ShellType = "bash" | "pwsh" | "python" | "sh" | "cmd" | "powershell" | string;

// Event types
export type PullRequestEventType =
	| "assigned"
	| "unassigned"
	| "labeled"
	| "unlabeled"
	| "opened"
	| "edited"
	| "closed"
	| "reopened"
	| "synchronize"
	| "converted_to_draft"
	| "ready_for_review"
	| "locked"
	| "unlocked"
	| "review_requested"
	| "review_request_removed"
	| "auto_merge_enabled"
	| "auto_merge_disabled";

export type IssueEventType =
	| "opened"
	| "edited"
	| "deleted"
	| "transferred"
	| "pinned"
	| "unpinned"
	| "closed"
	| "reopened"
	| "assigned"
	| "unassigned"
	| "labeled"
	| "unlabeled"
	| "locked"
	| "unlocked"
	| "milestoned"
	| "demilestoned";

export type ReleaseEventType =
	| "published"
	| "unpublished"
	| "created"
	| "edited"
	| "deleted"
	| "prereleased"
	| "released";

// Input types for workflow dispatch and reusable workflows
export interface WorkflowInputs {
	[key: string]: {
		description: string;
		required?: boolean;
		default?: string | boolean;
		type?: "string" | "boolean" | "choice" | "environment";
		options?: string[];
	};
}

export interface WorkflowCallInputs {
	[key: string]: {
		description?: string;
		required?: boolean;
		default?: string | number | boolean;
		type: "string" | "number" | "boolean";
	};
}

export interface WorkflowCallSecrets {
	[key: string]: {
		description?: string;
		required: boolean;
	};
}

// Common action option types
export interface RunOptions {
	shell?: ShellType;
	"working-directory"?: string;
}

export interface ActionOptions {
	with?: Record<string, any>;
}

// Popular action configuration types
export interface CheckoutOptions {
	repository?: string;
	ref?: string;
	token?: string;
	path?: string;
	clean?: boolean;
	"fetch-depth"?: number;
	submodules?: boolean | "recursive";
}

export interface NodeOptions {
	"node-version"?: string;
	"node-version-file"?: string;
	registry?: string;
	scope?: string;
	token?: string;
	cache?: "npm" | "yarn" | "pnpm";
	"cache-dependency-path"?: string;
}

// Validation types
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

export interface ValidationError {
	message: string;
	instancePath?: string;
	schemaPath?: string;
	keyword?: string;
	params?: any;
}
