export type WorkflowProps = {
	// The name of your workflow. GitHub displays the names of your workflows on your repository's "Actions" tab.
	// If you omit name, GitHub sets it to the workflow file path relative to the root of the repository.
	name?: string;
	/*
	@description: The name for workflow runs generated from the workflow. GitHub displays the workflow run name in the list of 
	workflow runs on your repository's "Actions" tab. If run-name is omitted or is only whitespace, then the run 
	name is set to event-specific information for the workflow run. For example, for a workflow triggered by a 
	push or pull_request event, it is set as the commit message.
	@see: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#run-name
	*/
	runName?: string;

	on?: TriggerProps;

	permissions?: WorkflowPermissions;

	env?: { [key: string]: string };

	defaults?: {
		[jobId: string]: {
			needs?: string;
		};
	};

	concurrency?:
		| {
				[key: string]: {
					group?: string;
					cancelInProgress?: boolean;
				};
		  }
		| string;

	jobs?: {
		[x: string]: JobProps;
	};
};

export type JobProps = {
	name?: string;
	steps?: StepProps[];
	runsOn: string;
	uses?: string;
};

export type StepProps = {
	id?: string;
	name?: string;
	run?: string;
};

export type TriggerProps = {
	push?: {
		branches?: string[];
		tags?: string[];
		paths?: string[];
	};
	fork?: boolean;
	pullRequest?: {
		types: (
			| "assigned"
			| "unassigned"
			| "labeled"
			| "unlabeled"
			| "opened"
			| "edited"
			| "closed"
			| "reopened"
			| "synchronize"
			| "convertedToDraft"
			| "readyForReview"
			| "locked"
			| "unlocked"
			| "reviewRequested"
			| "reviewRequestRemoved"
			| "autoMergeEnabled"
			| "autoMerge_Disable"
		)[];
	};
};

export type EventTrigger =
	| "push"
	| "fork"
	| "pull_request"
	| "label"
	| "issues";

const workflowPermissionTypes = [
	"actions",
	"checks",
	"contents",
	"deployments",
	"id-token",
	"issues",
	"discussions",
	"packages",
	"pages",
	"pull-requests",
	"repository-projects",
	"security-events",
	"statuses",
] as const;

export type WorkflowPermissionType = typeof workflowPermissionTypes[number];
export type WorkflowPermissions = {
	[key in WorkflowPermissionType]?: "read" | "write" | "none";
} & ("read-all" | "write-all");

export type Workflow = Readonly<WorkflowProps> & {
	addStep: () => Workflow;
	addJob: (job: JobProps) => Workflow;
};
// rome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyFunc = (...args: any[]) => any;

// Maps over each argument and carries the return type
export type Curry<Fn extends AnyFunc> = Parameters<Fn> extends [
	infer FirstArg,
	...infer Rest,
]
	? (arg: FirstArg) => Curry<(...args: Rest) => ReturnType<Fn>>
	: ReturnType<Fn>;

// this
