import { dirname } from "node:path";
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
	/** Primary workflow (first in the list, for backwards compat) */
	workflow: {
		filename: string;
		content: string;
	};
	/** All workflows generated from the file */
	workflows?: Array<{
		filename: string;
		content: string;
	}>;
	actions: Record<string, string>; // filename -> content
	summary: {
		totalFiles: number;
		totalSize: number;
	};
	writeResult?: {
		workflowPath: string;
		workflowPaths?: string[];
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
	let flughavenModule: Record<string, unknown> | undefined;
	try {
		// Use dynamic import to load our own module
		flughavenModule = await import("../index.js");
	} catch (_error) {
		// Fallback - continue without preloaded module
	}

	// Determine synth options based on output path
	// If output ends with /workflows, use parent as basePath and set workflowsDir explicitly
	// This prevents double /workflows/workflows paths
	let synthOptions: { basePath?: string; workflowsDir?: string; actionsDir?: string } = {};
	const outputPath = dir || output;

	if (outputPath) {
		if (outputPath.endsWith("/workflows") || outputPath.endsWith("\\workflows")) {
			// Output is the workflows directory itself
			const basePath = dirname(outputPath);
			synthOptions = {
				basePath,
				workflowsDir: outputPath,
				actionsDir: `${basePath}/actions`,
			};
		} else if (outputPath.includes(".github")) {
			// Output is .github or similar - use as basePath
			synthOptions = { basePath: outputPath };
		} else {
			// Generic output - use as basePath
			synthOptions = { basePath: outputPath };
		}
	}

	// Process the workflow
	const processOptions: ProcessWorkflowOptions = {
		writeFiles: !dryRun,
		verbose,
		writeOptions: {
			verbose,
		},
		synthOptions,
		sandboxOptions: {
			additionalGlobals: flughavenModule ? { __preloadedFlughafen: flughavenModule } : {},
		},
	};

	const result = await processWorkflowFile(file, processOptions);

	// Return structured result
	return {
		workflow: result.synthResult.workflow,
		workflows: result.synthResult.workflows,
		actions: result.synthResult.actions,
		summary: result.summary,
		writeResult: result.writeResult,
	};
}
