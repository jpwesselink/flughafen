export type FileKind =
	| "gha-workflow"
	| "gha-action"
	| "dependabot-config"
	| "github-funding"
	| "codeowners"
	| "issue-template"
	| "pr-template"
	| "discussion-template"
	| "contributing"
	| "code-of-conduct"
	| "security"
	| "support"
	| "citation"
	| "unknown";

export interface FileContext {
	path: string;
	basename: string;
	name: string;
	ext: string;
	dir: string;
	relativePath: string;
}

export interface Discriminator {
	name: string;
	probe(file: FileContext): FileKind[];
}