import type {
  JobConfig,
  Runner,
  EnvVars,
  PermissionsConfig,
  MatrixStrategy,
  StepConfig,
  CheckoutOptions,
  NodeOptions,
  ActionOptions,
  RunOptions,
  ServiceConfig,
  Container
} from '../../types/builder-types';
import { WorkflowBuilder } from './WorkflowBuilder';
import { StepBuilder } from './StepBuilder';

/**
 * JobBuilder for creating GitHub Actions job configurations with a fluent interface
 */
export class JobBuilder {
  private config: Partial<JobConfig> = {};
  private stepsArray: StepConfig[] = [];
  private currentStep: StepBuilder | null = null;

  constructor(
    private jobId: string,
    private workflowBuilder: WorkflowBuilder
  ) {}

  /**
   * Set the job name
   */
  name(name: string): JobBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set the runner for this job
   */
  runsOn(runner: Runner): JobBuilder {
    this.config['runs-on'] = runner;
    return this;
  }

  /**
   * Set a reusable workflow to call
   */
  usesWorkflow(workflow: string): JobBuilder {
    // Note: This would be for ReusableWorkflowCallJob
    // For now, we'll store it in a custom property
    (this.config as any).uses = workflow;
    return this;
  }

  /**
   * Set job dependencies
   */
  needs(dependencies: string | string[]): JobBuilder {
    this.config.needs = Array.isArray(dependencies) 
      ? (dependencies.length > 0 ? [dependencies[0], ...dependencies.slice(1)] : undefined)
      : dependencies;
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
   * Set job permissions
   */
  permissions(permissions: PermissionsConfig): JobBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Set job environment variables
   */
  env(variables: EnvVars): JobBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Set job outputs
   */
  outputs(outputs: Record<string, string>): JobBuilder {
    this.config.outputs = { ...this.config.outputs, ...outputs };
    return this;
  }

  /**
   * Set job strategy (matrix)
   */
  strategy(strategy: MatrixStrategy): JobBuilder {
    this.config.strategy = strategy as any;
    return this;
  }

  /**
   * Set job container
   */
  container(container: string | Container): JobBuilder {
    this.config.container = container;
    return this;
  }

  /**
   * Set job services
   */
  services(services: Record<string, ServiceConfig>): JobBuilder {
    this.config.services = services;
    return this;
  }

  /**
   * Set job environment
   */
  environment(environment: string | { name: string; url?: string }): JobBuilder {
    this.config.environment = environment;
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
   * Set continue on error
   */
  continueOnError(continueOnError: boolean): JobBuilder {
    this.config['continue-on-error'] = continueOnError;
    return this;
  }

  /**
   * Create a new step builder (auto-completes previous step)
   */
  step(): StepBuilder {
    // Auto-complete the previous step if it exists
    if (this.currentStep) {
      this.currentStep.finalize();
    }
    
    this.currentStep = new StepBuilder(this);
    return this.currentStep;
  }

  /**
   * Add a step with configuration
   */
  addStep(config: Partial<StepConfig>): JobBuilder {
    this.stepsArray.push(config as StepConfig);
    return this;
  }

  /**
   * Add a run step (convenience method)
   */
  run(command: string, options?: RunOptions): JobBuilder {
    const stepConfig: Partial<StepConfig> = {
      run: command,
      ...options
    };
    this.stepsArray.push(stepConfig as StepConfig);
    return this;
  }

  /**
   * Add an action step (convenience method)
   */
  usesAction(action: string, options?: ActionOptions): JobBuilder {
    const stepConfig: Partial<StepConfig> = {
      uses: action,
      ...options
    };
    this.stepsArray.push(stepConfig as StepConfig);
    return this;
  }

  /**
   * Add checkout step (convenience method)
   */
  checkout(options?: CheckoutOptions): JobBuilder {
    const stepConfig: Partial<StepConfig> = {
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      ...options
    };
    this.stepsArray.push(stepConfig as StepConfig);
    return this;
  }

  /**
   * Add setup Node.js step (convenience method)
   */
  setupNode(options?: NodeOptions): JobBuilder {
    const stepConfig: Partial<StepConfig> = {
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v4',
      ...options
    };
    this.stepsArray.push(stepConfig as StepConfig);
    return this;
  }

  // Context-switching method removed to prevent API misuse
  // Only .toYAML() should be used to complete the workflow

  /**
   * Convert to YAML (auto-completes everything)
   */
  toYAML(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    this.finalize();
    return this.workflowBuilder.toYAML(options);
  }

  /**
   * Convert to YAML (auto-completes everything) - alias
   */
  toYaml(options: { validate?: boolean; throwOnError?: boolean } = {}): string {
    return this.toYAML(options);
  }

  /**
   * Configure the job with a partial configuration
   */
  configure(config: Partial<JobConfig>): JobBuilder {
    this.config = { ...this.config, ...config };
    if (config.steps) {
      this.stepsArray = [...config.steps];
    }
    return this;
  }

  /**
   * Add a step configuration (called by StepBuilder)
   */
  addStepConfig(stepConfig: StepConfig): JobBuilder {
    this.stepsArray.push(stepConfig);
    return this;
  }

  /**
   * Finalize the current step and add it to the job
   */
  finalize(): void {
    // Auto-complete the current step if it exists
    if (this.currentStep) {
      this.currentStep.finalize();
      this.currentStep = null;
    }
  }

  /**
   * Build the final job configuration
   */
  build(): JobConfig {
    // Finalize any remaining step
    this.finalize();
    
    const jobConfig = {
      ...this.config,
      steps: this.stepsArray.length > 0 ? this.stepsArray : undefined
    };

    // Ensure required fields are present
    if (!jobConfig['runs-on'] && !(jobConfig as any).uses) {
      throw new Error(`Job '${this.jobId}' must have either 'runs-on' or 'uses' specified`);
    }

    return jobConfig as JobConfig;
  }
}
