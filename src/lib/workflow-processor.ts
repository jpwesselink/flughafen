/**
 * Workflow Processor Library
 * 
 * Accepts a WorkflowBuilder and extracts all necessary files
 * (workflow YAML + local action YAMLs) with their appropriate filenames
 */

import { WorkflowBuilder } from './builders/WorkflowBuilder';
import { LocalActionBuilder } from './builders/LocalActionBuilder';
import { JobBuilder } from './builders/JobBuilder';
import { StepBuilder } from './builders/StepBuilder';

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
 * Process a WorkflowBuilder and extract all files
 */
export function processWorkflow(
  workflow: WorkflowBuilder, 
  options: ProcessorOptions = {}
): WorkflowProcessorResult {
  const {
    basePath = '.github',
    defaultFilename = 'workflow.yml'
  } = options;
  
  // Construct default paths using basePath
  const workflowsDir = options.workflowsDir || (basePath ? `${basePath}/workflows` : 'workflows');
  const actionsDir = options.actionsDir || (basePath ? `${basePath}/actions` : 'actions');

  // Generate workflow YAML
  let workflowYaml = workflow.toYAML();
  
  // Update action references to use the correct base path
  if (basePath !== '') {
    workflowYaml = updateActionReferences(workflowYaml, basePath);
  }
  
  // Determine workflow filename
  let workflowFilename = workflow.getFilename();
  if (!workflowFilename) {
    // Fallback: use workflow name or default
    const config = workflow.build();
    workflowFilename = config.name 
      ? nameToFilename(config.name)
      : defaultFilename;
  }
  
  // Ensure .yml extension
  if (!workflowFilename.endsWith('.yml') && !workflowFilename.endsWith('.yaml')) {
    workflowFilename += '.yml';
  }

  // Extract local actions
  const localActions = workflow.getLocalActions();
  const actionFiles: Record<string, string> = {};

  for (const action of localActions) {
    const actionYaml = action.toYAML();
    const actionName = action.getName();
    const actionFilename = action.getFilename();
    
    // Determine action file path
    let actionPath: string;
    if (actionFilename) {
      actionPath = `${actionsDir}/${actionFilename}/action.yml`;
    } else if (actionName) {
      actionPath = `${actionsDir}/${actionName}/action.yml`;
    } else {
      throw new Error('Local action must have either a name or filename');
    }
    
    actionFiles[actionPath] = actionYaml;
  }

  return {
    workflow: {
      filename: `${workflowsDir}/${workflowFilename}`,
      content: workflowYaml
    },
    actions: actionFiles
  };
}

/**
 * Process workflow from any module export pattern
 */
export function processWorkflowModule(
  workflowModule: any,
  options: ProcessorOptions = {}
): WorkflowProcessorResult {
  let workflow: any = null;

  // Find workflow in module exports
  if (workflowModule.default && typeof workflowModule.default.toYAML === 'function') {
    workflow = workflowModule.default;
  } else if (workflowModule.workflow && typeof workflowModule.workflow.toYAML === 'function') {
    workflow = workflowModule.workflow;
  } else {
    // Look for any exported WorkflowBuilder
    for (const key of Object.keys(workflowModule)) {
      const exported = workflowModule[key];
      if (exported && typeof exported.toYAML === 'function' && typeof exported.build === 'function') {
        workflow = exported;
        break;
      }
      // Handle function exports
      if (typeof exported === 'function') {
        try {
          const result = exported();
          if (result && typeof result.toYAML === 'function') {
            workflow = result;
            break;
          }
        } catch {
          // Ignore execution errors
        }
      }
    }
  }

  if (!workflow) {
    throw new Error('No WorkflowBuilder found in module exports');
  }

  // If it's a function, call it
  if (typeof workflow === 'function') {
    workflow = workflow();
  }

  return processWorkflow(workflow as WorkflowBuilder, options);
}

/**
 * Process workflow and also scan module for standalone local actions
 */
export function processWorkflowModuleWithStandaloneActions(
  workflowModule: any,
  options: ProcessorOptions = {}
): WorkflowProcessorResult {
  const result = processWorkflowModule(workflowModule, options);
  
  // Scan for standalone LocalActionBuilder exports
  for (const key of Object.keys(workflowModule)) {
    const exported = workflowModule[key];
    
    // Check if it's a standalone LocalActionBuilder
    if (exported && 
        typeof exported.toYAML === 'function' && 
        typeof exported.getReference === 'function' &&
        typeof exported.getName === 'function') {
      
      const actionName = exported.getName();
      const actionFilename = exported.getFilename();
      const actionYaml = exported.toYAML();
      
      // Determine action file path
      const actionsDir = options.actionsDir || '.github/actions';
      let actionPath: string;
      
      if (actionFilename) {
        actionPath = `${actionsDir}/${actionFilename}/action.yml`;
      } else if (actionName) {
        actionPath = `${actionsDir}/${actionName}/action.yml`;
      } else {
        continue; // Skip actions without names
      }
      
      // Add to actions (avoid duplicates)
      if (!result.actions[actionPath]) {
        result.actions[actionPath] = actionYaml;
      }
    }
  }
  
  return result;
}

/**
 * Process multiple WorkflowBuilder instances and extract all workflows and actions
 * Deduplicates actions that are shared across workflows
 */
