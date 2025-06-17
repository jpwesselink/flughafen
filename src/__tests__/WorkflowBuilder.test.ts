import { describe, it, expect } from 'vitest';
import { WorkflowBuilder, createWorkflow, createCIWorkflow } from '../lib/builders/WorkflowBuilder';

describe('WorkflowBuilder - Callback API', () => {
  describe('Basic workflow creation', () => {
    it('should create a simple workflow with name and trigger', () => {
      const workflowBuilder = new WorkflowBuilder()
        .name('Test Workflow')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.name('Checkout')
                .uses('actions/checkout@v4');
            });
        });

      const config = workflowBuilder.build({ skipValidation: true });
      
      expect(config.name).toBe('Test Workflow');
      expect(config.on).toEqual({ push: { branches: ['main'] } });
      expect(config.jobs.test).toBeDefined();
      expect((config.jobs.test as any)['runs-on']).toBe('ubuntu-latest');
    });

    it('should create workflow with multiple triggers', () => {
      const workflow = createWorkflow()
        .name('Multi-trigger Workflow')
        .onPush({ branches: ['main', 'develop'] })
        .onPullRequest({ types: ['opened', 'synchronize'] })
        .onSchedule('0 2 * * *')
        .job('build', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('echo "Hello World"');
            });
        });

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
        .job('deploy', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('echo "Deploying to ${{ inputs.environment }}"');
            });
        });

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
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.name('Test Job')
            .runsOn('ubuntu-latest')
            .env({ NODE_ENV: 'test' })
            .step(step => {
              step.name('Checkout')
                .uses('actions/checkout@v4');
            })
            .step(step => {
              step.name('Setup Node')
                .uses('actions/setup-node@v4')
                .with({ 'node-version': '18' });
            })
            .step(step => {
              step.name('Install deps')
                .run('npm ci');
            })
            .step(step => {
              step.name('Run tests')
                .run('npm test')
                .env({ CI: 'true' });
            });
        });

      const config = workflow.build();
      const testJob = config.jobs.test as any;
      
      expect(testJob.name).toBe('Test Job');
      expect(testJob.env).toEqual({ NODE_ENV: 'test' });
      expect(testJob.steps).toHaveLength(4);
      expect(testJob.steps[0].name).toBe('Checkout');
      expect(testJob.steps[3].env).toEqual({ CI: 'true' });
    });

    it('should create job with dependencies', () => {
      const workflow = createWorkflow()
        .name('Job Dependencies')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('npm test');
            });
        })
        .job('build', job => {
          job.runsOn('ubuntu-latest')
            .needs(['test'])
            .step(step => {
              step.run('npm run build');
            });
        })
        .job('deploy', job => {
          job.runsOn('ubuntu-latest')
            .needs(['build'])
            .step(step => {
              step.run('echo "Deploying..."');
            });
        });

      const config = workflow.build();
      
      expect(config.jobs.build.needs).toEqual(['test']);
      expect(config.jobs.deploy.needs).toEqual(['build']);
    });

    it('should create job with matrix strategy', () => {
      const workflow = createWorkflow()
        .name('Matrix Job')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('${{ matrix.os }}')
            .strategy({
              matrix: {
                os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
                'node-version': ['16', '18', '20']
              }
            })
            .step(step => {
              step.uses('actions/checkout@v4');
            })
            .step(step => {
              step.uses('actions/setup-node@v4')
                .with({ 'node-version': '${{ matrix.node-version }}' });
            })
            .step(step => {
              step.run('npm test');
            });
        });

      const config = workflow.build();
      const testJob = config.jobs.test;
      
      expect(testJob.strategy).toEqual({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['16', '18', '20']
        }
      });
    });
  });

  describe('Step configuration', () => {
    it('should create steps with conditional execution', () => {
      const workflow = createWorkflow()
        .name('Conditional Steps')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.name('Always run')
                .run('echo "This always runs"');
            })
            .step(step => {
              step.name('Run on failure')
                .if('failure()')
                .run('echo "Previous steps failed"');
            })
            .step(step => {
              step.name('Run on success')
                .if('success()')
                .run('echo "Previous steps succeeded"');
            });
        });

      const config = workflow.build();
      const steps = (config.jobs.test as any).steps;
      
      expect(steps[1].if).toBe('failure()');
      expect(steps[2].if).toBe('success()');
    });

    it('should create steps with timeout and error handling', () => {
      const workflow = createWorkflow()
        .name('Step Error Handling')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.name('Flaky test')
                .run('npm test')
                .continueOnError(true)
                .timeoutMinutes(10);
            })
            .step(step => {
              step.name('Cleanup')
                .if('always()')
                .run('rm -rf temp/');
            });
        });

      const config = workflow.build();
      const steps = (config.jobs.test as any).steps;
      
      expect(steps[0]['continue-on-error']).toBe(true);
      expect(steps[0]['timeout-minutes']).toBe(10);
      expect(steps[1].if).toBe('always()');
    });
  });

  describe('Global configuration', () => {
    it('should set global environment variables and permissions', () => {
      const workflow = createWorkflow()
        .name('Global Config')
        .env({ GLOBAL_VAR: 'value' })
        .permissions({ contents: 'read', issues: 'write' })
        .concurrency({ group: 'test-group', 'cancel-in-progress': true })
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('echo $GLOBAL_VAR');
            });
        });

      const config = workflow.build();
      
      expect(config.env).toEqual({ GLOBAL_VAR: 'value' });
      expect(config.permissions).toEqual({ contents: 'read', issues: 'write' });
      expect(config.concurrency).toEqual({ 
        group: 'test-group', 
        'cancel-in-progress': true 
      });
    });

    it('should set workflow defaults', () => {
      const workflow = createWorkflow()
        .name('Workflow Defaults')
        .defaults({
          run: {
            shell: 'bash',
            'working-directory': './app'
          }
        })
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('pwd');
            });
        });

      const config = workflow.build();
      
      expect(config.defaults).toEqual({
        run: {
          shell: 'bash',
          'working-directory': './app'
        }
      });
    });
  });

  describe('YAML generation', () => {
    it('should generate valid YAML', () => {
      const workflow = createWorkflow()
        .name('YAML Test')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.uses('actions/checkout@v4');
            });
        });

      const yaml = workflow.toYAML();
      expect(yaml).toContain('name: YAML Test');
      expect(yaml).toContain('runs-on: ubuntu-latest');
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
        pull_request: {}
      });
      expect(config.jobs.test).toBeDefined();
    });

    it('should create CI workflow with custom options', () => {
      const workflow = createCIWorkflow('Custom CI', {
        branches: ['main', 'develop'],
        nodeVersion: '16',
        runner: 'windows-latest'
      });
      const config = workflow.build();
      
      expect(config.on).toEqual({
        push: { branches: ['main', 'develop'] },
        pull_request: {}
      });
      expect((config.jobs.test as any)['runs-on']).toBe('windows-latest');
    });
  });

  describe('Error handling', () => {
    it('should throw error if no triggers are defined', () => {
      const workflow = createWorkflow()
        .name('No Triggers')
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => {
              step.run('echo "test"');
            });
        });

      expect(() => workflow.build()).toThrow('Workflow must have at least one trigger event');
    });
  });

  describe('Callback API benefits', () => {
    it('should enable complex nested configurations', () => {
      const workflow = createWorkflow()
        .name('Complex Workflow')
        .onPush({ branches: ['main'] })
        .job('test', job => {
          job.runsOn('ubuntu-latest')
            .step(step => step.uses('actions/checkout@v4'))
            .step(step => step.run('npm ci'))
            .step(step => step.run('npm test'));
        })
        .job('build', job => {
          job.runsOn('ubuntu-latest')
            .needs(['test'])
            .step(step => step.run('npm run build'))
            .step(step => step.run('npm run package'));
        });

      const config = workflow.build();
      
      expect(Object.keys(config.jobs)).toEqual(['test', 'build']);
      expect((config.jobs.test as any).steps).toHaveLength(3);
      expect((config.jobs.build as any).steps).toHaveLength(2);
      expect(config.jobs.build.needs).toEqual(['test']);
    });
  });
});
