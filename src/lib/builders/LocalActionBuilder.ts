import { Builder } from './Builder';

/**
 * Configuration for action inputs
 */
export interface ActionInputConfig {
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: 'string' | 'number' | 'boolean' | 'choice';
  options?: string[]; // for choice type
}

/**
 * Configuration for action outputs
 */
export interface ActionOutputConfig {
  description?: string;
  value?: string;
}

/**
 * Action step configuration
 */
export interface ActionStep {
  name?: string;
  run?: string;
  shell?: string;
  env?: Record<string, string>;
  if?: string;
  workingDirectory?: string;
}

/**
 * Builder for local custom GitHub Actions
 */
export class LocalActionBuilder implements Builder<any> {
  private config: {
    name?: string;
    filename?: string;
    description?: string;
    inputs?: Record<string, ActionInputConfig>;
    outputs?: Record<string, ActionOutputConfig>;
    runs?: {
      using: 'composite' | 'node16' | 'node20' | 'docker';
      steps?: ActionStep[];
      main?: string; // for node actions
      image?: string; // for docker actions
    };
  } = {
    runs: {
      using: 'composite'
    }
  };

  /**
   * Set the action name (used for directory name)
   */
  name(name: string): LocalActionBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set custom filename/path (optional override)
   */
  filename(path: string): LocalActionBuilder {
    this.config.filename = path;
    return this;
  }

  /**
   * Set action description
   */
  description(description: string): LocalActionBuilder {
    this.config.description = description;
    return this;
  }

  /**
   * Add an input parameter
   */
  input(name: string, config: ActionInputConfig): LocalActionBuilder {
    if (!this.config.inputs) {
      this.config.inputs = {};
    }
    this.config.inputs[name] = config;
    return this;
  }

  /**
   * Add an output parameter
   */
  output(name: string, config: ActionOutputConfig): LocalActionBuilder {
    if (!this.config.outputs) {
      this.config.outputs = {};
    }
    this.config.outputs[name] = config;
    return this;
  }

  /**
   * Set the action type
   */
  using(type: 'composite' | 'node16' | 'node20' | 'docker'): LocalActionBuilder {
    if (!this.config.runs) {
      this.config.runs = { using: type };
    } else {
      this.config.runs.using = type;
    }
    return this;
  }

  /**
   * Set composite action steps (for composite actions)
   */
  steps(steps: (string | ActionStep)[]): LocalActionBuilder {
    if (!this.config.runs) {
      this.config.runs = { using: 'composite' };
    }
    
    this.config.runs.steps = steps.map(step => {
      if (typeof step === 'string') {
        return {
          run: step,
          shell: 'bash'
        };
      }
      return step;
    });
    return this;
  }

  /**
   * Convenience method for simple run commands (chainable)
   */
  run(command: string): LocalActionBuilder {
    if (!this.config.runs) {
      this.config.runs = { using: 'composite', steps: [] };
    }
    
    if (!this.config.runs.steps) {
      this.config.runs.steps = [];
    }
    
    this.config.runs.steps.push({
      run: command,
      shell: 'bash'
    });
    
    return this;
  }

  /**
   * Set main entry point (for Node.js actions)
   */
  main(entryPoint: string): LocalActionBuilder {
    if (!this.config.runs) {
      this.config.runs = { using: 'node20' };
    }
    this.config.runs.main = entryPoint;
    return this;
  }

  /**
   * Set Docker image (for Docker actions)
   */
  image(imageName: string): LocalActionBuilder {
    if (!this.config.runs) {
      this.config.runs = { using: 'docker' };
    }
    this.config.runs.image = imageName;
    return this;
  }

  /**
   * Get the action name for referencing
   */
  getName(): string | undefined {
    return this.config.name;
  }

  /**
   * Get the filename/path for the action
   */
  getFilename(): string | undefined {
    return this.config.filename;
  }

  /**
   * Get the reference path for use in workflows
   */
  getReference(): string {
    if (this.config.filename) {
      return this.config.filename.startsWith('./') ? this.config.filename : `./${this.config.filename}`;
    }
    if (this.config.name) {
      return `./actions/${this.config.name}`;
    }
    throw new Error('Local action must have either a name or filename');
  }

