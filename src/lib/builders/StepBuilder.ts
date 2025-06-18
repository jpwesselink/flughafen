import { Builder, buildValue } from './Builder';
import { ActionBuilder } from "./ActionBuilder";

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

// In-source tests
if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('StepBuilder', () => {
    it('should create a basic step with name and run command', () => {
      const step = new StepBuilder()
        .name('Test Step')
        .run('npm test');
      
      const config = step.build();
      expect(config).toEqual({
        name: 'Test Step',
        run: 'npm test'
      });
    });

    it('should use direct action form', () => {
      const step = new StepBuilder()
        .name('Checkout')
        .uses('actions/checkout@v4');
      
      const config = step.build();
      expect(config).toEqual({
        name: 'Checkout',
        uses: 'actions/checkout@v4'
      });
    });

    it('should use callback action form', () => {
      const step = new StepBuilder()
        .name('Setup Node')
        .uses('actions/setup-node@v4', action => 
          action.with({ 'node-version': '18', cache: 'npm' })
            .env({ NODE_ENV: 'test' })
        );
      
      const config = step.build();
      expect(config.name).toBe('Setup Node');
      expect(config.uses).toBe('actions/setup-node@v4');
      expect(config.with).toEqual({ 'node-version': '18', cache: 'npm' });
      expect(config.env).toEqual({ NODE_ENV: 'test' });
    });

    it('should add step inputs with with() method', () => {
      const step = new StepBuilder()
        .name('Action with inputs')
        .uses('custom/action@v1')
        .with({ key: 'value', flag: true });
      
      const config = step.build();
      expect(config.with).toEqual({ key: 'value', flag: true });
    });

    it('should add step environment variables', () => {
      const step = new StepBuilder()
        .name('Step with env')
        .run('echo $TEST_VAR')
        .env({ TEST_VAR: 'test-value', DEBUG: false });
      
      const config = step.build();
      expect(config.env).toEqual({ TEST_VAR: 'test-value', DEBUG: false });
    });

    it('should set step condition', () => {
      const step = new StepBuilder()
        .name('Conditional step')
        .run('echo "Running on main"')
        .if('github.ref == "refs/heads/main"');
      
      const config = step.build();
      expect(config.if).toBe('github.ref == "refs/heads/main"');
    });

    it('should use checkout convenience method', () => {
      const step = new StepBuilder()
        .checkout({ with: { ref: 'main' } });
      
      const config = step.build();
      expect(config.name).toBe('Checkout code');
      expect(config.uses).toBe('actions/checkout@v4');
      expect(config.with).toEqual({ ref: 'main' });
    });

    it('should use setupNode convenience method', () => {
      const step = new StepBuilder()
        .setupNode({ with: { 'node-version': '20', cache: 'yarn' } });
      
      const config = step.build();
      expect(config.name).toBe('Setup Node.js');
      expect(config.uses).toBe('actions/setup-node@v4');
      expect(config.with).toEqual({ 'node-version': '20', cache: 'yarn' });
    });

    it('should chain multiple methods', () => {
      const step = new StepBuilder()
        .name('Complex step')
        .uses('custom/action@v1')
        .with({ input: 'value' })
        .env({ VAR: 'test' })
        .if('success()');
      
      const config = step.build();
      expect(config).toEqual({
        name: 'Complex step',
        uses: 'custom/action@v1',
        with: { input: 'value' },
        env: { VAR: 'test' },
        if: 'success()'
      });
    });

    it('should merge action config when using callback form', () => {
      const step = new StepBuilder()
        .name('Merge test')
        .with({ stepInput: 'value' })
        .env({ STEP_VAR: 'step' })
        .uses('test/action@v1', action => 
          action.with({ actionInput: 'action' })
            .env({ ACTION_VAR: 'action' })
        );
      
      const config = step.build();
      expect(config.with).toEqual({ 
        stepInput: 'value', 
        actionInput: 'action' 
      });
      expect(config.env).toEqual({ 
        STEP_VAR: 'step', 
        ACTION_VAR: 'action' 
      });
    });
  });
}
