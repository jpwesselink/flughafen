# Flughafen API Reference

Complete API documentation for Flughafen's TypeScript GitHub Actions workflow builder.

## Table of Contents

- [Factory Functions](#factory-functions)
- [WorkflowBuilder](#workflowbuilder)
- [JobBuilder](#jobbuilder)
- [StepBuilder](#stepbuilder)
- [ActionBuilder](#actionbuilder)
- [LocalActionBuilder](#localactionbuilder)
- [Operations](#operations)
- [Validation](#validation)
- [Type Generation](#type-generation)
- [Processing](#processing)

---

## Factory Functions

### `createWorkflow()`

Creates a new WorkflowBuilder instance.

```typescript
import { createWorkflow } from '@flughafen/core';

const workflow = createWorkflow()
  .name('My Workflow')
  .on('push')
  .job('build', job => job.runsOn('ubuntu-latest'));
```

**Returns:** `WorkflowBuilder`

### `createLocalAction<TInputs, TOutputs>()`

Creates a new LocalActionBuilder instance for defining custom actions.

```typescript
import { createLocalAction } from '@flughafen/core';

const myAction = createLocalAction()
  .name('my-action')
  .description('My custom action')
  .input('version', { description: 'Version', required: true })
  .using('composite')
  .step(step => step.run('echo "Hello"'));
```

**Type Parameters:**
- `TInputs` - Type definition for action inputs
- `TOutputs` - Type definition for action outputs

**Returns:** `LocalActionBuilder<TInputs, TOutputs>`

---

## WorkflowBuilder

The main builder for creating GitHub Actions workflows.

### Configuration Methods

#### `.name(name: string): WorkflowBuilder`

Sets the workflow name.

```typescript
createWorkflow().name('Continuous Integration')
```

#### `.runName(runName: string): WorkflowBuilder`

Sets the run name (displayed in GitHub UI).

```typescript
createWorkflow().runName('CI - ${{ github.ref_name }}')
```

#### `.filename(filename: string): WorkflowBuilder`

Sets the output filename (without `.yml` extension).

```typescript
createWorkflow().filename('ci')  // Outputs to ci.yml
```

**Default:** Uses the filename of the TypeScript file (e.g., `ci.ts` → `ci.yml`)

---

### Trigger Methods

#### `.on<T extends EventName>(event: T, config?: EventConfig<T>): WorkflowBuilder`

Adds a workflow trigger. Supports all GitHub Events with type-safe configuration.

**Common Events:**

```typescript
// Push events
.on('push', {
  branches: ['main', 'develop'],
  paths: ['src/**'],
  'paths-ignore': ['docs/**']
})

// Pull request events
.on('pull_request', {
  types: ['opened', 'synchronize', 'reopened'],
  branches: ['main']
})

// Schedule (cron)
.on('schedule', [
  { cron: '0 2 * * *' }  // Daily at 2 AM UTC
])

// Manual trigger with inputs
.on('workflow_dispatch', {
  inputs: {
    environment: {
      description: 'Target environment',
      required: true,
      type: 'choice',
      options: ['dev', 'staging', 'prod']
    }
  }
})

// Reusable workflow
.on('workflow_call', {
  inputs: {
    version: {
      description: 'Version to deploy',
      required: true,
      type: 'string'
    }
  },
  secrets: {
    deploy_token: {
      description: 'Deployment token',
      required: true
    }
  }
})

// Release events
.on('release', { types: ['published'] })

// Issue events
.on('issues', { types: ['opened', 'labeled'] })
```

**Supported Events:** `push`, `pull_request`, `schedule`, `workflow_dispatch`, `workflow_call`, `release`, `issues`, `issue_comment`, `pull_request_review`, `fork`, `watch`, `create`, `delete`, `deployment`, `deployment_status`, `repository_dispatch`, and many more.

---

### Job Methods

#### `.job(id: string, callback: (job: JobBuilder) => JobBuilder): WorkflowBuilder`

Adds a job to the workflow using a callback.

```typescript
.job('build', job =>
  job.runsOn('ubuntu-latest')
    .step(step => step.run('npm run build'))
)
```

#### `.job(id: string, job: JobBuilder): WorkflowBuilder`

Adds a job to the workflow using an existing JobBuilder.

```typescript
const buildJob = new JobBuilder().runsOn('ubuntu-latest');
workflow.job('build', buildJob);
```

**Parameters:**
- `id` - Job identifier (converted to kebab-case)
- `callback` - Function that configures the job
- `job` - Pre-configured JobBuilder instance

---

### Global Configuration

#### `.permissions(permissions: PermissionsConfig): WorkflowBuilder`

Sets workflow-level permissions.

```typescript
.permissions({
  contents: 'read',
  issues: 'write',
  'pull-requests': 'write'
})

// Or set all permissions
.permissions('read-all')  // All permissions set to read
.permissions('write-all') // All permissions set to write
```

#### `.env(variables: Record<string, string | number | boolean>): WorkflowBuilder`

Sets workflow-level environment variables.

```typescript
.env({
  NODE_ENV: 'production',
  DEBUG: false,
  MAX_WORKERS: 4
})
```

#### `.concurrency(config: ConcurrencyConfig): WorkflowBuilder`

Controls concurrent workflow runs.

```typescript
.concurrency({
  group: '${{ github.workflow }}-${{ github.ref }}',
  'cancel-in-progress': true
})
```

#### `.defaults(defaults: DefaultsConfig): WorkflowBuilder`

Sets default values for all jobs.

```typescript
.defaults({
  run: {
    shell: 'bash',
    'working-directory': './app'
  }
})
```

---

### Output Methods

#### `.toYAML(options?): string`

Generates YAML output.

```typescript
const yaml = workflow.toYAML({
  validate: true,        // Enable validation (default: true)
  throwOnError: false    // Don't throw on validation errors (default: true)
});
```

#### `.build(): WorkflowConfig`

Returns the internal workflow configuration object.

```typescript
const config = workflow.build();
```

#### `.synth(options?): { workflow: {...}, actions: {...} }`

Synthesizes the workflow and any local actions.

```typescript
const { workflow, actions } = workflow.synth({
  basePath: '.github',
  workflowsDir: '.github/workflows',
  actionsDir: '.github/actions'
});
```

---

### Validation

#### `.validate(): ValidationResult`

Validates the workflow configuration.

```typescript
const result = workflow.validate();
if (!result.valid) {
  console.error('Errors:', result.errors);
}
```

---

## JobBuilder

Builder for configuring individual jobs within a workflow.

### Basic Configuration

#### `.name(name: string): JobBuilder`

Sets the job name (displayed in GitHub UI).

```typescript
job.name('Build Application')
```

#### `.runsOn(runner: string): JobBuilder`

Sets the runner for the job.

```typescript
job.runsOn('ubuntu-latest')
job.runsOn('${{ matrix.os }}')
job.runsOn(['self-hosted', 'linux', 'x64'])
```

#### `.needs(jobs: string | string[]): JobBuilder`

Sets job dependencies.

```typescript
job.needs('build')
job.needs(['lint', 'test'])
```

**Note:** GitHub Actions requires at least one dependency. Empty arrays will throw an error.

#### `.if(condition: string): JobBuilder`

Sets a conditional expression for the job.

```typescript
job.if("github.ref == 'refs/heads/main'")
job.if("success() && needs.build.result == 'success'")
```

---

### Steps

#### `.step(callback: (step: StepBuilder) => StepBuilder): JobBuilder`

Adds a step to the job.

```typescript
job.step(step =>
  step.name('Checkout')
    .uses('actions/checkout@v4')
)
```

---

### Environment

#### `.environment(environment: { name: string; url?: string }): JobBuilder`

Sets the deployment environment.

```typescript
job.environment({
  name: 'production',
  url: 'https://example.com'
})
```

#### `.env(variables: Record<string, string | number | boolean>): JobBuilder`

Sets job-level environment variables.

```typescript
job.env({
  NODE_ENV: 'production',
  API_URL: 'https://api.example.com'
})
```

#### `.permissions(permissions: PermissionsConfig): JobBuilder`

Sets job-level permissions.

```typescript
job.permissions({
  contents: 'read',
  packages: 'write'
})
```

---

### Matrix Strategy

#### `.strategy(strategy: StrategyConfig): JobBuilder`

Configures matrix builds.

```typescript
job.strategy({
  matrix: {
    os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    'node-version': ['18', '20', '22']
  },
  'fail-fast': false,
  'max-parallel': 3,
  include: [
    { os: 'ubuntu-latest', 'node-version': '22', experimental: true }
  ],
  exclude: [
    { os: 'macos-latest', 'node-version': '18' }
  ]
})
```

---

### Container & Services

#### `.container(container: string | ContainerConfig): JobBuilder`

Runs the job in a container.

```typescript
// Simple form
job.container('node:20')

// Advanced form
job.container({
  image: 'node:20',
  env: { NODE_ENV: 'test' },
  ports: ['80:80'],
  volumes: ['/data:/data'],
  options: '--cpus 2'
})
```

#### `.services(services: Record<string, ServiceConfig>): JobBuilder`

Adds service containers.

```typescript
job.services({
  postgres: {
    image: 'postgres:15',
    env: { POSTGRES_PASSWORD: 'postgres' },
    ports: ['5432:5432'],
    options: '--health-cmd pg_isready'
  },
  redis: {
    image: 'redis:7',
    ports: ['6379:6379']
  }
})
```

---

### Configuration Options

#### `.timeoutMinutes(minutes: number): JobBuilder`

Sets the maximum job execution time.

```typescript
job.timeoutMinutes(30)  // 30 minutes
```

#### `.continueOnError(continue: boolean): JobBuilder`

Allows the workflow to continue if the job fails.

```typescript
job.continueOnError(true)
```

#### `.concurrency(config: ConcurrencyConfig): JobBuilder`

Controls concurrent job execution.

```typescript
job.concurrency({
  group: 'deploy-${{ github.ref }}',
  'cancel-in-progress': false
})
```

---

### Reusable Workflows

#### `.uses(workflow: string): JobBuilder`

Calls a reusable workflow.

```typescript
job.uses('./.github/workflows/reusable-deploy.yml')
```

#### `.with(inputs: Record<string, any>): JobBuilder`

Sets inputs for a reusable workflow (use after `.uses()`).

```typescript
job.uses('./.github/workflows/deploy.yml')
  .with({
    environment: 'production',
    version: '1.2.3'
  })
```

#### `.secrets(secrets: Record<string, string> | 'inherit'): JobBuilder`

Sets secrets for a reusable workflow.

```typescript
job.secrets({
  deploy_token: '${{ secrets.DEPLOY_TOKEN }}'
})

// Or inherit all secrets
job.secrets('inherit')
```

---

### Outputs

#### `.outputs(outputs: Record<string, string>): JobBuilder`

Defines job outputs.

```typescript
job.outputs({
  'artifact-url': '${{ steps.upload.outputs.artifact-url }}',
  version: '${{ steps.version.outputs.version }}'
})
```

---

### Comments

#### `.comment(comment: string): JobBuilder`

Adds a YAML comment above the job (for documentation).

```typescript
job.comment('This job builds the application and runs tests')
```

---

## StepBuilder

Builder for configuring individual steps within a job.

### Basic Configuration

#### `.name(name: string): StepBuilder`

Sets the step name.

```typescript
step.name('Checkout code')
```

#### `.id(id: string): StepBuilder`

Sets the step ID for referencing outputs.

```typescript
step.id('checkout')
// Reference outputs: ${{ steps.checkout.outputs.xxx }}
```

#### `.if(condition: string): StepBuilder`

Sets a conditional expression.

```typescript
step.if("success()")
step.if("failure()")
step.if("github.event_name == 'push'")
```

---

### Running Commands

#### `.run(command: string): StepBuilder`

Runs a shell command.

```typescript
step.run('npm ci && npm test')
```

#### `.runCommands(commands: string[]): StepBuilder`

Runs multiple commands (joined with newlines).

```typescript
step.runCommands([
  'npm ci',
  'npm run build',
  'npm test'
])
```

#### `.shell(shell: string): StepBuilder`

Sets the shell to use.

```typescript
step.shell('bash')
step.shell('pwsh')  // PowerShell
step.shell('python')
```

#### `.workingDirectory(dir: string): StepBuilder`

Sets the working directory.

```typescript
step.workingDirectory('./packages/app')
```

---

### Using Actions

#### `.uses(action: string): StepBuilder`

Uses a GitHub Action (basic form).

```typescript
step.uses('actions/checkout@v4')
```

#### `.uses(action: string, inputs: Record<string, any>): StepBuilder`

Uses an action with inputs (shorthand form).

```typescript
step.uses('actions/setup-node@v4', {
  'node-version': '20',
  'cache': 'npm'
})
```

#### `.uses(action: string, callback: (action: ActionBuilder) => ActionBuilder): StepBuilder`

Uses an action with callback configuration (recommended).

```typescript
step.uses('actions/setup-node@v4', action =>
  action
    .with({
      'node-version': '20',
      'cache': 'npm'
    })
    .env({
      NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}'
    })
)
```

#### `.uses(action: LocalActionBuilder, callback?: ...): StepBuilder`

Uses a local custom action.

```typescript
step.uses(myLocalAction, action =>
  action.with({ 'node-version': '20' })
)
```

---

### Environment

#### `.env(variables: Record<string, string | number | boolean>): StepBuilder`

Sets step-level environment variables.

```typescript
step.env({
  NODE_ENV: 'production',
  DEBUG: true
})
```

---

### Error Handling

#### `.continueOnError(continue: boolean): StepBuilder`

Allows the job to continue if the step fails.

```typescript
step.continueOnError(true)
```

#### `.timeoutMinutes(minutes: number): StepBuilder`

Sets the maximum step execution time.

```typescript
step.timeoutMinutes(10)
```

---

### Comments

#### `.comment(comment: string): StepBuilder`

Adds a YAML comment above the step.

```typescript
step.comment('This step deploys to production')
```

---

## ActionBuilder

Builder for configuring GitHub Actions (used within StepBuilder).

### Methods

#### `.with(inputs: Record<string, any>): ActionBuilder`

Sets action inputs.

```typescript
action.with({
  'node-version': '20',
  'cache': 'npm',
  'registry-url': 'https://registry.npmjs.org'
})
```

#### `.env(variables: Record<string, string | number | boolean>): ActionBuilder`

Sets environment variables for the action.

```typescript
action.env({
  NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}'
})
```

---

## LocalActionBuilder

Builder for creating custom local actions.

### Metadata

#### `.name(name: string): LocalActionBuilder`

Sets the action name (used for directory naming).

```typescript
createLocalAction().name('setup-environment')
// Creates: .github/actions/setup-environment/action.yml
```

#### `.description(description: string): LocalActionBuilder`

Sets the action description.

```typescript
createLocalAction().description('Setup development environment')
```

#### `.author(author: string): LocalActionBuilder`

Sets the action author.

```typescript
createLocalAction().author('Your Name <your.email@example.com>')
```

---

### Inputs & Outputs

#### `.input(name: string, config: InputConfig): LocalActionBuilder`

Defines an input parameter.

```typescript
createLocalAction()
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '20'
  })
  .input('package-manager', {
    description: 'Package manager',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm'],
    default: 'npm'
  })
```

**InputConfig:**
- `description` - Input description
- `required` - Whether the input is required
- `default` - Default value
- `type` - Input type (`'string'`, `'boolean'`, `'number'`, `'choice'`)
- `options` - Available choices (only for `type: 'choice'`)

#### `.output(name: string, config: OutputConfig): LocalActionBuilder`

Defines an output value.

```typescript
createLocalAction()
  .output('cache-hit', {
    description: 'Whether the cache was hit',
    value: '${{ steps.cache.outputs.cache-hit }}'
  })
```

---

### Runtime

#### `.using(runtime: 'composite' | 'node20' | 'node16' | 'docker'): LocalActionBuilder`

Sets the action runtime.

```typescript
createLocalAction().using('composite')  // Composite action
createLocalAction().using('node20')     // Node.js 20 action
createLocalAction().using('docker')     // Docker action
```

#### `.main(entrypoint: string): LocalActionBuilder`

Sets the main entry point (for Node.js actions).

```typescript
createLocalAction()
  .using('node20')
  .main('dist/index.js')
```

#### `.image(image: string): LocalActionBuilder`

Sets the Docker image (for Docker actions).

```typescript
createLocalAction()
  .using('docker')
  .image('Dockerfile')
// Or use a pre-built image
  .image('docker://node:20')
```

---

### Steps (Composite Actions)

#### `.step(callback: (step: ActionStepBuilder) => ActionStepBuilder): LocalActionBuilder`

Adds a step to a composite action.

```typescript
createLocalAction()
  .using('composite')
  .step(step =>
    step.name('Install dependencies')
      .run('npm install')
  )
```

#### `.run(commands: string | string[]): LocalActionBuilder`

Shorthand for adding a run step.

```typescript
createLocalAction()
  .run([
    'npm ci',
    'npm run build',
    'npm test'
  ])
```

---

### Branding

#### `.branding(config: { icon?: string; color?: string }): LocalActionBuilder`

Sets action branding (for Marketplace).

```typescript
createLocalAction()
  .branding({
    icon: 'package',
    color: 'blue'
  })
```

---

### File Output

#### `.filename(filename: string): LocalActionBuilder`

Sets a custom output path (relative to actions directory).

```typescript
createLocalAction()
  .name('my-action')
  .filename('custom/path/my-action')
// Creates: .github/actions/custom/path/my-action/action.yml
```

---

## Operations

High-level programmatic operations for working with workflows.

### `synth()`

Synthesizes workflows and local actions from TypeScript files.

```typescript
import { synth } from '@flughafen/core';

const result = await synth({
  files: ['workflows/ci.ts'],
  outputDir: '.github',
  workflowsDir: '.github/workflows',
  actionsDir: '.github/actions'
});

console.log(result.workflows);  // Generated workflow files
console.log(result.actions);    // Generated action files
```

### `validate()`

Validates workflow files comprehensively.

```typescript
import { validate } from '@flughafen/core';

const result = await validate({
  files: ['workflows/*.ts'],
  strict: true,
  verbose: true
});

if (!result.valid) {
  console.error('Validation failed:', result.errors);
}
```

**Validation includes:**
- TypeScript compilation
- Workflow structure validation
- Security best practices
- GitHub Actions expression validation
- Job dependency analysis

### `generateTypes()`

Generates TypeScript type definitions for GitHub Actions.

```typescript
import { generateTypes } from '@flughafen/core';

await generateTypes({
  workflowFiles: ['workflows/**/*.ts'],
  outputFile: 'flughafen-actions.d.ts',
  includeJsDoc: true
});
```

---

## Validation

### WorkflowValidator

Comprehensive workflow validation system.

```typescript
import { WorkflowValidator } from '@flughafen/core';

const validator = new WorkflowValidator();

// Validate a single file
const fileResult = await validator.validateFile('workflows/ci.ts');

// Validate multiple files
const result = await validator.validateFiles(['workflows/*.ts']);

// Custom validators
validator.registerValidator({
  name: 'custom-validator',
  validate: async (file) => {
    // Custom validation logic
    return { valid: true, errors: [] };
  }
});
```

### Validation Options

```typescript
const result = await validate({
  files: ['workflows/**/*.ts'],
  strict: true,              // Fail on warnings
  verbose: true,             // Detailed output
  skipCompilation: false,    // Skip TypeScript compilation
  skipSecurity: false,       // Skip security checks
  skipBestPractices: false   // Skip best practices checks
});
```

---

## Type Generation

### Schema System

Flughafen includes a sophisticated schema system for generating TypeScript types.

#### ActionSchemaFetcher

Fetches action schemas from GitHub repositories.

```typescript
import { ActionSchemaFetcher } from '@flughafen/core';

const fetcher = new ActionSchemaFetcher({
  githubToken: process.env.GITHUB_TOKEN
});

const schema = await fetcher.fetchActionSchema('actions/checkout', 'v4');
```

#### TypeGenerator

Generates TypeScript type definitions from schemas.

```typescript
import { TypeGenerator } from '@flughafen/core';

const generator = new TypeGenerator();
const types = generator.generateActionTypes(schemas);
```

---

## Processing

### WorkflowProcessor

Processes workflow files in a secure sandbox.

```typescript
import { WorkflowProcessor } from '@flughafen/core';

const processor = new WorkflowProcessor();

const result = await processor.processFile('workflows/ci.ts', {
  basePath: '.github',
  timeout: 30000  // 30 seconds
});

console.log(result.workflow);  // Generated workflow
console.log(result.actions);   // Generated actions
```

---

## Utility Functions

### String Utilities

```typescript
import { toKebabCase, toCamelCase, normalizeToKebabCase } from '@flughafen/core';

toKebabCase('myJobName')  // 'my-job-name'
toCamelCase('my-job-name')  // 'myJobName'

// Normalizes object keys to kebab-case
normalizeToKebabCase({
  nodeVersion: '20',
  packageManager: 'npm'
})
// { 'node-version': '20', 'package-manager': 'npm' }
```

### Error Handling

```typescript
import {
  FlughafenError,
  BuilderConfigurationError,
  CompilationError,
  ValidationError
} from '@flughafen/core';

try {
  // Workflow code
} catch (error) {
  if (error instanceof BuilderConfigurationError) {
    console.error('Configuration error:', error.message);
    console.error('Context:', error.context);
    console.error('Suggestions:', error.suggestions);
  }
}
```

---

## Type Definitions

### Core Types

```typescript
// Workflow configuration
interface WorkflowConfig {
  name?: string;
  'run-name'?: string;
  on: EventsConfig;
  jobs: Record<string, JobConfig>;
  permissions?: PermissionsConfig;
  env?: EnvConfig;
  concurrency?: ConcurrencyConfig;
  defaults?: DefaultsConfig;
}

// Job configuration
interface JobConfig {
  name?: string;
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  permissions?: PermissionsConfig;
  environment?: EnvironmentConfig;
  concurrency?: ConcurrencyConfig;
  outputs?: Record<string, string>;
  env?: EnvConfig;
  defaults?: DefaultsConfig;
  steps?: StepConfig[];
  'timeout-minutes'?: number;
  strategy?: StrategyConfig;
  'continue-on-error'?: boolean;
  container?: string | ContainerConfig;
  services?: Record<string, ServiceConfig>;
}

// Permissions
type PermissionsConfig =
  | 'read-all'
  | 'write-all'
  | {
      actions?: Permission;
      checks?: Permission;
      contents?: Permission;
      deployments?: Permission;
      issues?: Permission;
      packages?: Permission;
      'pull-requests'?: Permission;
      'repository-projects'?: Permission;
      'security-events'?: Permission;
      statuses?: Permission;
    };

type Permission = 'read' | 'write' | 'none';
```

---

## Next Steps

- **[Tutorial](./tutorial.md)** - Learn with step-by-step examples
- **[Home](./index)** - Project overview and quick start
- **[Examples](./examples)** - Real-world workflow examples

---

**Need help?** [File an issue](https://github.com/jpwesselink/flughafen/issues).
