import { 
  JobConfig,
  PermissionsConfig
} from '../../types/builder-types';
import { StepBuilder } from './StepBuilder';
import { Builder, buildValue } from './Builder';

/**
 * Job builder that prevents context switching
 */
export class JobBuilder implements Builder<JobConfig> {
  private config: Partial<JobConfig> = {};
  private stepsArray: any[] = [];

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
    this.stepsArray.push(buildValue(finalStep));
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
  needs(needs: string): JobBuilder {
    this.config.needs = needs;
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
