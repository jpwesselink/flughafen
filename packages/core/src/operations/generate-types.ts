import { SchemaManager } from "../schema";

/**
 * Options for the generate types operation
 */
export interface GenerateTypesOptions {
	workflowDir?: string;
	output?: string;
	githubToken?: string;
	includeJsdoc?: boolean;
	silent?: boolean;
	verbose?: boolean;
	files?: string[]; // Named positional arguments
}

export interface GenerateTypesResult {
	actionsProcessed: number;
	schemasFetched: number;
	interfacesGenerated: number;
	typesFilePath: string;
	failedActions: string[];
	interfaces: Array<{
		actionName: string;
		interfaceName: string;
	}>;
}

/**
 * Generate TypeScript types from GitHub Actions schemas
 *
 * This is a programmatic API for generating action types. For CLI usage,
 * use the @flughafen/cli package instead.
 */
export async function generateTypes(options: GenerateTypesOptions): Promise<GenerateTypesResult> {
	const { workflowDir, output, githubToken, includeJsdoc: includeJSDoc = true, files = [] } = options;

	const manager = new SchemaManager({
		workflowDir,
		typesFilePath: output,
		githubToken,
		includeJSDoc,
	});

	// If specific files are provided, use them; otherwise scan the directory
	const targetFiles = files.length > 0 ? files : undefined;

	// Generate types from workflow files
	const result = targetFiles
		? await manager.generateTypesFromSpecificFiles(targetFiles)
		: await manager.generateTypesFromWorkflowFiles();

	return result;
}
