import { 
  WorkflowConfig, 
  PermissionsConfig, 
  DefaultsConfig,
  PushConfig,
  PullRequestConfig,
  WorkflowInputs,
  ValidationResult,
  ConcurrencyConfig
} from '../../types/builder-types';
import { stringify } from 'yaml';
import Ajv from 'ajv';
import { toKebabCase } from '../../utils/toKebabCase';
import { JobBuilder } from './JobBuilder';
import { Builder, buildValue } from './Builder';


/**
 * Workflow builder that prevents context switching
 */
export class WorkflowBuilder implements Builder<WorkflowConfig> {
  private config: Partial<WorkflowConfig> = {
    jobs: {}
  };

  /**
   * Set the workflow name
   */
  name(name: string): WorkflowBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set the workflow run name
   */
  runName(runName: string): WorkflowBuilder {
    this.config['run-name'] = runName;
    return this;
  }

  /**
   * Add push trigger
   */
  onPush(config?: PushConfig): WorkflowBuilder {
    this.addToOnConfig('push', config || {});
    return this;
  }

  /**
   * Add pull request trigger
   */
  onPullRequest(config?: PullRequestConfig): WorkflowBuilder {
    this.addToOnConfig('pull_request', config || {});
    return this;
  }

  /**
   * Add schedule trigger
   */
  onSchedule(cron: string | string[]): WorkflowBuilder {
    const schedules = Array.isArray(cron) ? cron.map(c => ({ cron: c })) : [{ cron }];
    this.addToOnConfig('schedule', schedules);
    return this;
  }

  /**
   * Add workflow dispatch trigger
   */
  onWorkflowDispatch(inputs?: WorkflowInputs): WorkflowBuilder {
    this.addToOnConfig('workflow_dispatch', inputs ? { inputs } : {});
    return this;
  }

  /**
   * Add a job using a pre-built JobBuilder (direct form)
   */
  job(id: string, job: JobBuilder): WorkflowBuilder;
  /**
   * Add a job using a function (callback form)
   */
  job(id: string, callback: (job: JobBuilder) => JobBuilder): WorkflowBuilder;
  job(id: string, jobOrCallback: JobBuilder | ((job: JobBuilder) => JobBuilder)): WorkflowBuilder {
    if (!this.config.jobs) {
      this.config.jobs = {};
    }

    let finalJob: JobBuilder;
    
    if (typeof jobOrCallback === 'function') {
      // Callback form - create new JobBuilder and pass to callback
      const jobBuilder = new JobBuilder();
      finalJob = jobOrCallback(jobBuilder);
    } else {
      // Direct form - use the provided JobBuilder
      finalJob = jobOrCallback;
    }
    
    this.config.jobs[toKebabCase(id)] = buildValue(finalJob);
    return this;
  }

  /**
   * Set workflow permissions
   */
  permissions(permissions: PermissionsConfig): WorkflowBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Set workflow environment variables
   */
  env(variables: Record<string, string | number | boolean>): WorkflowBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set workflow concurrency
   */
  concurrency(concurrency: ConcurrencyConfig): WorkflowBuilder {
    this.config.concurrency = concurrency;
    return this;
  }

  /**
   * Set workflow defaults
   */
  defaults(defaults: DefaultsConfig): WorkflowBuilder {
    this.config.defaults = defaults;
    return this;
  }

  /**
   * Helper method to add events to the 'on' configuration
   */
  private addToOnConfig(event: string, config: any): void {
    if (!this.config.on) {
      this.config.on = {};
    }
    
    if (Array.isArray(this.config.on)) {
      // Convert array to object if needed
      const events = this.config.on;
      this.config.on = {};
      for (const evt of events) {
        if (typeof evt === 'string') {
          (this.config.on as Record<string, any>)[evt] = {};
        }
      }
    }
    
    (this.config.on as Record<string, any>)[event] = config;
  }

