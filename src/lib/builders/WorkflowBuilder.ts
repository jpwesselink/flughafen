import { JobBuilder } from './JobBuilder';
import { TriggerBuilder } from './TriggerBuilder';
import { 
  WorkflowConfig, 
  PermissionsConfig, 
  DefaultsConfig,
  PushConfig,
  PullRequestConfig,
  WorkflowInputs,
  ValidationResult,
  JobConfig,
  WorkflowCallConfig,
  WorkflowBuilderResult,
  ConcurrencyConfig
} from '../../types/builder-types';
import { stringify } from 'yaml';
import Ajv from 'ajv';
import { toKebabCase } from '../../utils/toKebabCase';

export class WorkflowBuilder implements WorkflowBuilderResult {
  private config: Partial<WorkflowConfig> = {
    jobs: {}
  };
  private jobsMap = new Map<string, JobBuilder>();
  private currentJob: JobBuilder | null = null;

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
   * Get trigger builder for complex event configurations
   */
  on(): TriggerBuilder {
    return new TriggerBuilder(this);
  }

  /**
   * Quick setup for push events
   */
  onPush(config?: Partial<PushConfig>): WorkflowBuilder {
    this.addToOnConfig('push', config || {});
    return this;
  }

  /**
   * Quick setup for pull request events
   */
  onPullRequest(config?: Partial<PullRequestConfig>): WorkflowBuilder {
    this.addToOnConfig('pull_request', config || {});
    return this;
  }

  /**
   * Quick setup for schedule events
   */
  onSchedule(cron: string): WorkflowBuilder {
    this.addToOnConfig('schedule', [{ cron }]);
    return this;
  }

  /**
   * Quick setup for workflow dispatch events
   */
  onWorkflowDispatch(inputs?: WorkflowInputs): WorkflowBuilder {
    this.addToOnConfig('workflow_dispatch', inputs ? { inputs } : {});
    return this;
  }

  /**
   * Add a workflow call trigger
   */
  onWorkflowCall(config?: WorkflowCallConfig): WorkflowBuilder {
    this.addToOnConfig('workflow_call', config || {});
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
   * Set global environment variables
   */
  env(variables: Record<string, string | number | boolean>): WorkflowBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set concurrency configuration
   */
  concurrency(config: ConcurrencyConfig): WorkflowBuilder {
    this.config.concurrency = config;
    return this;
  }

  /**
   * Set default configurations
   */
  defaults(config: DefaultsConfig): WorkflowBuilder {
    this.config.defaults = config;
    return this;
  }

  /**
   * Create a new job with callback-based configuration
   */
  job(id: string, callback: (job: JobBuilder) => void): WorkflowBuilder {
    // Auto-complete the previous job if it exists
    if (this.currentJob) {
      this.currentJob.finalize();
    }
    
    const jobBuilder = new JobBuilder(id, this);
    callback(jobBuilder);
    jobBuilder.finalize();
    this.jobsMap.set(id, jobBuilder);
    this.currentJob = null; // Reset current job since it's completed
    
    return this;
  }

  /**
   * Add a job with configuration
   */
  addJob(id: string, config: Partial<JobConfig>): WorkflowBuilder {
    const jobBuilder = new JobBuilder(id, this);
    jobBuilder.configure(config);
    this.jobsMap.set(id, jobBuilder);
    return this;
  }

  /**
   * Remove a job
   */
  removeJob(id: string): WorkflowBuilder {
    this.jobsMap.delete(id);
    return this;
  }

  /**
   * Internal method to add trigger configuration
   */
  addTriggerConfig(triggers: any): WorkflowBuilder {
    if (typeof this.config.on === 'string' || Array.isArray(this.config.on)) {
      this.config.on = {};
    }
    
    if (!this.config.on) {
      this.config.on = {};
    }

    this.config.on = { ...this.config.on, ...triggers };
    return this;
  }

  /**
   * Build the final workflow configuration
   */
  build(options: { skipValidation?: boolean } = {}): WorkflowConfig {
    // Auto-complete the current job if it exists
    if (this.currentJob) {
      this.currentJob.finalize();
      this.currentJob = null;
    }
    
    // Build all jobs
    const jobs: Record<string, JobConfig> = {};
    for (const [id, jobBuilder] of this.jobsMap) {
      jobs[id] = jobBuilder.build();
    }

    if (!options.skipValidation) {
      if (!this.config.on) {
        throw new Error('Workflow must have at least one trigger event');
      }
      if (Object.keys(jobs).length === 0) {
        throw new Error('Workflow must have at least one job');
      }
    }

    return {
      ...this.config,
      on: this.config.on,
      jobs
    } as WorkflowConfig;
  }

  /**
   * Convert to YAML string
   */
  toYaml(): string {
    return this.toYAML();
  }

  /**
   * Convert to YAML string with automatic validation
   */
  toYAML(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    const { validate: shouldValidate = true, throwOnError = true } = options;
    
    const workflow = this.build();
    
    if (shouldValidate) {
      const validation = this.validate();
      if (!validation.valid) {
        const errorMessage = `GitHub Actions workflow validation failed:\n${validation.errors?.join('\n')}`;
        
        if (throwOnError) {
          throw new Error(errorMessage);
        } else {
          console.warn(errorMessage);
        }
      }
    }
    
    return stringify(workflow);
  }

  /**
   * Validate against GitHub Actions schema
   */
  validate(): ValidationResult {
    const ajv = new Ajv({
      strictRequired: false,
      strictTypes: false,
      strictTuples: false,
      allowUnionTypes: true
    });

    try {
      const schema = require('../../lib/schema.json');
      const validate = ajv.compile(schema);
      const config = toKebabCase(this.build() as any);
      const isValid = validate(config);
      
      return {
        valid: isValid,
        errors: isValid ? undefined : validate.errors?.map(err => 
          `${err.instancePath}: ${err.message}`
        )
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  /**
   * Private helper to add configuration to the 'on' property
   */
  private addToOnConfig(event: string, config: any): void {
    if (typeof this.config.on === 'string' || Array.isArray(this.config.on)) {
      this.config.on = {};
    }
    
    if (!this.config.on) {
      this.config.on = {};
    }

    (this.config.on as any)[event] = config;
  }
}

/**
 * Factory function to create a new workflow builder
 */
export function createWorkflow(): WorkflowBuilder {
  return new WorkflowBuilder();
}

/**
 * Factory function for common CI workflow pattern
 */
export function createCIWorkflow(name: string, options: {
  branches?: string[];
  nodeVersion?: string;
  runner?: string;
} = {}) {
  const { branches = ['main'], nodeVersion = '18', runner = 'ubuntu-latest' } = options;
  
  // Build and return the complete workflow
  return new WorkflowBuilder()
    .name(name)
    .onPush({ branches } as any)
    .onPullRequest()
    .job('test', job => {
      job.runsOn(runner as any)
        .step(step => {
          step.name('Checkout code')
            .uses('actions/checkout@v4');
        })
        .step(step => {
          step.name('Setup Node.js')
            .uses('actions/setup-node@v4')
            .with({ 'node-version': nodeVersion });
        })
        .step(step => {
          step.name('Install dependencies')
            .run('npm ci');
        })
        .step(step => {
          step.name('Run tests')
            .run('npm test');
        });
    });
}
