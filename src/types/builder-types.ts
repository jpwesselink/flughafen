/**
 * Re-exports and type aliases for easier use of generated GitHub Actions types
 */

import type { 
  Schema,
  NormalJob,
  ReusableWorkflowCallJob,
  Container,
  Ref,
  Ref2
} from '../generated/github-actions';

export type { 
  Schema as GitHubWorkflow,
  NormalJob,
  ReusableWorkflowCallJob,
  Container
} from '../generated/github-actions';

// Convenience type aliases
export type Job = NormalJob | ReusableWorkflowCallJob;
export type Runner = NormalJob['runs-on'];
export type StepConfig = NonNullable<NormalJob['steps']>[number];
export type JobConfig = NormalJob;
export type WorkflowConfig = Schema;
export type EnvVars = Record<string, string | number | boolean>;
export type PermissionsConfig = NormalJob['permissions'];

// Event trigger types
export type PushConfig = Ref2;
export type PullRequestConfig = Ref;

// Additional helper types for builders
export interface BuilderResult<T> {
  build(): T;
}

export interface WorkflowBuilderResult extends BuilderResult<WorkflowConfig> {
  toYaml(): string;
  validate(): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Concurrency configuration
export type ConcurrencyConfig = string | {
  group: string;
  'cancel-in-progress'?: boolean;
};

// Input types for workflow dispatch
export interface WorkflowInput {
  description: string;
  required?: boolean;
  default?: string | boolean;
  type?: 'string' | 'boolean' | 'choice' | 'environment';
  options?: string[];
}

export type WorkflowInputs = Record<string, WorkflowInput>;

// Matrix strategy types
export interface MatrixStrategy {
  matrix: Record<string, (string | number | boolean)[]>;
  include?: Record<string, any>[];
  exclude?: Record<string, any>[];
  'fail-fast'?: boolean;
  'max-parallel'?: number;
}

// Step configuration helpers
export interface RunOptions {
  shell?: string;
  'working-directory'?: string;
}

export interface ActionOptions {
  with?: Record<string, string | number | boolean>;
  env?: EnvVars;
}

export interface CheckoutOptions extends ActionOptions {
  with?: {
    repository?: string;
    ref?: string;
    token?: string;
    path?: string;
    'clean'?: boolean;
    'fetch-depth'?: number;
    lfs?: boolean;
    submodules?: boolean | string;
  };
}

export interface NodeOptions extends ActionOptions {
  with?: {
    'node-version'?: string;
    'node-version-file'?: string;
    architecture?: string;
    'check-latest'?: boolean;
    'registry-url'?: string;
    scope?: string;
    token?: string;
    cache?: string;
    'cache-dependency-path'?: string;
  };
}

// Service configuration
export interface ServiceConfig extends Container {}

// Defaults configuration
export interface DefaultsConfig {
  run?: {
    shell?: string;
    'working-directory'?: string;
  };
}

// Workflow call configuration
export interface WorkflowCallConfig {
  inputs?: WorkflowInputs;
  secrets?: Record<string, {
    description?: string;
    required: boolean;
  }>;
}
