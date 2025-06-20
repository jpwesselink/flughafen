import { 
  JobConfig,
  PermissionsConfig
} from '../../types/builder-types';
import { StepBuilder } from './StepBuilder';
import { LocalActionBuilder } from './LocalActionBuilder';
import { Builder, buildValue } from "./Builder";

/**
 * Job builder that prevents context switching
 */
export class JobBuilder implements Builder<JobConfig> {
  private config: Partial<JobConfig> = {};
  private stepsArray: any[] = [];
  private stepBuilders: StepBuilder[] = []; // Keep track of StepBuilder instances

  /**
   * Set the runner for this job
   */
  runsOn(runner: string): JobBuilder {
    this.config['runs-on'] = runner;
    return this;
  }

  /**
   * Add a step using a function
   */
  step(callback: (step: StepBuilder) => StepBuilder): JobBuilder {
    const stepBuilder = new StepBuilder();
    const finalStep = callback(stepBuilder);
    
    // Build the step configuration and store it
    const builtStep = buildValue(finalStep);
    this.stepsArray.push(builtStep);
    
    // Store the StepBuilder for local action collection
    this.stepBuilders.push(finalStep);
    
    return this;
  }

  /**
   * Set job environment variables
   */
  env(variables: Record<string, string | number | boolean>): JobBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set job permissions
   */
  permissions(permissions: PermissionsConfig): JobBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Set job strategy (matrix, etc.)
   */
  strategy(strategy: any): JobBuilder {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Set job timeout
   */
  timeoutMinutes(minutes: number): JobBuilder {
    this.config['timeout-minutes'] = minutes;
    return this;
  }

  /**
   * Set job needs (dependencies)
   */
  needs(needs: string | string[]): JobBuilder {
    // Ensure array has at least one element to match JobNeeds type
    if (Array.isArray(needs) && needs.length === 0) {
      throw new Error('Job needs array must contain at least one job name');
    }
    this.config.needs = needs as any; // Cast to satisfy type checker
    return this;
  }

  /**
   * Set job condition
   */
  if(condition: string): JobBuilder {
    this.config.if = condition;
    return this;
  }

  /**
   * Set job outputs
   */
  outputs(outputs: Record<string, string>): JobBuilder {
    this.config.outputs = outputs;
    return this;
  }

  /**
   * Set job environment
   */
  environment(environment: { name: string; url?: string }): JobBuilder {
    this.config.environment = environment;
    return this;
  }

  /**
   * Get all LocalActionBuilder instances used by this job's steps
   */
  getLocalActions(): LocalActionBuilder[] {
    const localActions: LocalActionBuilder[] = [];
    
    for (const stepBuilder of this.stepBuilders) {
      const stepLocalActions = stepBuilder.getLocalActions();
      localActions.push(...stepLocalActions);
    }
    
    // Deduplicate using Set and return as array
    return Array.from(new Set(localActions));
  }

  /**
   * Build the job configuration
   */
  build(): JobConfig {
    return {
      ...this.config,
      steps: this.stepsArray
    } as JobConfig;
  }
}

/**
 * Factory function to create a new job builder
 */
export function createJob(): JobBuilder {
  return new JobBuilder();
}

// In-source tests
if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('JobBuilder', () => {
    it('should create a basic job configuration', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest');
      
      const config = job.build();
      expect(config['runs-on']).toBe('ubuntu-latest');
      expect(config.steps).toEqual([]);
    });

    it('should add environment variables', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .env({ NODE_ENV: 'test', CI: true });
      
      const config = job.build();
      expect(config.env).toEqual({ NODE_ENV: 'test', CI: true });
    });

    it('should set job permissions', () => {
      const permissions = { contents: 'read' as const, packages: 'write' as const };
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .permissions(permissions);
      
      const config = job.build();
      expect(config.permissions).toEqual(permissions);
    });

    it('should set timeout minutes', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .timeoutMinutes(30);
      
      const config = job.build();
      expect(config['timeout-minutes']).toBe(30);
    });

    it('should set job needs', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .needs('build');
      
      const config = job.build();
      expect(config.needs).toBe('build');
    });

    it('should set job condition', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .if('github.ref == "refs/heads/main"');
      
      const config = job.build();
      expect(config.if).toBe('github.ref == "refs/heads/main"');
    });

    it('should add steps using callback', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .step(step => step.name('Test').run('npm test'));
      
      const config = job.build();
      expect(config.steps).toHaveLength(1);
      expect(config.steps?.[0]).toEqual({
        name: 'Test',
        run: 'npm test'
      });
    });

    it('should chain multiple methods', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .env({ NODE_ENV: 'test' })
        .timeoutMinutes(15)
        .step(step => step.name('Checkout').run('git checkout'))
        .step(step => step.name('Test').run('npm test'));
      
      const config = job.build();
      expect(config['runs-on']).toBe('ubuntu-latest');
      expect(config.env).toEqual({ NODE_ENV: 'test' });
      expect(config['timeout-minutes']).toBe(15);
      expect(config.steps).toHaveLength(2);
    });
  });

  describe('createJob factory', () => {
    it('should create a new JobBuilder instance', () => {
      const job = createJob();
      expect(job).toBeInstanceOf(JobBuilder);
    });

    it('should create independent instances', () => {
      const job1 = createJob().runsOn('ubuntu-latest');
      const job2 = createJob().runsOn('windows-latest');
      
      const config1 = job1.build();
      const config2 = job2.build();
      
      expect(config1['runs-on']).toBe('ubuntu-latest');
      expect(config2['runs-on']).toBe('windows-latest');
    });

    it('should collect LocalActionBuilder instances from steps', () => {
      const action1 = new LocalActionBuilder()
        .name('test-action-1')
        .description('First test action')
        .run('echo "Action 1"');

      const action2 = new LocalActionBuilder()
        .name('test-action-2')
        .description('Second test action')
        .run('echo "Action 2"');

      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .step(step => step
          .name('Step 1')
          .uses(action1, uses => uses)
        )
        .step(step => step
          .name('Step 2')
          .uses('actions/checkout@v4', action => action) // String action - should not be collected
        )
        .step(step => step
          .name('Step 3')
          .uses(action2, uses => uses)
        )
        .step(step => step
          .name('Step 4')
          .uses(action1, uses => uses) // Reuse action1 - should be deduplicated
        );

      const localActions = job.getLocalActions();
      
      expect(localActions).toHaveLength(2); // Should be deduplicated
      expect(localActions).toContain(action1);
      expect(localActions).toContain(action2);
    });

    it('should return empty array when no local actions are used', () => {
      const job = new JobBuilder()
        .runsOn('ubuntu-latest')
        .step(step => step
          .name('Checkout')
          .uses('actions/checkout@v4', action => action)
        )
        .step(step => step
          .name('Setup Node')
          .uses('actions/setup-node@v4', action => action)
        );

      const localActions = job.getLocalActions();
      expect(localActions).toHaveLength(0);
    });
  });
}