export function processMultipleWorkflows(
  workflows: WorkflowBuilder[],
  options: ProcessorOptions = {}
): MultiWorkflowProcessorResult {
  const {
    basePath = '.github',
    workflowsDir = options.workflowsDir || (basePath ? `${basePath}/workflows` : 'workflows'),
    actionsDir = options.actionsDir || (basePath ? `${basePath}/actions` : 'actions'),
    defaultFilename = 'workflow.yml'
  } = options;

  const result: MultiWorkflowProcessorResult = {
    workflows: {},
    actions: {}
  };

  const seenActions = new Map<string, LocalActionBuilder>(); // actionName -> LocalActionBuilder

  // Process each workflow
  for (const workflow of workflows) {
    // Generate workflow YAML
    let workflowYaml = workflow.toYAML();
    
    // Update action references to use the correct base path
    if (basePath !== '') {
      workflowYaml = updateActionReferences(workflowYaml, basePath);
    }
    
    // Determine workflow filename
    let workflowFilename = workflow.getFilename();
    if (!workflowFilename) {
      // Fallback: use workflow name or default
      const config = workflow.build();
      workflowFilename = config.name 
        ? nameToFilename(config.name)
        : defaultFilename;
    }
    
    // Ensure .yml extension
    if (!workflowFilename.endsWith('.yml') && !workflowFilename.endsWith('.yaml')) {
      workflowFilename += '.yml';
    }
    
    // Add workflows directory prefix
    const fullWorkflowPath = `${workflowsDir}/${workflowFilename}`;
    
    // Store workflow
    result.workflows[fullWorkflowPath] = workflowYaml;
    
    // Extract local actions from this workflow
    const localActions = workflow.getLocalActions();
    for (const action of localActions) {
      const actionName = action.getName();
      if (!actionName) continue;
      
      // Check if we've already processed this action
      const existingAction = seenActions.get(actionName);
      if (existingAction) {
        // Compare YAML content to ensure they're identical
        const existingYaml = existingAction.toYAML();
        const currentYaml = action.toYAML();
        if (existingYaml !== currentYaml) {
          console.warn(`Warning: Action '${actionName}' has different implementations across workflows. Using the first one encountered.`);
        }
        continue; // Skip duplicate action
      }
      
      // Add new action
      seenActions.set(actionName, action);
      
      const actionYaml = action.toYAML();
      
      // Determine action file path
      const actionFilename = action.getFilename();
      let actionPath: string;
      
      if (actionFilename) {
        actionPath = `${actionsDir}/${actionFilename}/action.yml`;
      } else {
        actionPath = `${actionsDir}/${actionName}/action.yml`;
      }
      
      result.actions[actionPath] = actionYaml;
    }
  }

  return result;
}

/**
 * Convert a filename to kebab-case
 */
function nameToFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '.yml';
}

/**
 * Update action references in workflow YAML to use the correct base path
 */
