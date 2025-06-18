import { Builder } from './Builder';

/**
 * Builder for GitHub Actions action configurations
 */
export class ActionBuilder implements Builder<any> {
  private config: any = {};

  constructor(actionName: string) {
    this.config.uses = actionName;
  }

  /**
   * Set action inputs
   */
  with(inputs: Record<string, string | number | boolean>): ActionBuilder {
    this.config.with = { 
      ...(this.config.with && typeof this.config.with === 'object' ? this.config.with : {}), 
      ...inputs 
    };
    return this;
  }

  /**
   * Set action environment variables
   */
  env(variables: Record<string, string | number | boolean>): ActionBuilder {
    this.config.env = { 
      ...(this.config.env && typeof this.config.env === 'object' ? this.config.env : {}), 
      ...variables 
    };
    return this;
  }

  /**
   * Build the action configuration
   */
  build(): any {
    return this.config;
  }
}
