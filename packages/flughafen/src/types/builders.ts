// Core workflow configuration types
export interface WorkflowConfig {
	name?: string;
	"run-name"?: string;
	on: TriggerConfig;
	permissions?: PermissionsConfig;
	env?: Record<string, string>;
	defaults?: DefaultsConfig;
	concurrency?: ConcurrencyConfig;
	jobs: Record<string, JobConfig>;
}

export interface JobConfig {
	name?: string;
	"runs-on"?: Runner;
	uses?: string;
	needs?: string | string[];
	if?: string;
	permissions?: PermissionsConfig;
	env?: Record<string, string>;
	outputs?: Record<string, string>;
	strategy?: MatrixStrategy;
	container?: ContainerConfig;
	services?: Record<string, ServiceConfig>;
	steps?: StepConfig[];
	"timeout-minutes"?: number;
	"continue-on-error"?: boolean;
	concurrency?: ConcurrencyConfig;
	environment?: EnvironmentConfig;
}

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

// Trigger configuration types
export interface TriggerConfig {
	push?: PushConfig | null;
	pull_request?: PullRequestConfig | null;
	schedule?: ScheduleConfig[];
	workflow_dispatch?: WorkflowDispatchConfig;
	workflow_call?: WorkflowCallConfig;
	issues?: IssuesConfig;
	release?: ReleaseConfig;
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
export type PermissionsConfig =
	| {
			actions?: PermissionLevel;
			checks?: PermissionLevel;
			contents?: PermissionLevel;
			deployments?: PermissionLevel;
			discussions?: PermissionLevel;
			"id-token"?: PermissionLevel;
			issues?: PermissionLevel;
			packages?: PermissionLevel;
			pages?: PermissionLevel;
			"pull-requests"?: PermissionLevel;
			"repository-projects"?: PermissionLevel;
			"security-events"?: PermissionLevel;
			statuses?: PermissionLevel;
	  }
	| "read-all"
	| "write-all";

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

// Container types
export interface ContainerConfig {
	image: string;
	credentials?: {
		username: string;
		password: string;
	};
	env?: Record<string, string>;
	ports?: (number | string)[];
	volumes?: string[];
	options?: string;
}

export interface ServiceConfig extends ContainerConfig {}

// Environment types
export interface EnvironmentConfig {
	name: string;
	url?: string;
}

// Concurrency types
export interface ConcurrencyConfig {
	group: string;
	"cancel-in-progress"?: boolean;
}

// Defaults types
export interface DefaultsConfig {
	run?: {
		shell?: ShellType;
		"working-directory"?: string;
	};
}

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

// Input types
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

// Option types for common actions
export interface RunOptions {
	shell?: ShellType;
	"working-directory"?: string;
}

export interface ActionOptions {
	with?: Record<string, any>;
}

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
