import { type ProcessWorkflowOptions, processWorkflowFile, validateWorkflowFile } from "../processing";

export interface SynthOptions {
	file: string;
	dir?: string;
	output?: string;
	silent?: boolean;
	verbose?: boolean;
	dryRun?: boolean;
}

export interface SynthResult {
	workflow: {
		filename: string;
		content: string;
	};
	actions: Record<string, string>; // filename -> content
	summary: {
		totalFiles: number;
		totalSize: number;
	};
	writeResult?: {
		workflowPath: string;
		actionPaths: string[];
	};
}

/**
 * Synthesize TypeScript workflow files to YAML
 * 
 * This is a programmatic API for synthesizing workflows. For CLI usage,
 * use the @flughafen/cli package instead.
 */
export async function synth(options: SynthOptions): Promise<SynthResult> {
	const { file, dir, output, verbose = false, dryRun = false } = options;

	// Validate file first
	const validation = await validateWorkflowFile(file);
	if (!validation.valid) {
		throw new Error(validation.error || "Workflow file validation failed");
	}

	// Pre-load flughafen module for sandbox
	let flughavenModule: any;
	try {
		// Use dynamic import to load our own module
		flughavenModule = await import("../index.js");
	} catch (_error) {
		// Fallback - continue without preloaded module
	}

	// Process the workflow
	const processOptions: ProcessWorkflowOptions = {
		writeFiles: !dryRun,
		verbose,
		writeOptions: {
			verbose,
		},
		synthOptions:
			dir || output
				? {
						basePath: dir || output,
					}
				: {},
		sandboxOptions: {
			additionalGlobals: flughavenModule ? { __preloadedFlughafen: flughavenModule } : {},
		},
	};

	const result = await processWorkflowFile(file, processOptions);

	// Return structured result
	return {
		workflow: result.synthResult.workflow,
		actions: result.synthResult.actions,
		summary: result.summary,
		writeResult: result.writeResult,
	};
}
