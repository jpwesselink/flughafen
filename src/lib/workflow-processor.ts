/**
 * Workflow Processor Library
 * 
 * This module contains type definitions and utility functions for workflow processing.
 * All actual workflow and action synthesis is now handled by the synth() method on WorkflowBuilder.
 */

export interface WorkflowProcessorResult {
  workflow: {
    filename: string;
    content: string;
  };
  actions: Record<string, string>; // filename -> content
}

export interface MultiWorkflowProcessorResult {
  workflows: Record<string, string>; // filename -> content
  actions: Record<string, string>;   // filename -> content
}

export interface ProcessorOptions {
  outputDir?: string;
  basePath?: string;     // e.g., '.github' - base path for actions/workflows
  workflowsDir?: string; // e.g., '.github/workflows'
  actionsDir?: string;   // e.g., '.github/actions'
  defaultFilename?: string;
}

/**
 * Convert a filename to kebab-case
 */
export function nameToFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '.yml';
}

/**
 * Update action references in workflow YAML to use the correct base path
 */
export function updateActionReferences(workflowYaml: string, basePath: string): string {
  if (basePath === '') {
    // For empty basePath, keep ./actions/ as is
    return workflowYaml;
  }
  
  // Replace ./actions/ with ./{basePath}/actions/
  return workflowYaml.replace(
    /uses:\s*\.\/actions\//g, 
    `uses: ./${basePath}/actions/`
  );
}

/**
 * Utility: Write all files to filesystem
 */
export async function writeWorkflowFiles(
  result: WorkflowProcessorResult,
  baseDir: string = '.'
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Write workflow file
  const workflowPath = path.join(baseDir, result.workflow.filename);
  await fs.mkdir(path.dirname(workflowPath), { recursive: true });
  await fs.writeFile(workflowPath, result.workflow.content, 'utf8');
  
  // Write action files
  for (const [actionPath, actionContent] of Object.entries(result.actions)) {
    const fullActionPath = path.join(baseDir, actionPath);
    await fs.mkdir(path.dirname(fullActionPath), { recursive: true });
    await fs.writeFile(fullActionPath, actionContent, 'utf8');
  }
}

/**
 * Utility: Write all files from multi-workflow processing to filesystem
 */
export async function writeMultipleWorkflowFiles(
  result: MultiWorkflowProcessorResult,
  baseDir: string = '.'
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Write all workflow files
  for (const [workflowPath, workflowContent] of Object.entries(result.workflows)) {
    const fullWorkflowPath = path.join(baseDir, workflowPath);
    await fs.mkdir(path.dirname(fullWorkflowPath), { recursive: true });
    await fs.writeFile(fullWorkflowPath, workflowContent, 'utf8');
  }
  
  // Write all action files
  for (const [actionPath, actionContent] of Object.entries(result.actions)) {
    const fullActionPath = path.join(baseDir, actionPath);
    await fs.mkdir(path.dirname(fullActionPath), { recursive: true });
    await fs.writeFile(fullActionPath, actionContent, 'utf8');
  }
}
