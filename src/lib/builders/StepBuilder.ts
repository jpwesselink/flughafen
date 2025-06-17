import type {
  StepConfig,
  EnvVars,
  ActionOptions,
  RunOptions,
  CheckoutOptions,
  NodeOptions
} from '../../types/builder-types';
import { JobBuilder } from './JobBuilder';

/**
 * StepBuilder for creating GitHub Actions step configurations with a fluent interface
 */
export class StepBuilder {
  private config: Partial<StepConfig> = {};
  private isFinalized = false;

  constructor(private jobBuilder: JobBuilder) {}

  /**
   * Set step ID
   */
  id(id: string): StepBuilder {
    this.config.id = id;
    return this;
  }

  /**
   * Set step name
   */
  name(name: string): StepBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set step condition
   */
  if(condition: string): StepBuilder {
    this.config.if = condition;
    return this;
  }

  /**
   * Set step to run a command
   */
  run(command: string, options?: RunOptions): StepBuilder {
    this.config.run = command;
    if (options) {
      Object.assign(this.config, options);
    }
    return this;
  }

  /**
   * Set step to use an action
   */
  uses(action: string, options?: ActionOptions): StepBuilder {
    this.config.uses = action;
    if (options) {
      Object.assign(this.config, options);
    }
    return this;
  }

  /**
   * Set step environment variables
   */
  env(variables: EnvVars): StepBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set working directory for the step
   */
  workingDirectory(path: string): StepBuilder {
    this.config['working-directory'] = path;
    return this;
  }

  /**
   * Set shell for the step
   */
  shell(shell: string): StepBuilder {
    this.config.shell = shell;
    return this;
  }

  /**
   * Set continue on error
   */
  continueOnError(continueOnError: boolean): StepBuilder {
    this.config['continue-on-error'] = continueOnError;
    return this;
  }

  /**
   * Set timeout in minutes
   */
  timeoutMinutes(minutes: number): StepBuilder {
    this.config['timeout-minutes'] = minutes;
    return this;
  }

  /**
   * Set action inputs (with keyword)
   */
  with(inputs: Record<string, string | number | boolean>): StepBuilder {
    this.config.with = { 
      ...(this.config.with && typeof this.config.with === 'object' ? this.config.with : {}), 
      ...inputs 
    };
    return this;
  }

  /**
   * Convenience method for checkout action
   */
  checkout(options?: CheckoutOptions): StepBuilder {
    this.config.name = this.config.name || 'Checkout code';
    this.config.uses = 'actions/checkout@v4';
    if (options) {
      Object.assign(this.config, options);
    }
    return this;
  }

  /**
   * Convenience method for setup Node.js action
   */
  setupNode(options?: NodeOptions): StepBuilder {
    this.config.name = this.config.name || 'Setup Node.js';
    this.config.uses = 'actions/setup-node@v4';
    if (options) {
      Object.assign(this.config, options);
    }
    return this;
  }

  // Context-switching methods removed to prevent API misuse
  // Only .toYAML() should be used to complete the workflow

  /**
   * Convert to YAML (auto-completes everything)
   */
  toYAML(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    this.finalize();
    return this.jobBuilder.toYAML(options);
  }

  /**
   * Convert to YAML (auto-completes everything) - alias
   */
  toYaml(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    return this.toYAML(options);
  }

  /**
   * Create another step (finishes this step and starts a new one)
   */
  step(): StepBuilder {
    this.finalize();
    return this.jobBuilder.step();
  }

  /**
   * Finalize this step (called automatically when moving to next step/job)
   */
  finalize(): void {
    if (!this.isFinalized) {
      this.finishStep();
      this.isFinalized = true;
    }
  }

  /**
   * Build the step configuration
   */
  build(): StepConfig {
    if (!this.config.run && !this.config.uses) {
      throw new Error('Step must have either "run" or "uses" specified');
    }

    return this.config as StepConfig;
  }

  /**
   * Private method to finish the current step and add it to the job
   */
  private finishStep(): void {
    const stepConfig = this.build();
    this.jobBuilder.addStepConfig(stepConfig);
  }
}