function updateActionReferences(workflowYaml: string, basePath: string): string {
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

// In-source tests
if (import.meta.vitest) {
  const { it, expect, describe, beforeEach, vi } = import.meta.vitest;
  
  describe('Workflow Processor', () => {
    let testWorkflow: WorkflowBuilder;
    let testLocalAction: LocalActionBuilder;
    let createWorkflow: any;
    let createLocalAction: any;

    beforeEach(async () => {
      // Import functions inside beforeEach to avoid top-level await
      const workflowModule = await import('./builders/WorkflowBuilder');
      const actionModule = await import('./builders/LocalActionBuilder');
      
      createWorkflow = workflowModule.createWorkflow;
      createLocalAction = actionModule.createLocalAction;
      
      // Create real LocalActionBuilder
      testLocalAction = createLocalAction()
        .name('test-action')
        .description('Test action for workflow processor')
        .input('input1', { 
          description: 'Test input',
          required: true,
          default: 'default-value'
        })
        .input('input2', { 
          description: 'Optional input',
          required: false
        })
        .run('echo "Hello from test action"')
        .run('echo "Input1: ${{ inputs.input1 }}"')
        .run('echo "Input2: ${{ inputs.input2 }}"');

      // Create real WorkflowBuilder
      testWorkflow = createWorkflow()
        .name('Test Workflow')
        .filename('test-workflow.yml')
        .onPush({ branches: ['main', 'develop'] })
        .onPullRequest({ types: ['opened', 'synchronize'] })
        .env({ CI: 'true', NODE_ENV: 'test' })
        .job('test', (job: JobBuilder) => job
          .runsOn('ubuntu-latest')
          .step((step: StepBuilder) => step
            .name('Checkout code')
            .uses('actions/checkout@v4')
            .with({ 'fetch-depth': 0 })
          )
          .step((step: StepBuilder) => step
            .name('Use local action')
            .uses(testLocalAction)
            .with({ 
              input1: 'test-value',
              input2: 'another-value'
            })
          )
          .step((step: StepBuilder) => step
            .name('Run tests')
            .run('npm test')
            .env({ FORCE_COLOR: '1' })
          )
        );
    });

    describe('processWorkflow', () => {
      it('should process a real workflow with all features', () => {
        const result = processWorkflow(testWorkflow);

        // Check workflow file
        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('name: Test Workflow');
        expect(result.workflow.content).toContain('runs-on: ubuntu-latest');
        expect(result.workflow.content).toContain('uses: actions/checkout@v4');
        expect(result.workflow.content).toContain('fetch-depth: 0');
        expect(result.workflow.content).toContain('CI: "true"');
        expect(result.workflow.content).toContain('NODE_ENV: test');
        expect(result.workflow.content).toMatchInlineSnapshot(`
          "jobs:
            test:
              runs-on: ubuntu-latest
              steps:
                - name: Checkout code
                  uses: actions/checkout@v4
                  with:
                    fetch-depth: 0
                - name: Use local action
                  uses: ./.github/actions/test-action
                  with:
                    input1: test-value
                    input2: another-value
                - name: Run tests
                  run: npm test
                  env:
                    FORCE_COLOR: "1"
          name: Test Workflow
          on:
            push:
              branches:
                - main
                - develop
            pull_request:
              types:
                - opened
                - synchronize
          env:
            CI: "true"
            NODE_ENV: test
          "
        `);
      });

      it('should extract real local actions with full configuration', () => {
        // Use the local action directly - automatic collection will handle it
        const workflowWithAction = createWorkflow()
          .name('Workflow With Local Action')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use local action')
              .uses(testLocalAction)
              .with({ input1: 'value1' })
            )
          );

        const result = processWorkflow(workflowWithAction);

        expect(Object.keys(result.actions)).toHaveLength(1);
        expect(result.actions).toHaveProperty('.github/actions/test-action/action.yml');
        
        const actionYaml = result.actions['.github/actions/test-action/action.yml'];
        expect(actionYaml).toContain('name: test-action');
        expect(actionYaml).toContain('description: Test action for workflow processor');
        expect(actionYaml).toContain('inputs:');
        expect(actionYaml).toContain('input1:');
        expect(actionYaml).toContain('required: true');
        expect(actionYaml).toContain('default: default-value');
        expect(actionYaml).toContain('input2:');
        expect(actionYaml).toContain('required: false');
        expect(actionYaml).toContain('using: composite');
        expect(actionYaml).toContain('echo "Hello from test action"');
      });

      it('should use custom directories with real workflow', () => {
        const result = processWorkflow(testWorkflow, {
          workflowsDir: 'custom/workflows',
          actionsDir: 'custom/actions'
        });

        expect(result.workflow.filename).toBe('custom/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('name: Test Workflow');
      });

      it('should handle workflow without custom filename', () => {
        const workflowWithoutFilename = createWorkflow()
          .name('Auto Generated Filename')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Test step')
              .run('echo "test"')
            )
          );

        const result = processWorkflow(workflowWithoutFilename);

        expect(result.workflow.filename).toBe('.github/workflows/auto-generated-filename.yml');
        expect(result.workflow.content).toContain('name: Auto Generated Filename');
      });

      it('should handle workflow without name (use default)', () => {
        const workflowWithoutName = createWorkflow()
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Test step')
              .run('echo "test"')
            )
          );

        const result = processWorkflow(workflowWithoutName);

        expect(result.workflow.filename).toBe('.github/workflows/workflow.yml');
      });

      it('should add .yml extension if missing from filename', () => {
        const workflowWithoutExtension = createWorkflow()
          .name('Test Workflow')
          .filename('custom-workflow') // No extension
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.run('echo "test"'))
          );

        const result = processWorkflow(workflowWithoutExtension);

        expect(result.workflow.filename).toBe('.github/workflows/custom-workflow.yml');
      });

      it('should handle local action with custom filename', () => {
        const actionWithCustomFilename = createLocalAction()
          .name('custom-action')
          .filename('my-custom-dir')
          .description('Action with custom directory')
          .run('echo "Custom action"');

        const workflowWithCustomAction = createWorkflow()
          .name('Custom Action Test')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use custom action')
              .uses(actionWithCustomFilename)
            )
          );

        const result = processWorkflow(workflowWithCustomAction);

        expect(result.actions).toHaveProperty('.github/actions/my-custom-dir/action.yml');
        expect(result.actions['.github/actions/my-custom-dir/action.yml']).toContain('name: custom-action');
      });
    });

    describe('processWorkflowModule', () => {
      it('should process real workflow as default export', () => {
        const module = { default: testWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('name: Test Workflow');
        expect(result.workflow.content).toContain('- main');
        expect(result.workflow.content).toContain('- develop');
      });

      it('should process real workflow as named export', () => {
        const module = { workflow: testWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('uses: actions/checkout@v4');
      });

      it('should process workflow function that returns real WorkflowBuilder', () => {
        const createTestWorkflow = () => {
          return createWorkflow()
            .name('Function Created Workflow')
            .onPush({ branches: ['feature/*'] })
            .job('build', (job: JobBuilder) => job
              .runsOn('windows-latest')
              .step((step: StepBuilder) => step
                .name('Build step')
                .run('echo "Building on Windows"')
              )
            );
        };

        const module = { createWorkflow: createTestWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/function-created-workflow.yml');
        expect(result.workflow.content).toContain('name: Function Created Workflow');
        expect(result.workflow.content).toContain('runs-on: windows-latest');
        expect(result.workflow.content).toContain('- feature/*');
      });

      it('should throw error when no valid workflow found', () => {
        const module = { 
          someOtherExport: 'not a workflow',
          anotherThing: { notAWorkflow: true }
        };

        expect(() => processWorkflowModule(module)).toThrow(
          'No WorkflowBuilder found in module exports'
        );
      });
    });

    describe('processWorkflowModuleWithStandaloneActions', () => {
      it('should include real standalone action exports', () => {
        const standaloneAction = createLocalAction()
          .name('standalone-action')
          .description('A standalone action')
          .input('version', { required: true, default: '1.0.0' })
          .run('echo "Standalone action version: ${{ inputs.version }}"');

        const workflowWithLocalActions = createWorkflow()
          .name('Workflow With Multiple Actions')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use standalone action')
              .uses(standaloneAction)
              .with({ version: '2.0.0' })
            )
          );

        // Add local action to workflow

        const module = {
          default: workflowWithLocalActions,
          standaloneAction,
          testLocalAction // This should be detected as duplicate
        };

        const result = processWorkflowModuleWithStandaloneActions(module);

        expect(result.actions).toHaveProperty('.github/actions/test-action/action.yml');
        expect(result.actions).toHaveProperty('.github/actions/standalone-action/action.yml');
        expect(Object.keys(result.actions)).toHaveLength(2);

        const standaloneActionYaml = result.actions['.github/actions/standalone-action/action.yml'];
        expect(standaloneActionYaml).toContain('name: standalone-action');
        expect(standaloneActionYaml).toContain('description: A standalone action');
        expect(standaloneActionYaml).toContain('version:');
        expect(standaloneActionYaml).toContain('default: 1.0.0');
      });

      it('should handle standalone actions with custom directories', () => {
        const customDirAction = createLocalAction()
          .name('custom-dir-action')
          .filename('my-special-action')
          .description('Action in custom directory')
          .run('echo "Custom directory action"');

        const simpleWorkflow = createWorkflow()
          .name('Simple Workflow')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.run('echo "test"'))
          );

        const module = {
          default: simpleWorkflow,
          customAction: customDirAction
        };

        const result = processWorkflowModuleWithStandaloneActions(module, {
          actionsDir: 'my-actions'
        });

        expect(result.actions).toHaveProperty('my-actions/my-special-action/action.yml');
        expect(result.actions['my-actions/my-special-action/action.yml']).toContain('name: custom-dir-action');
      });
    });

    describe('integration tests with real builders', () => {
      it('should handle complex workflow with multiple real actions and features', () => {
        const setupAction = createLocalAction()
          .name('setup-environment')
          .description('Setup development environment')
          .input('node-version', { required: true, default: '18' })
          .input('package-manager', { required: false, default: 'npm' })
          .output('node-path', { description: 'Path to Node.js installation' })
          .run('echo "Setting up Node.js ${{ inputs.node-version }}"')
          .run('echo "node-path=/usr/local/bin/node" >> $GITHUB_OUTPUT');

        const testAction = createLocalAction()
          .name('run-tests')
          .description('Run test suite with coverage')
          .input('coverage-threshold', { required: false, default: '80' })
          .run('npm test -- --coverage')
          .run('echo "Coverage threshold: ${{ inputs.coverage-threshold }}%"');

        const complexWorkflow = createWorkflow()
          .name('Complex CI/CD Pipeline')
          .filename('complex-pipeline.yml')
          .onPush({ 
            branches: ['main', 'develop', 'release/*'],
            paths: ['src/**', 'tests/**', '*.json']
          })
          .onPullRequest({ 
            types: ['opened', 'synchronize', 'reopened'],
            branches: ['main']
          })
          .onWorkflowDispatch({
            environment: {
              description: 'Target environment',
              required: true,
              type: 'choice',
              options: ['staging', 'production']
            }
          })
          .env({
            CI: 'true',
            NODE_ENV: 'test',
            FORCE_COLOR: '1'
          })
          .permissions({
            contents: 'read',
            packages: 'write',
            'pull-requests': 'write'
          })
          .concurrency({
            group: '${{ github.workflow }}-${{ github.ref }}',
            'cancel-in-progress': true
          })
          .job('setup', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .outputs({
              'node-path': '${{ steps.setup-env.outputs.node-path }}'
            })
            .step((step: StepBuilder) => step
              .name('Checkout repository')
              .uses('actions/checkout@v4')
              .with({ 'fetch-depth': 0 })
            )
            .step((step: StepBuilder) => step
              .id('setup-env')
              .name('Setup environment')
              .uses(setupAction)
              .with({
                'node-version': '20',
                'package-manager': 'pnpm'
              })
            )
          )
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .needs('setup')
            .strategy({
              matrix: {
                'node-version': ['18', '20'],
                'os': ['ubuntu-latest', 'windows-latest']
              },
              'fail-fast': false
            })
            .step((step: StepBuilder) => step
              .name('Use setup environment')
              .uses(setupAction)
              .with({
                'node-version': '${{ matrix.node-version }}',
                'package-manager': 'npm'
              })
            )
            .step((step: StepBuilder) => step
              .name('Run comprehensive tests')
              .uses(testAction)
              .with({ 'coverage-threshold': '85' })
            )
          );


        const result = processWorkflow(complexWorkflow, {
          workflowsDir: 'workflows',
          actionsDir: 'actions'
        });

        // Verify workflow
        expect(result.workflow.filename).toBe('workflows/complex-pipeline.yml');
        const workflowContent = result.workflow.content;
        
        expect(workflowContent).toContain('name: Complex CI/CD Pipeline');
        expect(workflowContent).toContain('- main');
        expect(workflowContent).toContain('- develop');
        expect(workflowContent).toContain('- release/*');
        expect(workflowContent).toContain('- opened');
        expect(workflowContent).toContain('- synchronize'); 
        expect(workflowContent).toContain('- reopened');
        expect(workflowContent).toContain('workflow_dispatch:');
        expect(workflowContent).toContain('permissions:');
        expect(workflowContent).toContain('contents: read');
        expect(workflowContent).toContain('concurrency:');
        expect(workflowContent).toContain('cancel-in-progress: true');
        expect(workflowContent).toContain('strategy:');
        expect(workflowContent).toContain('matrix:');
        expect(workflowContent).toContain('fail-fast: false');

        // Verify actions
        expect(Object.keys(result.actions)).toHaveLength(2);
        expect(result.actions).toHaveProperty('actions/setup-environment/action.yml');
        expect(result.actions).toHaveProperty('actions/run-tests/action.yml');

        const setupActionYaml = result.actions['actions/setup-environment/action.yml'];
        expect(setupActionYaml).toContain('name: setup-environment');
        expect(setupActionYaml).toContain('outputs:');
        expect(setupActionYaml).toContain('node-path:');

        const testActionYaml = result.actions['actions/run-tests/action.yml'];
        expect(testActionYaml).toContain('name: run-tests');
        expect(testActionYaml).toContain('coverage-threshold:');
        expect(testActionYaml).toContain("default: '80'");
      });

      it('should work with all builder features and custom options', () => {
        const dockerAction = createLocalAction()
          .name('docker-build')
          .description('Build and push Docker image')
          .input('image-name', { required: true })
          .input('registry', { required: false, default: 'ghcr.io' })
          .input('push', { required: false, default: 'true' })
          .run('docker build -t ${{ inputs.registry }}/${{ inputs.image-name }} .')
          .run('if [ "${{ inputs.push }}" = "true" ]; then docker push ${{ inputs.registry }}/${{ inputs.image-name }}; fi');

        const deployWorkflow = createWorkflow()
          .name('Deploy Application')
          .onPush({ branches: ['production'] })
          .onWorkflowDispatch()
          .env({
            REGISTRY: 'ghcr.io',
            IMAGE_NAME: 'my-app'
          })
          .job('deploy', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .environment({ 
              name: 'production',
              url: 'https://my-app.com'
            })
            .step((step: StepBuilder) => step
              .name('Build and deploy')
              .uses(dockerAction)
              .with({
                'image-name': '${{ env.IMAGE_NAME }}',
                'registry': '${{ env.REGISTRY }}',
                'push': 'true'
              })
            )
          );


        const options = {
          workflowsDir: 'deployment/workflows',
          actionsDir: 'deployment/actions',
          defaultFilename: 'deploy.yml'
        };

        const result = processWorkflow(deployWorkflow, options);

        expect(result.workflow.filename).toBe('deployment/workflows/deploy-application.yml');
        expect(result.actions).toHaveProperty('deployment/actions/docker-build/action.yml');
        
        const workflowContent = result.workflow.content;
        expect(workflowContent).toContain('environment:');
        expect(workflowContent).toContain('name: production');
        expect(workflowContent).toContain('url: https://my-app.com');
        expect(workflowContent).toContain('REGISTRY: ghcr.io');
      });
    });

    describe('basePath option', () => {
      it('should use default basePath (.github) when not specified', () => {
        const result = processWorkflow(testWorkflow);
        
        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('uses: ./.github/actions/test-action');
      });

      it('should use custom basePath and update action references', () => {
        const customWorkflow = createWorkflow()
          .name('Custom Base Path Test')
          .filename('custom-test.yml')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use local action')
              .uses('./actions/test-action')
              .with({ input1: 'test' })
            )
          );

        const result = processWorkflow(customWorkflow, {
          basePath: 'build-tools'
        });

        expect(result.workflow.filename).toBe('build-tools/workflows/custom-test.yml');
        expect(result.workflow.content).toContain('uses: ./build-tools/actions/test-action');
      });

      it('should handle custom basePath with local actions', () => {
        const customAction = createLocalAction()
          .name('custom-base-action')
          .description('Action with custom base path')
          .run('echo "Custom base path action"');

        const workflowWithCustomBase = createWorkflow()
          .name('Custom Base Workflow')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use custom base action')
              .uses(customAction)
            )
          );


        const result = processWorkflow(workflowWithCustomBase, {
          basePath: 'custom-ci'
        });

        expect(result.workflow.filename).toBe('custom-ci/workflows/custom-base-workflow.yml');
        expect(result.workflow.content).toContain('uses: ./custom-ci/actions/custom-base-action');
        expect(result.actions).toHaveProperty('custom-ci/actions/custom-base-action/action.yml');
        expect(result.actions['custom-ci/actions/custom-base-action/action.yml']).toContain('name: custom-base-action');
      });

      it('should handle empty basePath', () => {
        const result = processWorkflow(testWorkflow, {
          basePath: ''
        });

        expect(result.workflow.filename).toBe('workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('uses: ./actions/test-action');
      });

      it('should handle basePath with nested paths', () => {
        const result = processWorkflow(testWorkflow, {
          basePath: 'tools/ci'
        });

        expect(result.workflow.filename).toBe('tools/ci/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('uses: ./tools/ci/actions/test-action');
      });
    });

    describe('processWorkflowModule', () => {
      it('should process real workflow as default export', () => {
        const module = { default: testWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('name: Test Workflow');
        expect(result.workflow.content).toContain('- main');
        expect(result.workflow.content).toContain('- develop');
      });

      it('should process real workflow as named export', () => {
        const module = { workflow: testWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/test-workflow.yml');
        expect(result.workflow.content).toContain('uses: actions/checkout@v4');
      });

      it('should process workflow function that returns real WorkflowBuilder', () => {
        const createTestWorkflow = () => {
          return createWorkflow()
            .name('Function Created Workflow')
            .onPush({ branches: ['feature/*'] })
            .job('build', (job: JobBuilder) => job
              .runsOn('windows-latest')
              .step((step: StepBuilder) => step
                .name('Build step')
                .run('echo "Building on Windows"')
              )
            );
        };

        const module = { createWorkflow: createTestWorkflow };
        const result = processWorkflowModule(module);

        expect(result.workflow.filename).toBe('.github/workflows/function-created-workflow.yml');
        expect(result.workflow.content).toContain('name: Function Created Workflow');
        expect(result.workflow.content).toContain('runs-on: windows-latest');
        expect(result.workflow.content).toContain('- feature/*');
      });

      it('should throw error when no valid workflow found', () => {
        const module = { 
          someOtherExport: 'not a workflow',
          anotherThing: { notAWorkflow: true }
        };

        expect(() => processWorkflowModule(module)).toThrow(
          'No WorkflowBuilder found in module exports'
        );
      });
    });

    describe('processWorkflowModuleWithStandaloneActions', () => {
      it('should include real standalone action exports', () => {
        const standaloneAction = createLocalAction()
          .name('standalone-action')
          .description('A standalone action')
          .input('version', { required: true, default: '1.0.0' })
          .run('echo "Standalone action version: ${{ inputs.version }}"');

        const workflowWithLocalActions = createWorkflow()
          .name('Workflow With Multiple Actions')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use standalone action')
              .uses(standaloneAction)
              .with({ version: '2.0.0' })
            )
          );

        // Add local action to workflow

        const module = {
          default: workflowWithLocalActions,
          standaloneAction,
          testLocalAction // This should be detected as duplicate
        };

        const result = processWorkflowModuleWithStandaloneActions(module);

        expect(result.actions).toHaveProperty('.github/actions/test-action/action.yml');
        expect(result.actions).toHaveProperty('.github/actions/standalone-action/action.yml');
        expect(Object.keys(result.actions)).toHaveLength(2);

        const standaloneActionYaml = result.actions['.github/actions/standalone-action/action.yml'];
        expect(standaloneActionYaml).toContain('name: standalone-action');
        expect(standaloneActionYaml).toContain('description: A standalone action');
        expect(standaloneActionYaml).toContain('version:');
        expect(standaloneActionYaml).toContain('default: 1.0.0');
      });

      it('should handle standalone actions with custom directories', () => {
        const customDirAction = createLocalAction()
          .name('custom-dir-action')
          .filename('my-special-action')
          .description('Action in custom directory')
          .run('echo "Custom directory action"');

        const simpleWorkflow = createWorkflow()
          .name('Simple Workflow')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.run('echo "test"'))
          );

        const module = {
          default: simpleWorkflow,
          customAction: customDirAction
        };

        const result = processWorkflowModuleWithStandaloneActions(module, {
          actionsDir: 'my-actions'
        });

        expect(result.actions).toHaveProperty('my-actions/my-special-action/action.yml');
        expect(result.actions['my-actions/my-special-action/action.yml']).toContain('name: custom-dir-action');
      });
    });

    describe('integration tests with real builders', () => {
      it('should handle complex workflow with multiple real actions and features', () => {
        const setupAction = createLocalAction()
          .name('setup-environment')
          .description('Setup development environment')
          .input('node-version', { required: true, default: '18' })
          .input('package-manager', { required: false, default: 'npm' })
          .output('node-path', { description: 'Path to Node.js installation' })
          .run('echo "Setting up Node.js ${{ inputs.node-version }}"')
          .run('echo "node-path=/usr/local/bin/node" >> $GITHUB_OUTPUT');

        const testAction = createLocalAction()
          .name('run-tests')
          .description('Run test suite with coverage')
          .input('coverage-threshold', { required: false, default: '80' })
          .run('npm test -- --coverage')
          .run('echo "Coverage threshold: ${{ inputs.coverage-threshold }}%"');

        const complexWorkflow = createWorkflow()
          .name('Complex CI/CD Pipeline')
          .filename('complex-pipeline.yml')
          .onPush({ 
            branches: ['main', 'develop', 'release/*'],
            paths: ['src/**', 'tests/**', '*.json']
          })
          .onPullRequest({ 
            types: ['opened', 'synchronize', 'reopened'],
            branches: ['main']
          })
          .onWorkflowDispatch({
            environment: {
              description: 'Target environment',
              required: true,
              type: 'choice',
              options: ['staging', 'production']
            }
          })
          .env({
            CI: 'true',
            NODE_ENV: 'test',
            FORCE_COLOR: '1'
          })
          .permissions({
            contents: 'read',
            packages: 'write',
            'pull-requests': 'write'
          })
          .concurrency({
            group: '${{ github.workflow }}-${{ github.ref }}',
            'cancel-in-progress': true
          })
          .job('setup', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .outputs({
              'node-path': '${{ steps.setup-env.outputs.node-path }}'
            })
            .step((step: StepBuilder) => step
              .name('Checkout repository')
              .uses('actions/checkout@v4')
              .with({ 'fetch-depth': 0 })
            )
            .step((step: StepBuilder) => step
              .id('setup-env')
              .name('Setup environment')
              .uses(setupAction)
              .with({
                'node-version': '20',
                'package-manager': 'pnpm'
              })
            )
          )
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .needs('setup')
            .strategy({
              matrix: {
                'node-version': ['18', '20'],
                'os': ['ubuntu-latest', 'windows-latest']
              },
              'fail-fast': false
            })
            .step((step: StepBuilder) => step
              .name('Use setup environment')
              .uses(setupAction)
              .with({
                'node-version': '${{ matrix.node-version }}',
                'package-manager': 'npm'
              })
            )
            .step((step: StepBuilder) => step
              .name('Run comprehensive tests')
              .uses(testAction)
              .with({ 'coverage-threshold': '85' })
            )
          );


        const result = processWorkflow(complexWorkflow, {
          workflowsDir: 'workflows',
          actionsDir: 'actions'
        });

        // Verify workflow
        expect(result.workflow.filename).toBe('workflows/complex-pipeline.yml');
        const workflowContent = result.workflow.content;
        
        expect(workflowContent).toContain('name: Complex CI/CD Pipeline');
        expect(workflowContent).toContain('- main');
        expect(workflowContent).toContain('- develop');
        expect(workflowContent).toContain('- release/*');
        expect(workflowContent).toContain('- opened');
        expect(workflowContent).toContain('- synchronize'); 
        expect(workflowContent).toContain('- reopened');
        expect(workflowContent).toContain('workflow_dispatch:');
        expect(workflowContent).toContain('permissions:');
        expect(workflowContent).toContain('contents: read');
        expect(workflowContent).toContain('concurrency:');
        expect(workflowContent).toContain('cancel-in-progress: true');
        expect(workflowContent).toContain('strategy:');
        expect(workflowContent).toContain('matrix:');
        expect(workflowContent).toContain('fail-fast: false');

        // Verify actions
        expect(Object.keys(result.actions)).toHaveLength(2);
        expect(result.actions).toHaveProperty('actions/setup-environment/action.yml');
        expect(result.actions).toHaveProperty('actions/run-tests/action.yml');

        const setupActionYaml = result.actions['actions/setup-environment/action.yml'];
        expect(setupActionYaml).toContain('name: setup-environment');
        expect(setupActionYaml).toContain('outputs:');
        expect(setupActionYaml).toContain('node-path:');

        const testActionYaml = result.actions['actions/run-tests/action.yml'];
        expect(testActionYaml).toContain('name: run-tests');
        expect(testActionYaml).toContain('coverage-threshold:');
        expect(testActionYaml).toContain("default: '80'");
      });

      it('should work with all builder features and custom options', () => {
        const dockerAction = createLocalAction()
          .name('docker-build')
          .description('Build and push Docker image')
          .input('image-name', { required: true })
          .input('registry', { required: false, default: 'ghcr.io' })
          .input('push', { required: false, default: 'true' })
          .run('docker build -t ${{ inputs.registry }}/${{ inputs.image-name }} .')
          .run('if [ "${{ inputs.push }}" = "true" ]; then docker push ${{ inputs.registry }}/${{ inputs.image-name }}; fi');

        const deployWorkflow = createWorkflow()
          .name('Deploy Application')
          .onPush({ branches: ['production'] })
          .onWorkflowDispatch()
          .env({
            REGISTRY: 'ghcr.io',
            IMAGE_NAME: 'my-app'
          })
          .job('deploy', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .environment({ 
              name: 'production',
              url: 'https://my-app.com'
            })
            .step((step: StepBuilder) => step
              .name('Build and deploy')
              .uses(dockerAction)
              .with({
                'image-name': '${{ env.IMAGE_NAME }}',
                'registry': '${{ env.REGISTRY }}',
                'push': 'true'
              })
            )
          );


        const options = {
          workflowsDir: 'deployment/workflows',
          actionsDir: 'deployment/actions',
          defaultFilename: 'deploy.yml'
        };

        const result = processWorkflow(deployWorkflow, options);

        expect(result.workflow.filename).toBe('deployment/workflows/deploy-application.yml');
        expect(result.actions).toHaveProperty('deployment/actions/docker-build/action.yml');
        
        const workflowContent = result.workflow.content;
        expect(workflowContent).toContain('environment:');
        expect(workflowContent).toContain('name: production');
        expect(workflowContent).toContain('url: https://my-app.com');
        expect(workflowContent).toContain('REGISTRY: ghcr.io');
      });
    });

    describe('processMultipleWorkflows', () => {
      it('should process multiple workflows and deduplicate actions', () => {
        const sharedAction = createLocalAction()
          .name('shared-action')
          .description('An action shared across workflows')
          .input('message', { required: true, default: 'Hello' })
          .run('echo "${{ inputs.message }}"');

        const workflow1 = createWorkflow()
          .name('Workflow One')
          .filename('workflow-1.yml')
          .onPush({ branches: ['main'] })
          .job('test1', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Use shared action')
              .uses(sharedAction)
              .with({ message: 'From workflow 1' })
            )
          );

        const workflow2 = createWorkflow()
          .name('Workflow Two')
          .filename('workflow-2.yml')
          .onPullRequest()
          .job('test2', (job: JobBuilder) => job
            .runsOn('windows-latest')
            .step((step: StepBuilder) => step
              .name('Use shared action')
              .uses(sharedAction)
              .with({ message: 'From workflow 2' })
            )
          );

        // Add the shared action to both workflows

        const result = processMultipleWorkflows([workflow1, workflow2]);

        // Should have 2 workflows
        expect(Object.keys(result.workflows)).toHaveLength(2);
        expect(result.workflows).toHaveProperty('.github/workflows/workflow-1.yml');
        expect(result.workflows).toHaveProperty('.github/workflows/workflow-2.yml');

        // Should have only 1 action (deduplicated)
        expect(Object.keys(result.actions)).toHaveLength(1);
        expect(result.actions).toHaveProperty('.github/actions/shared-action/action.yml');

        // Verify workflow contents
        expect(result.workflows['.github/workflows/workflow-1.yml']).toContain('name: Workflow One');
        expect(result.workflows['.github/workflows/workflow-1.yml']).toContain('runs-on: ubuntu-latest');
        expect(result.workflows['.github/workflows/workflow-2.yml']).toContain('name: Workflow Two');
        expect(result.workflows['.github/workflows/workflow-2.yml']).toContain('runs-on: windows-latest');

        // Verify action content
        const actionYaml = result.actions['.github/actions/shared-action/action.yml'];
        expect(actionYaml).toContain('name: shared-action');
        expect(actionYaml).toContain('description: An action shared across workflows');
      });

      it('should handle workflows with different actions', () => {
        const action1 = createLocalAction()
          .name('action-one')
          .description('First action')
          .run('echo "Action 1"');

        const action2 = createLocalAction()
          .name('action-two')
          .description('Second action')
          .run('echo "Action 2"');

        const workflow1 = createWorkflow()
          .name('First Workflow')
          .onPush({ branches: ['main'] })
          .job('job1', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.uses(action1))
          );

        const workflow2 = createWorkflow()
          .name('Second Workflow')
          .onPush({ branches: ['develop'] })
          .job('job2', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.uses(action2))
          );


        const result = processMultipleWorkflows([workflow1, workflow2]);

        expect(Object.keys(result.workflows)).toHaveLength(2);
        expect(Object.keys(result.actions)).toHaveLength(2);
        expect(result.actions).toHaveProperty('.github/actions/action-one/action.yml');
        expect(result.actions).toHaveProperty('.github/actions/action-two/action.yml');
      });

      it('should use custom basePath and options', () => {
        const action = createLocalAction()
          .name('custom-action')
          .description('Action with custom base path')
          .run('echo "Custom base path"');

        const workflow = createWorkflow()
          .name('Custom Base Workflow')
          .filename('custom.yml')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.uses(action))
          );


        const result = processMultipleWorkflows([workflow], {
          basePath: 'ci-cd',
          workflowsDir: 'custom-workflows',
          actionsDir: 'custom-actions'
        });

        expect(result.workflows).toHaveProperty('custom-workflows/custom.yml');
        expect(result.actions).toHaveProperty('custom-actions/custom-action/action.yml');
        expect(result.workflows['custom-workflows/custom.yml']).toContain('uses: ./ci-cd/actions/custom-action');
      });

      it('should handle empty workflow list', () => {
        const result = processMultipleWorkflows([]);
        
        expect(Object.keys(result.workflows)).toHaveLength(0);
        expect(Object.keys(result.actions)).toHaveLength(0);
      });

      it('should handle workflows without local actions', () => {
        const workflow1 = createWorkflow()
          .name('Simple Workflow 1')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Checkout')
              .uses('actions/checkout@v4')
            )
          );

        const workflow2 = createWorkflow()
          .name('Simple Workflow 2')
          .onPullRequest()
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step
              .name('Setup Node')
              .uses('actions/setup-node@v4')
            )
          );

        const result = processMultipleWorkflows([workflow1, workflow2]);

        expect(Object.keys(result.workflows)).toHaveLength(2);
        expect(Object.keys(result.actions)).toHaveLength(0);
      });

      it('should warn about conflicting action implementations', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const action1 = createLocalAction()
          .name('same-name')
          .description('First implementation')
          .run('echo "Implementation 1"');

        const action2 = createLocalAction()
          .name('same-name')
          .description('Second implementation')
          .run('echo "Implementation 2"');

        const workflow1 = createWorkflow()
          .name('Workflow 1')
          .onPush({ branches: ['main'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.uses(action1))
          );

        const workflow2 = createWorkflow()
          .name('Workflow 2')
          .onPush({ branches: ['develop'] })
          .job('test', (job: JobBuilder) => job
            .runsOn('ubuntu-latest')
            .step((step: StepBuilder) => step.uses(action2))
          );


        const result = processMultipleWorkflows([workflow1, workflow2]);

        // Should only have one action (first one wins)
        expect(Object.keys(result.actions)).toHaveLength(1);
        expect(result.actions['.github/actions/same-name/action.yml']).toContain('First implementation');
        
        // Should have warned about conflict
        expect(consoleSpy).toHaveBeenCalledWith(
          "Warning: Action 'same-name' has different implementations across workflows. Using the first one encountered."
        );

        consoleSpy.mockRestore();
      });
    });
  });
}
