import type { ReverseOptions, ReverseResult } from "./types";
import { WorkflowParser } from "./workflow-parser";

/**
 * Reverse engineering API - main entry point
 */
export class ReverseApi {
	private parser = new WorkflowParser();

	/**
	 * Reverse engineer a single workflow file
	 */
	async workflow(filePath: string, options?: ReverseOptions): Promise<ReverseResult> {
		return this.parser.reverseWorkflow(filePath, options);
	}

	/**
	 * Reverse engineer an entire .github directory
	 */
	async github(githubPath: string, options?: ReverseOptions): Promise<ReverseResult> {
		return this.parser.reverseGithub(githubPath, options);
	}

	/**
	 * Get summary of reverse engineering results
	 */
	getSummary(result: ReverseResult): string {
		return this.parser.getSummary(result);
	}
}

/**
 * Default instance for easy access
 */
export const reverse = new ReverseApi();
