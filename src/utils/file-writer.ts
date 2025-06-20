/**
 * File writing utilities for workflow synthesis results
 * Handles writing workflow YAML files and local action files to disk
 */

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";

export interface WriteOptions {
	/**
	 * Base directory for writing files
	 * @default process.cwd()
	 */
	baseDir?: string;

	/**
	 * Whether to create directories if they don't exist
	 * @default true
	 */
	createDirectories?: boolean;

	/**
	 * Whether to overwrite existing files
	 * @default true
	 */
	overwrite?: boolean;

	/**
	 * Whether to log file operations
	 * @default false
	 */
	verbose?: boolean;
}

export interface WriteResult {
	/**
	 * Path where the workflow file was written
	 */
	workflowPath: string;

	/**
	 * Paths where action files were written
	 */
	actionPaths: string[];

	/**
	 * Total number of files written
	 */
	filesWritten: number;
}

/**
 * Writes workflow synthesis results to disk
 *
 * @param synthResult - Result from workflow.synth()
 * @param options - Write options
 * @returns Promise resolving to write result summary
 * @throws Error if writing fails
 */
export async function writeWorkflowSynthResult(
	synthResult: {
		workflow: {
			filename: string;
			content: string;
		};
		actions: Record<string, string>;
	},
	options: WriteOptions = {},
): Promise<WriteResult> {
	const {
		baseDir = process.cwd(),
		createDirectories = true,
		overwrite = true,
		verbose = false,
	} = options;

	const result: WriteResult = {
		workflowPath: "",
		actionPaths: [],
		filesWritten: 0,
	};

	try {
		// Write workflow file
		const workflowPath = resolve(baseDir, synthResult.workflow.filename);

		// Check if file exists and overwrite is disabled
		if (!overwrite && existsSync(workflowPath)) {
			throw new Error(`Workflow file already exists: ${workflowPath}`);
		}

		// Create directory if needed
		if (createDirectories) {
			await mkdir(dirname(workflowPath), { recursive: true });
		}

		// Write workflow file
		await writeFile(workflowPath, synthResult.workflow.content, "utf8");
		result.workflowPath = workflowPath;
		result.filesWritten++;

		if (verbose) {
			console.log(`✅ Wrote workflow: ${workflowPath}`);
		}

		// Write action files
		for (const [actionPath, actionContent] of Object.entries(
			synthResult.actions,
		)) {
			const fullActionPath = resolve(baseDir, actionPath);

			// Check if file exists and overwrite is disabled
			if (!overwrite && existsSync(fullActionPath)) {
				throw new Error(`Action file already exists: ${fullActionPath}`);
			}

			// Create directory if needed
			if (createDirectories) {
				await mkdir(dirname(fullActionPath), { recursive: true });
			}

			// Write action file
			await writeFile(fullActionPath, actionContent, "utf8");
			result.actionPaths.push(fullActionPath);
			result.filesWritten++;

			if (verbose) {
				console.log(`✅ Wrote action: ${fullActionPath}`);
			}
		}

		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to write workflow files: ${error.message}`);
		}
		throw new Error(`Failed to write workflow files: ${String(error)}`);
	}
}

/**
 * Writes a single workflow YAML file
 *
 * @param workflowContent - YAML content
 * @param outputPath - Where to write the file
 * @param options - Write options
 * @returns Promise resolving to the written file path
 */
export async function writeWorkflowFile(
	workflowContent: string,
	outputPath: string,
	options: WriteOptions = {},
): Promise<string> {
	const {
		baseDir = process.cwd(),
		createDirectories = true,
		overwrite = true,
	} = options;

	const fullPath = resolve(baseDir, outputPath);

	// Check if file exists and overwrite is disabled
	if (!overwrite && existsSync(fullPath)) {
		throw new Error(`File already exists: ${fullPath}`);
	}

	// Create directory if needed
	if (createDirectories) {
		await mkdir(dirname(fullPath), { recursive: true });
	}

	// Write file
	await writeFile(fullPath, workflowContent, "utf8");

	return fullPath;
}

/**
 * Generates a safe output path from a workflow filename
 *
 * @param baseDir - Base directory
 * @param workflowFilename - Workflow filename from synth result
 * @returns Safe output path
 */
export function generateOutputPath(
	baseDir: string,
	workflowFilename: string,
): string {
	// Remove any path traversal attempts
	const safeName = workflowFilename.replace(/\.\./g, "").replace(/^\/+/, "");
	return join(baseDir, safeName);
}

/**
 * Validates that a directory is safe to write to
 *
 * @param targetDir - Directory to check
 * @param allowedBaseDir - Base directory that writes should be restricted to
 * @returns true if the directory is safe
 */
export function isSafeWriteDirectory(
	targetDir: string,
	allowedBaseDir: string,
): boolean {
	const resolvedTarget = resolve(targetDir);
	const resolvedBase = resolve(allowedBaseDir);

	return resolvedTarget.startsWith(resolvedBase);
}

/**
 * Creates a summary of what will be written
 *
 * @param synthResult - Result from workflow.synth()
 * @param baseDir - Base directory for writing
 * @returns Summary object
 */
export function createWriteSummary(
	synthResult: {
		workflow: {
			filename: string;
			content: string;
		};
		actions: Record<string, string>;
	},
	baseDir: string = process.cwd(),
) {
	const workflowPath = resolve(baseDir, synthResult.workflow.filename);
	const actionPaths = Object.keys(synthResult.actions).map((path) =>
		resolve(baseDir, path),
	);

	return {
		workflowPath,
		actionPaths,
		totalFiles: 1 + actionPaths.length,
		workflowSize: synthResult.workflow.content.length,
		actionSizes: Object.values(synthResult.actions).map(
			(content) => content.length,
		),
		totalSize:
			synthResult.workflow.content.length +
			Object.values(synthResult.actions).reduce(
				(sum, content) => sum + content.length,
				0,
			),
	};
}
