import { describe, it, expect } from 'vitest';
import { WorkflowBuilder, createWorkflow, createCIWorkflow } from '../src/lib/builders/WorkflowBuilder';
import type { NormalJob } from '../src/generated/github-actions';

describe('WorkflowBuilder', () => {
  describe('Basic workflow creation', () => {
    it('should create a simple workflow with name and trigger', () => {
      const workflow = new WorkflowBuilder()
        .name('Test Workflow')
        .onPush({ branches: ['main'] })
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .name('Checkout')
            .uses('actions/checkout@v4')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect(config.name).toBe('Test Workflow');
      expect(config.on).toEqual({ push: { branches: ['main'] } });
      expect(config.jobs.test).toBeDefined();
      expect((config.jobs.test as NormalJob)['runs-on']).toBe('ubuntu-latest');
    });

    it('should create workflow with multiple triggers', () => {
      const workflow = createWorkflow()
        .name('Multi-trigger Workflow')
        .onPush({ branches: ['main', 'develop'] })
        .onPullRequest({ types: ['opened', 'synchronize'] })
        .onSchedule('0 2 * * *')
        .job('build')
          .runsOn('ubuntu-latest')
          .step()
            .run('echo "Hello World"')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect(config.on).toEqual({
        push: { branches: ['main', 'develop'] },
        pull_request: { types: ['opened', 'synchronize'] },
        schedule: [{ cron: '0 2 * * *' }]
      });
    });

    it('should create workflow with workflow dispatch inputs', () => {
      const workflow = createWorkflow()
        .name('Manual Workflow')
        .onWorkflowDispatch({
          environment: {
            description: 'Environment to deploy to',
            required: true,
            type: 'choice',
            options: ['dev', 'staging', 'prod']
          },
          debug: {
            description: 'Enable debug mode',
            type: 'boolean',
            default: false
          }
        })
        .job('deploy')
          .runsOn('ubuntu-latest')
          .step()
            .run('echo "Deploying to ${{ inputs.environment }}"')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect(config.on).toEqual({
        workflow_dispatch: {
          inputs: {
            environment: {
              description: 'Environment to deploy to',
              required: true,
              type: 'choice',
              options: ['dev', 'staging', 'prod']
            },
            debug: {
              description: 'Enable debug mode',
              type: 'boolean',
              default: false
            }
          }
        }
      });
    });
  });

  describe('Job configuration', () => {
    it('should create job with multiple steps', () => {
      const workflow = createWorkflow()
        .name('Multi-step Job')
        .onPush()
        .job('test')
          .name('Run Tests')
          .runsOn('ubuntu-latest')
          .env({ NODE_ENV: 'test' })
          .step()
            .name('Checkout code')
            .uses('actions/checkout@v4')
          .step()
            .name('Setup Node')
            .uses('actions/setup-node@v4')
            .with({ 'node-version': '18' })
          .step()
            .name('Install dependencies')
            .run('npm ci')
          .step()
            .name('Run tests')
            .run('npm test')
            .env({ CI: 'true' })
          .workflow();

      const config = workflow.build();
      const testJob = config.jobs.test as NormalJob;
      
      expect(testJob.name).toBe('Run Tests');
      expect(testJob['runs-on']).toBe('ubuntu-latest');
      expect(testJob.env).toEqual({ NODE_ENV: 'test' });
      expect(testJob.steps).toHaveLength(4);
      expect(testJob.steps?.[0].name).toBe('Checkout code');
      expect(testJob.steps?.[0].uses).toBe('actions/checkout@v4');
      expect(testJob.steps?.[3].env).toEqual({ CI: 'true' });
    });

    it('should create job with dependencies', () => {
      const workflow = createWorkflow()
        .name('Dependent Jobs')
        .onPush()
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .run('npm test')
            .job()
        .workflow()
        .job('build')
          .needs('test')
          .runsOn('ubuntu-latest')
          .step()
            .run('npm run build')
            .job()
        .workflow()
        .job('deploy')
          .needs(['test', 'build'])
          .runsOn('ubuntu-latest')
          .step()
            .run('npm run deploy')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect((config.jobs.build as NormalJob).needs).toBe('test');
      expect((config.jobs.deploy as NormalJob).needs).toEqual(['test', 'build']);
    });

    it('should create job with matrix strategy', () => {
      const workflow = createWorkflow()
        .name('Matrix Build')
        .onPush()
        .job('test')
          .runsOn('${{ matrix.os }}')
          .strategy({
            matrix: {
              os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
              node: ['16', '18', '20']
            },
            'fail-fast': false,
            'max-parallel': 3
          })
          .step()
            .uses('actions/setup-node@v4')
            .with({ 'node-version': '${{ matrix.node }}' })
          .step()
            .run('npm test')
            .job()
          .workflow();

      const config = workflow.build();
      const testJob = config.jobs.test as NormalJob;
      
      expect(testJob.strategy).toEqual({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          node: ['16', '18', '20']
        },
        'fail-fast': false,
        'max-parallel': 3
      });
    });
  });

  describe('Step configuration', () => {
    it('should create steps with conditional execution', () => {
      const workflow = createWorkflow()
        .name('Conditional Steps')
        .onPush()
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .name('Always run')
            .run('echo "This always runs"')
          .step()
            .name('Only on main')
            .if('github.ref == "refs/heads/main"')
            .run('echo "Only on main branch"')
          .step()
            .name('Only on success')
            .if('success()')
            .run('echo "Previous steps succeeded"')
            .job()
          .workflow();

      const config = workflow.build();
      const steps = (config.jobs.test as NormalJob).steps;
      
      expect(steps?.[0].if).toBeUndefined();
      expect(steps?.[1].if).toBe('github.ref == "refs/heads/main"');
      expect(steps?.[2].if).toBe('success()');
    });

    it('should create steps with timeout and error handling', () => {
      const workflow = createWorkflow()
        .name('Error Handling')
        .onPush()
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .name('Flaky test')
            .run('npm test')
            .continueOnError(true)
            .timeoutMinutes(10)
          .step()
            .name('Cleanup')
            .if('always()')
            .run('rm -rf temp/')
            .job()
          .workflow();

      const config = workflow.build();
      const steps = (config.jobs.test as NormalJob).steps;
      
      expect(steps?.[0]['continue-on-error']).toBe(true);
      expect(steps?.[0]['timeout-minutes']).toBe(10);
      expect(steps?.[1].if).toBe('always()');
    });
  });

  describe('Global configuration', () => {
    it('should set global environment variables and permissions', () => {
      const workflow = createWorkflow()
        .name('Global Config')
        .env({ GLOBAL_VAR: 'value', NODE_ENV: 'production' })
        .permissions({ contents: 'read', deployments: 'write' })
        .concurrency({ 
          group: '${{ github.workflow }}-${{ github.ref }}',
          'cancel-in-progress': true 
        })
        .onPush()
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .run('echo $GLOBAL_VAR')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect(config.env).toEqual({ GLOBAL_VAR: 'value', NODE_ENV: 'production' });
      expect(config.permissions).toEqual({ contents: 'read', deployments: 'write' });
      expect(config.concurrency).toEqual({
        group: '${{ github.workflow }}-${{ github.ref }}',
        'cancel-in-progress': true
      });
    });

    it('should set workflow defaults', () => {
      const workflow = createWorkflow()
        .name('Defaults Config')
        .defaults({
          run: {
            shell: 'bash',
            'working-directory': './src'
          }
        })
        .onPush()
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .run('pwd')
            .job()
          .workflow();

      const config = workflow.build();
      
      expect(config.defaults).toEqual({
        run: {
          shell: 'bash',
          'working-directory': './src'
        }
      });
    });
  });

  describe('YAML generation', () => {
    it('should generate valid YAML', () => {
      const workflow = createWorkflow()
        .name('YAML Test')
        .onPush({ branches: ['main'] })
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .uses('actions/checkout@v4')
            .job()
          .workflow();

      const yaml = workflow.toYaml();
      
      expect(yaml).toContain('name: YAML Test');
      expect(yaml).toContain('on:');
      expect(yaml).toContain('push:');
      expect(yaml).toContain('branches:');
      expect(yaml).toContain('- main');
      expect(yaml).toContain('jobs:');
      expect(yaml).toContain('test:');
      expect(yaml).toContain('runs-on: ubuntu-latest');
      expect(yaml).toContain('steps:');
      expect(yaml).toContain('uses: actions/checkout@v4');
    });
  });

  describe('Factory functions', () => {
    it('should create CI workflow with defaults', () => {
      const workflow = createCIWorkflow('My CI');
      const config = workflow.build();
      
      expect(config.name).toBe('My CI');
      expect(config.on).toEqual({
        push: { branches: ['main'] },
        pull_request: null
      });
      expect(config.jobs.test).toBeDefined();
      expect((config.jobs.test as NormalJob)['runs-on']).toBe('ubuntu-latest');
      expect((config.jobs.test as NormalJob).steps).toHaveLength(4);
    });

    it('should create CI workflow with custom options', () => {
      const workflow = createCIWorkflow('Custom CI', {
        branches: ['main', 'develop'],
        nodeVersion: '20',
        runner: 'windows-latest'
      });
      
      const config = workflow.build();
      
      expect(config.on).toEqual({
        push: { branches: ['main', 'develop'] },
        pull_request: null
      });
      expect((config.jobs.test as NormalJob)['runs-on']).toBe('windows-latest');
      
      const setupNodeStep = (config.jobs.test as NormalJob).steps?.find(step => 
        step.uses?.includes('setup-node')
      );
      expect(setupNodeStep?.with).toEqual({ 'node-version': '20' });
    });
  });

  describe('Error handling', () => {
    it('should throw error if no triggers are defined', () => {
      const workflow = createWorkflow()
        .name('No Triggers')
        .job('test')
          .runsOn('ubuntu-latest')
          .step()
            .run('echo "test"')
            .job()
          .workflow();

      expect(() => workflow.build()).toThrow('Workflow must have at least one trigger');
    });
  });
});
