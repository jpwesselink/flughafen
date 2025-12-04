import type { ExpressionComponents } from "./parser";

// Types
export interface WorkflowContext {
	eventType: string;
	availableJobs: string[];
	currentJob?: string;
	environment?: string;
}

export interface EnhancedWorkflowContext extends WorkflowContext {
	availableSteps: string[];
	matrixStrategy?: Record<string, unknown>;
	permissions?: Record<string, string>;
}

export interface ExpressionValidationResult {
	valid: boolean;
	errors: string[];
	suggestions: string[];
	components?: ExpressionComponents;
}

export interface EnhancedExpressionValidationResult extends ExpressionValidationResult {
	workflowSpecific: WorkflowSpecificChecks;
}

export interface WorkflowSpecificChecks {
	suggestions: string[];
	optimizations: string[];
	securityIssues: string[];
}