  /**
   * Build the action configuration for action.yml
   */
  build(): any {
    const result: any = {};

    if (this.config.name) {
      result.name = this.config.name;
    }

    if (this.config.description) {
      result.description = this.config.description;
    }

    if (this.config.inputs && Object.keys(this.config.inputs).length > 0) {
      result.inputs = {};
      for (const [name, input] of Object.entries(this.config.inputs)) {
        result.inputs[name] = {
          description: input.description,
          required: input.required,
          default: input.default
        };
        
        // Add type-specific properties
        if (input.type === 'choice' && input.options) {
          result.inputs[name].type = 'choice';
          result.inputs[name].options = input.options;
        }
      }
    }

    if (this.config.outputs && Object.keys(this.config.outputs).length > 0) {
      result.outputs = this.config.outputs;
    }

    if (this.config.runs) {
      result.runs = { ...this.config.runs };
    }

    return result;
  }

  /**
   * Generate the action.yml content as YAML string
   */
  toYAML(): string {
    const config = this.build();
    const yaml = require('js-yaml');
    return yaml.dump(config, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  }
}

/**
 * Factory function to create a new local action
 */
export function createLocalAction(): LocalActionBuilder {
  return new LocalActionBuilder();
}

// In-source tests
if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('LocalActionBuilder', () => {
    it('should create a basic composite action', () => {
      const action = new LocalActionBuilder()
        .name('test-action')
        .description('A test action')
        .run('echo "Hello World"')
        .run('npm test');

      const config = action.build();
      expect(config.name).toBe('test-action');
      expect(config.description).toBe('A test action');
      expect(config.runs.using).toBe('composite');
      expect(config.runs.steps).toHaveLength(2);
      expect(config.runs.steps[0].run).toBe('echo "Hello World"');
      expect(config.runs.steps[1].run).toBe('npm test');
    });

    it('should add inputs and outputs', () => {
      const action = new LocalActionBuilder()
        .name('setup-action')
        .input('version', {
          description: 'Node.js version',
          required: true,
          default: '18'
        })
        .output('cache-hit', {
          description: 'Whether cache was hit',
          value: '${{ steps.cache.outputs.cache-hit }}'
        });

      const config = action.build();
      expect(config.inputs.version).toEqual({
        description: 'Node.js version',
        required: true,
        default: '18'
      });
      expect(config.outputs['cache-hit']).toEqual({
        description: 'Whether cache was hit',
        value: '${{ steps.cache.outputs.cache-hit }}'
      });
    });

    it('should generate correct reference path', () => {
      const action1 = new LocalActionBuilder().name('my-action');
      expect(action1.getReference()).toBe('./actions/my-action');

      const action2 = new LocalActionBuilder().filename('custom/path');
      expect(action2.getReference()).toBe('./custom/path');

      const action3 = new LocalActionBuilder().filename('./already/relative');
      expect(action3.getReference()).toBe('./already/relative');
    });

    it('should support different action types', () => {
      const nodeAction = new LocalActionBuilder()
        .name('node-action')
        .using('node20')
        .main('dist/index.js');

      const dockerAction = new LocalActionBuilder()
        .name('docker-action')
        .using('docker')
        .image('alpine:latest');

      expect(nodeAction.build().runs).toEqual({
        using: 'node20',
        main: 'dist/index.js'
      });

      expect(dockerAction.build().runs).toEqual({
        using: 'docker',
        image: 'alpine:latest'
      });
    });

    it('should generate valid YAML', () => {
      const action = new LocalActionBuilder()
        .name('test-yaml')
        .description('Test YAML generation')
        .input('test-input', { required: true })
        .run('echo "test"');

      const yaml = action.toYAML();
      expect(yaml).toContain('name: test-yaml');
      expect(yaml).toContain('description: Test YAML generation');
      expect(yaml).toContain('inputs:');
      expect(yaml).toContain('runs:');
    });
  });
}
