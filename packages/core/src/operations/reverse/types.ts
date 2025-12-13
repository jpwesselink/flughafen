/**
 * Types for reverse engineering operations
 */

export interface ReverseOptions {
	/** Output directory for generated TypeScript files */
	outputDir?: string;
	/** Generate type definitions for discovered actions */
	generateTypes?: boolean;
	/** Extract local actions from .github/actions/ */
	extractLocalActions?: boolean;
	/** Only extract local actions, skip workflows */
	localActionsOnly?: boolean;
	/** Import local actions instead of using string paths */
	importLocalActions?: boolean;
	/** Preserve comments from YAML files */
	preserveComments?: boolean;
	/** Overwrite existing files */
	overwrite?: boolean;
	/** Preview mode - don't write files */
	preview?: boolean;
	/** Skip YAML syntax validation */
	skipYamlValidation?: boolean;
	/** Skip GitHub workflow schema validation */
	skipSchemaValidation?: boolean;
	/** Skip external action validation */
	skipActionValidation?: boolean;
	/** Perform validation only, skip conversion */
	validateOnly?: boolean;
	/** Show detailed validation report */
	validationReport?: boolean;
	/** Strict validation - fail on warnings */
	strictValidation?: boolean;
	/** Original YAML filename (without extension) - used internally */
	originalFilename?: string;
}

export interface WorkflowAnalysis {
	/** Original file path */
	filePath: string;
	/** Workflow name */
	name: string;
	/** Parsed YAML content */
	yaml: Record<string, unknown>;
	/** Triggers/events */
	triggers: WorkflowTrigger[];
	/** Jobs in the workflow */
	jobs: JobAnalysis[];
	/** GitHub Actions used */
	actions: ActionUsage[];
	/** Comments and documentation */
	comments: string[];
	/** Workflow-level environment variables */
	env?: Record<string, string | number | boolean>;
	/** Workflow-level permissions */
	permissions?: Record<string, string>;
	/** Workflow-level concurrency settings */
	concurrency?: Record<string, unknown>;
	/** Workflow-level defaults */
	defaults?: Record<string, unknown>;
}

export interface WorkflowTrigger {
	/** Event type (push, pull_request, etc.) */
	event: string;
	/** Event configuration */
	config?: Record<string, unknown>;
}

export interface JobAnalysis {
	/** Job identifier */
	id: string;
	/** Job name */
	name?: string;
	/** Runner OS (not required for reusable workflow jobs) */
	runsOn: string;
	/** Reusable workflow reference (e.g., org/repo/.github/workflows/workflow.yml@ref) */
	uses?: string;
	/** Job dependencies */
	needs?: string[];
	/** Conditional execution */
	if?: string;
	/** Environment */
	environment?: Record<string, unknown>;
	/** Strategy/matrix */
	strategy?: Record<string, unknown>;
	/** Timeout in minutes */
	timeoutMinutes?: number;
	/** Steps in the job */
	steps: StepAnalysis[];
	/** Job-level configuration */
	config: Record<string, unknown>;
	/** Job-level environment variables */
	env?: Record<string, string | number | boolean>;
	/** Job-level permissions */
	permissions?: Record<string, string>;
	/** Job-level outputs */
	outputs?: Record<string, string>;
	/** Job-level defaults */
	defaults?: Record<string, unknown>;
	/** Job-level concurrency */
	concurrency?: Record<string, unknown>;
	/** Continue on error */
	continueOnError?: boolean;
}

export interface StepAnalysis {
	/** Step name */
	name?: string;
	/** Step ID */
	id?: string;
	/** Action being used */
	uses?: string;
	/** Action inputs */
	with?: Record<string, string | number | boolean>;
	/** Shell command */
	run?: string;
	/** Shell to use for run commands */
	shell?: string;
	/** Environment variables */
	env?: Record<string, string>;
	/** Conditional */
	if?: string;
	/** Working directory */
	workingDirectory?: string;
}

export interface ActionUsage {
	/** Action name and version */
	action: string;
	/** How many times it's used */
	count: number;
	/** Input configurations seen */
	inputs: Array<Record<string, string | number | boolean>>;
}

export interface ReverseResult {
	/** Successfully processed workflows */
	workflows: WorkflowAnalysis[];
	/** Generated TypeScript files */
	generatedFiles: GeneratedFile[];
	/** Discovered actions */
	actions: ActionUsage[];
	/** Local actions found */
	localActions: LocalActionAnalysis[];
	/** Errors encountered */
	errors: ReverseError[];
	/** Warnings */
	warnings: string[];
}

export interface GeneratedFile {
	/** File path */
	path: string;
	/** Generated content */
	content: string;
	/** File type */
	type: "workflow" | "action" | "types" | "local-action";
}

export interface LocalActionAnalysis {
	/** Action path */
	path: string;
	/** Action name */
	name: string;
	/** Action configuration */
	config: LocalActionConfig | null;
}

/**
 * Parsed local action configuration
 */
export interface LocalActionConfig {
	name: string;
	description: string;
	author?: string;
	inputs?: Record<
		string,
		{
			description: string;
			required?: boolean;
			default?: string;
			deprecationMessage?: string;
		}
	>;
	outputs?: Record<
		string,
		{
			description: string;
			value?: string;
		}
	>;
	runs: LocalActionRuns;
	branding?: {
		icon?: string;
		color?: string;
	};
}

/**
 * Local action runs configuration
 */
export type LocalActionRuns =
	| {
			using: "composite";
			steps: Array<{
				name?: string;
				run?: string;
				uses?: string;
				with?: Record<string, string | number | boolean>;
				env?: Record<string, string>;
				shell?: string;
				id?: string;
				if?: string;
			}>;
	  }
	| {
			using: "docker";
			image: string;
			entrypoint?: string;
			args?: string[];
			env?: Record<string, string>;
	  }
	| {
			using: "node12" | "node16" | "node20" | "node24";
			main: string;
			pre?: string;
			post?: string;
	  };

export interface ReverseError {
	/** File path where error occurred */
	file: string;
	/** Error message */
	message: string;
	/** Line number (if available) */
	line?: number;
	/** Column number (if available) */
	column?: number;
	/** Error type */
	type: "yaml" | "parsing" | "generation" | "io" | "validation" | "schema";
}
