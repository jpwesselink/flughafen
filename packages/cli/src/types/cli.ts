export interface SynthOptions {
	file: string;
	dir?: string;
	output?: string;
	silent?: boolean;
	verbose?: boolean;
	"dry-run"?: boolean;
}

export interface GenerateTypesOptions {
	"workflow-dir"?: string;
	output?: string;
	"github-token"?: string;
	"include-jsdoc"?: boolean;
	silent?: boolean;
	verbose?: boolean;
	files?: string[]; // Named positional arguments
}
