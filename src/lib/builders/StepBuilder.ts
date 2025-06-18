import { Builder, buildValue } from './Builder';
import { ActionBuilder } from './ActionBuilder';

/**
 * Step builder that prevents context switching
 */
export class StepBuilder implements Builder<any> {
  private config: any = {};

  /**
   * Set step name
   */
  name(name: string): StepBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set step command
   */
  run(command: string): StepBuilder {
    this.config.run = command;
    return this;
  }

  /**
   * Set step to use an action (direct form)
   */
  uses(action: string): StepBuilder;
  /**
   * Set step to use an action (callback form)
   */
  uses(action: string, callback: (action: ActionBuilder) => ActionBuilder): StepBuilder;
  uses(action: string, callback?: (action: ActionBuilder) => ActionBuilder): StepBuilder {
    if (callback) {
      // Callback form - configure action with callback
      const actionBuilder = new ActionBuilder(action);
      const configuredAction = callback(actionBuilder);
      const actionConfig = buildValue(configuredAction);
      
      // Merge action config into step config
      this.config.uses = actionConfig.uses;
      if (actionConfig.with) {
        this.config.with = { 
          ...(this.config.with && typeof this.config.with === 'object' ? this.config.with : {}), 
          ...actionConfig.with 
        };
      }
      if (actionConfig.env) {
        this.config.env = { 
          ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
          ...actionConfig.env 
        };
      }
    } else {
      // Direct form - just set the action name
      this.config.uses = action;
    }
    return this;
  }

  /**
   * Set action inputs
   */
  with(inputs: Record<string, string | number | boolean>): StepBuilder {
    this.config.with = { 
      ...(this.config.with && typeof this.config.with === 'object' ? this.config.with : {}), 
      ...inputs 
    };
    return this;
  }

  /**
   * Set step environment variables
   */
  env(variables: Record<string, string | number | boolean>): StepBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
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
   * Convenience method for checkout action
   */
  checkout(options?: Record<string, any>): StepBuilder {
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
  setupNode(options?: Record<string, any>): StepBuilder {
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
