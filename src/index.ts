/**
 * Main exports for the flughafen GitHub Actions workflow builder
 */

export { WorkflowBuilder, createWorkflow, createCIWorkflow } from './lib/builders/WorkflowBuilder';
export { JobBuilder } from './lib/builders/JobBuilder';
export { StepBuilder } from './lib/builders/StepBuilder';
export { TriggerBuilder } from './lib/builders/TriggerBuilder';

// Re-export types
export type * from './types/builder-types';
export type * from './generated/github-actions';
export type * from './types';

// Convenience factory functions
export const workflow = () => new (require('./lib/builders/WorkflowBuilder').WorkflowBuilder)();

// Preset workflows
export const presets = {
  /**
   * Create a Node.js CI workflow
   */
  nodeCI: (name = 'Node.js CI', options: {
    branches?: string[];
    nodeVersions?: string[];
    runners?: string[];
  } = {}) => {
    const { WorkflowBuilder } = require('./lib/builders/WorkflowBuilder');
    const { branches = ['main'], nodeVersions = ['18'], runners = ['ubuntu-latest'] } = options;
    
    const builder = new WorkflowBuilder()
      .name(name)
      .onPush({ branches })
      .onPullRequest();

    // If multiple versions or runners, use matrix strategy
    if (nodeVersions.length > 1 || runners.length > 1) {
      builder
        .job('test')
        .strategy({
          matrix: {
            'node-version': nodeVersions,
            'os': runners
          }
        })
        .runsOn('${{ matrix.os }}')
        .step()
          .checkout()
        .step()
          .setupNode()
          .with({ 'node-version': '${{ matrix.node-version }}' })
        .step()
          .run('npm ci')
        .step()
          .run('npm test');
    } else {
      builder
        .job('test')
        .runsOn(runners[0] as any)
        .step()
          .checkout()
        .step()
          .setupNode()
          .with({ 'node-version': nodeVersions[0] })
        .step()
          .run('npm ci')
        .step()
          .run('npm test');
    }

    return builder;
  },

  /**
   * Create a simple deployment workflow
   */
  deploy: (name = 'Deploy', options: {
    branch?: string;
    environment?: string;
    deployCommand?: string;
  } = {}) => {
    const { WorkflowBuilder } = require('./lib/builders/WorkflowBuilder');
    const { branch = 'main', environment = 'production', deployCommand = './deploy.sh' } = options;
    
    return new WorkflowBuilder()
      .name(name)
      .onPush({ branches: [branch] })
      .job('deploy')
        .runsOn('ubuntu-latest')
        .environment({ name: environment })
        .step()
          .checkout()
        .step()
          .name('Deploy')
          .run(deployCommand);
  }
};

// Default export
export default {
  WorkflowBuilder: require('./lib/builders/WorkflowBuilder').WorkflowBuilder,
  createWorkflow: require('./lib/builders/WorkflowBuilder').createWorkflow,
  createCIWorkflow: require('./lib/builders/WorkflowBuilder').createCIWorkflow,
  workflow,
  presets
};
