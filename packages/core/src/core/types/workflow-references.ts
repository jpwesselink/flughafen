/**
 * Types for workflow references in reusable workflow calls
 */

import type { WorkflowBuilder } from "../builders/WorkflowBuilder";

/**
 * A workflow that can be referenced by other workflows
 */
export interface ReusableWorkflow {
	/**
	 * Get the workflow reference path for use in GitHub Actions
	 */
	getWorkflowPath(): string;

	/**
	 * Get the workflow builder instance (for type checking)
	 */
	getWorkflowBuilder?(): WorkflowBuilder;
}

/**
 * Workflow reference types that can be used in .uses()
 */
export type WorkflowReference =
	| ReusableWorkflow // Type-safe workflow reference
	| string // Direct file path
	| WorkflowPathReference; // Enhanced path reference

/**
 * Enhanced path reference with validation and typing
 */
export interface WorkflowPathReference {
	path: string;
	repository?: string; // For external repo references like "org/repo"
	ref?: string; // For version/branch references like "@v1"
}

/**
 * Configuration for reusable workflow calls
 */
export interface ReusableWorkflowCallConfig {
	uses: WorkflowReference;
	with?: Record<string, string | number | boolean>;
	secrets?: Record<string, string>;
	needs?: string | string[];
	if?: string;
}

/**
 * Helper function to create workflow path references
 */
export function workflowPath(path: string): WorkflowPathReference {
	return { path };
}

/**
 * Helper function to create external repository workflow references
 */
export function externalWorkflow(repository: string, path: string, ref?: string): WorkflowPathReference {
	return {
		path,
		repository,
		ref,
	};
}

/**
 * Convert any workflow reference to a GitHub Actions compatible string
 */
export function resolveWorkflowReference(ref: WorkflowReference): string {
	if (typeof ref === "string") {
		return ref;
	}

	if ("getWorkflowPath" in ref) {
		return ref.getWorkflowPath();
	}

	if ("path" in ref) {
		let resolved = ref.path;
		if (ref.repository) {
			resolved = `${ref.repository}/${resolved}`;
		}
		if (ref.ref) {
			resolved = `${resolved}@${ref.ref}`;
		}
		return resolved;
	}

	throw new Error(`Invalid workflow reference: ${JSON.stringify(ref)}`);
}