  /**
   * Validate the workflow configuration
   */
  validate(): ValidationResult {
    try {
      const schema = require('../../lib/schema.json');
      const ajv = new Ajv({ 
        allErrors: true,
        strictRequired: false,
        strictTypes: false,
        strictTuples: false,
        allowUnionTypes: true
      });
      const validate = ajv.compile(schema);
      const valid = validate(this.config);
      
      if (!valid) {
        return {
          valid: false,
          errors: validate.errors?.map(err => 
            `${err.instancePath || 'root'}: ${err.message}`
          ) || ['Unknown validation error']
        };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Convert to YAML with optional validation
   */
  toYAML(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    const { validate = true, throwOnError = true } = options;
    
    if (validate) {
      const result = this.validate();
      if (!result.valid) {
        const message = `Workflow validation failed:\n${result.errors?.join('\n')}`;
        if (throwOnError) {
          throw new Error(message);
        } else {
          console.warn(message);
        }
      }
    }
    
    return stringify(this.config);
  }

  /**
   * Alias for toYAML
   */
  toYaml(options?: { validate?: boolean; throwOnError?: boolean }): string {
    return this.toYAML(options);
  }

  /**
   * Build the workflow configuration
   */
  build(): WorkflowConfig {
    return this.config as WorkflowConfig;
  }
}



/**
 * Create a new workflow builder
 */
export function createWorkflow(): WorkflowBuilder {
  return new WorkflowBuilder();
}

// In-source tests
if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('WorkflowBuilder', () => {
    it('should create a basic workflow', () => {
      const workflow = new WorkflowBuilder()
        .name('Test Workflow')
        .onPush({ branches: ['main'] });
      
      const config = workflow.build();
      expect(config.name).toBe('Test Workflow');
      expect(config.on).toEqual({ push: { branches: ['main'] } });
      expect(config.jobs).toEqual({});
    });

    it('should add jobs using callback form', () => {
      const workflow = new WorkflowBuilder()
        .name('Job Test')
        .job('test', (job: JobBuilder) => job.runsOn('ubuntu-latest')
          .step((step: any) => step.name('Test').run('npm test'))
        );
      
      const config = workflow.build();
      expect(config.jobs?.test).toBeDefined();
      const testJob = config.jobs?.test as any;
      expect(testJob?.['runs-on']).toBe('ubuntu-latest');
      expect(testJob?.steps).toHaveLength(1);
    });

    it('should set workflow environment variables', () => {
      const workflow = new WorkflowBuilder()
        .name('Env Test')
        .env({ NODE_ENV: 'test', CI: true });
      
      const config = workflow.build();
      expect(config.env).toEqual({ NODE_ENV: 'test', CI: true });
    });

    it('should set workflow permissions', () => {
      const permissions = { contents: 'read' as const, packages: 'write' as const };
      const workflow = new WorkflowBuilder()
        .name('Permissions Test')
        .permissions(permissions);
      
      const config = workflow.build();
      expect(config.permissions).toEqual(permissions);
    });

    it('should set workflow concurrency', () => {
      const concurrency = { group: 'deploy', 'cancel-in-progress': true };
      const workflow = new WorkflowBuilder()
        .name('Concurrency Test')
        .concurrency(concurrency);
      
      const config = workflow.build();
      expect(config.concurrency).toEqual(concurrency);
    });

    it('should export to YAML', () => {
      const workflow = new WorkflowBuilder()
        .name('YAML Test')
        .onPush({ branches: ['main'] })
        .job('test', (job: JobBuilder) => job.runsOn('ubuntu-latest')
          .step((step: any) => step.name('Hello').run('echo "Hello World"'))
        );
      
      const yaml = workflow.toYAML();
      expect(yaml).toContain('name: YAML Test');
      expect(yaml).toContain('runs-on: ubuntu-latest');
      expect(yaml).toContain('echo "Hello World"');
    });
  });

  describe('createWorkflow factory', () => {
    it('should create a new WorkflowBuilder instance', () => {
      const workflow = createWorkflow();
      expect(workflow).toBeInstanceOf(WorkflowBuilder);
    });

    it('should create independent instances', () => {
      const workflow1 = createWorkflow().name('Workflow 1');
      const workflow2 = createWorkflow().name('Workflow 2');
      
      const config1 = workflow1.build();
      const config2 = workflow2.build();
      
      expect(config1.name).toBe('Workflow 1');
      expect(config2.name).toBe('Workflow 2');
    });
  });
}
