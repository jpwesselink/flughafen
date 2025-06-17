import { 
  WorkflowConfig, 
  PermissionsConfig, 
  DefaultsConfig,
  PushConfig,
  PullRequestConfig,
  WorkflowInputs,
  ValidationResult,
  JobConfig,
  ConcurrencyConfig
} from '../../types/builder-types';
import { stringify } from 'yaml';
import Ajv from 'ajv';
import { toKebabCase } from '../../utils/toKebabCase';

/**
 * Callback-based job builder that prevents context switching
 */
export class CallbackJobBuilder {
  private config: Partial<JobConfig> = {};
  private stepsArray: any[] = [];

  /**
   * Set the runner for this job
   */
  runsOn(runner: string): CallbackJobBuilder {
    this.config['runs-on'] = runner;
    return this;
  }

  /**
   * Add a step using a callback
   */
  step(callback: (step: CallbackStepBuilder) => CallbackStepBuilder): CallbackJobBuilder {
    const stepBuilder = new CallbackStepBuilder();
    const finalStep = callback(stepBuilder);
    this.stepsArray.push(finalStep.build());
    return this;
  }

  /**
   * Set job environment variables
   */
  env(variables: Record<string, string | number | boolean>): CallbackJobBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set job permissions
   */
  permissions(permissions: PermissionsConfig): CallbackJobBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Set job strategy (matrix, etc.)
   */
  strategy(strategy: any): CallbackJobBuilder {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Set job timeout
   */
  timeoutMinutes(minutes: number): CallbackJobBuilder {
    this.config['timeout-minutes'] = minutes;
    return this;
  }

  /**
   * Set job needs (dependencies)
   */
  needs(needs: string): CallbackJobBuilder {
    this.config.needs = needs;
    return this;
  }

  /**
   * Set job condition
   */
  if(condition: string): CallbackJobBuilder {
    this.config.if = condition;
    return this;
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
 * Callback-based step builder that prevents context switching
 */
export class CallbackStepBuilder {
  private config: any = {};

  /**
   * Set step name
   */
  name(name: string): CallbackStepBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set step command
   */
  run(command: string): CallbackStepBuilder {
    this.config.run = command;
    return this;
  }

  /**
   * Set step to use an action
   */
  uses(action: string): CallbackStepBuilder {
    this.config.uses = action;
    return this;
  }

  /**
   * Set action inputs
   */
  with(inputs: Record<string, string | number | boolean>): CallbackStepBuilder {
    this.config.with = { 
      ...(this.config.with && typeof this.config.with === 'object' ? this.config.with : {}), 
      ...inputs 
    };
    return this;
  }

  /**
   * Set step environment variables
   */
  env(variables: Record<string, string | number | boolean>): CallbackStepBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set step condition
   */
  if(condition: string): CallbackStepBuilder {
    this.config.if = condition;
    return this;
  }

  /**
   * Convenience method for checkout action
   */
  checkout(options?: Record<string, any>): CallbackStepBuilder {
    this.config.name = this.config.name || 'Checkout code';
    this.config.uses = 'actions/checkout@v4';
    if (options?.with) {
      this.config.with = { 
        ...(this.config.with || {}), 
        ...options.with 
      };
    }
    return this;
  }

  /**
   * Convenience method for setup Node.js action
   */
  setupNode(options?: Record<string, any>): CallbackStepBuilder {
    this.config.name = this.config.name || 'Setup Node.js';
    this.config.uses = 'actions/setup-node@v4';
    if (options?.with) {
      this.config.with = { 
        ...(this.config.with || {}), 
        ...options.with 
      };
    }
    return this;
  }

  /**
   * Build the step configuration
   */
  build(): any {
    return { ...this.config };
  }
}

/**
 * Callback-based workflow builder that prevents context switching
 */
export class CallbackWorkflowBuilder {
  private config: Partial<WorkflowConfig> = {
    jobs: {}
  };

  /**
   * Set the workflow name
   */
  name(name: string): CallbackWorkflowBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set the workflow run name
   */
  runName(runName: string): CallbackWorkflowBuilder {
    this.config['run-name'] = runName;
    return this;
  }

  /**
   * Add push trigger
   */
  onPush(config?: PushConfig): CallbackWorkflowBuilder {
    this.addToOnConfig('push', config || {});
    return this;
  }

  /**
   * Add pull request trigger
   */
  onPullRequest(config?: PullRequestConfig): CallbackWorkflowBuilder {
    this.addToOnConfig('pull_request', config || {});
    return this;
  }

  /**
   * Add schedule trigger
   */
  onSchedule(cron: string | string[]): CallbackWorkflowBuilder {
    const schedules = Array.isArray(cron) ? cron.map(c => ({ cron: c })) : [{ cron }];
    this.addToOnConfig('schedule', schedules);
    return this;
  }

  /**
   * Add workflow dispatch trigger
   */
  onWorkflowDispatch(inputs?: WorkflowInputs): CallbackWorkflowBuilder {
    this.addToOnConfig('workflow_dispatch', inputs ? { inputs } : {});
    return this;
  }

  /**
   * Add a job using a callback
   */
  job(id: string, callback: (job: CallbackJobBuilder) => CallbackJobBuilder): CallbackWorkflowBuilder {
    const jobBuilder = new CallbackJobBuilder();
    const finalJob = callback(jobBuilder);
    
    if (!this.config.jobs) {
      this.config.jobs = {};
    }
    
    this.config.jobs[toKebabCase(id)] = finalJob.build();
    return this;
  }

  /**
   * Set workflow permissions
   */
  permissions(permissions: PermissionsConfig): CallbackWorkflowBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Set workflow environment variables
   */
  env(variables: Record<string, string | number | boolean>): CallbackWorkflowBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set workflow concurrency
   */
  concurrency(concurrency: ConcurrencyConfig): CallbackWorkflowBuilder {
    this.config.concurrency = concurrency;
    return this;
  }

  /**
   * Set workflow defaults
   */
  defaults(defaults: DefaultsConfig): CallbackWorkflowBuilder {
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
 * Create a new callback-based workflow builder
 */
export function createCallbackWorkflow(): CallbackWorkflowBuilder {
  return new CallbackWorkflowBuilder();
}
