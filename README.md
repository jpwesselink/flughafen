# Flughafen 🛫

> Type-Safe GitHub Actions Workflow Builder

A modern, type-safe TypeScript library for building GitHub Actions workflows programmatically. Features a clean, fluent API with function-based configuration that prevents context switching errors and provides excellent TypeScript intellisense.

## ✨ Key Features

- 🎯 **Function-Based API**: Clean, scoped configuration with fluent interface
- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Context-Safe**: Prevents inapprop### CLI Features

- 🚀 **Fast Synthesis**: Quickly generate workflows and local actions
- 📁 **TypeScript Support**: Full support for TypeScript workflow files
- 💾 **File Output**: Automatically writes workflow and action files
- 🎨 **Pretty Output**: Colored, formatted output for better readability
- 🛡️ **Error Handling**: Clear error messages and validation
- 📊 **Summary**: Shows generated file count and sizes
- 🔧 **Type Generation**: Generate TypeScript types for GitHub Actions from workflowsthod calls through proper scoping
- 📦 **Comprehensive**: Supports all GitHub Actions workflow features
- ✅ **Validated**: Built-in validation ensures valid workflow generation
- 🚀 **Modern**: Uses latest TypeScript features and best practices
- 🧪 **Tested**: Comprehensive test suite with extensive coverage
- 🏗️ **Action Builders**: Generate type-safe builders for any GitHub Action
- ⚡ **Action Callbacks**: Scoped action configuration with callback form
- 🎨 **Local Actions**: Create and manage custom local actions with automatic file generation
- 📖 **Well Documented**: Rich examples and clear API documentation

## Installation

```bash
pnpm add flughafen
# or
npm install flughafen
# or
yarn add flughafen
```

## Quick Start

```typescript
import { createWorkflow } from 'flughafen';

// Clean function-based API with strict scoping
const workflow = createWorkflow()
  .name('CI Pipeline')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job => 
    job.runsOn('ubuntu-latest')
      .step(step => 
        step.name('Checkout')
          .uses('actions/checkout@v4')
      )
      .step(step => 
        step.name('Setup Node.js')
          .uses('actions/setup-node@v4', action =>
            action.with({ 
              'node-version': '18',
              'cache': 'npm' 
            })
          )
      )
      .step(step => 
        step.name('Install dependencies')
          .run('npm ci')
      )
      .step(step => 
        step.name('Run tests')
          .run('npm test')
      )
  )
  .job('deploy', job => 
    job.runsOn('ubuntu-latest')
      .needs('test')
      .if('github.ref == \'refs/heads/main\'')
      .step(step => 
        step.name('Deploy')
          .run('npm run deploy')
      )
  );

// Generate YAML
console.log(workflow.toYAML());
```
## Key Benefits

### Function-Based Architecture

Clean, scoped structure that prevents method call confusion:

```typescript
import { createWorkflow } from 'flughafen';

// ✅ Clear, scoped structure - each context has only relevant methods
createWorkflow()
  .job('test', job => 
    // Only job methods available here
    job.runsOn('ubuntu-latest')
      .step(step => 
        // Only step methods available here
        step.uses('actions/checkout@v4')
      )
  )
  .job('build', job => 
    // Each job is properly scoped
    job.needs('test')
      .runsOn('ubuntu-latest')
  );
```

### Type-Safe Action Configuration

Use the callback form for scoped action configuration:

```typescript
// Generate types from GitHub Action schemas
pnpm run generate-types

// Use type-safe action configuration
createWorkflow()
  .job('build', job =>
    job.step(step => 
      step.uses('actions/checkout@v4', action =>
        action.with({
          repository: 'owner/repo',
          ref: 'main',
          'fetch-depth': 1
        })
      )
    )
    .step(step =>
      step.uses('actions/setup-node@v4', action =>
        action.with({
          'node-version': '18',
          cache: 'npm'
        })
      )
    )
  );
```

### Local Custom Actions

Create and use local custom actions directly in your workflows:

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define a local action
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '18'
  })
  .input('cache', {
    description: 'Package manager cache',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm'],
    default: 'npm'
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

// Use in workflow
const workflow = createWorkflow()
  .name('CI with Local Actions')
  .job('build', job =>
    job.step(step =>
      step.uses(setupAction)  // ✅ Type-safe local action reference
        .with({
          'node-version': '20',
          'cache': 'npm'
        })
    )
  );

// Automatically generates:
// .github/actions/setup-environment/action.yml
// Workflow references: ./actions/setup-environment
```

**Local Actions Features:**
- ✅ **Type-safe action definitions** with inputs/outputs
- ✅ **Automatic file generation** during synthesis  
- ✅ **Composite, Node.js, Docker** action support
- ✅ **Custom directory structure** with `filename()` override
- ✅ **Reusable across workflows** 
- ✅ **Full integration** with workflow builders

## API Reference

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  // Basic configuration
  .name('My Workflow')
  .runName('Custom run name')
  
  // Triggers - Use the flexible generic on() method (NEW!)
  .on('push', { branches: ['main'] })
  .on('pull_request', { types: ['opened', 'synchronize'] })
  .on('schedule', [{ cron: '0 2 * * *' }])
  .on('workflow_dispatch', {
    inputs: {
      environment: {
        description: 'Environment to deploy to',
        required: true,
        type: 'choice',
        options: ['dev', 'staging', 'prod']
      }
    }
  })
  // Additional triggers are now possible:
  .on('release', { types: ['published'] })
  .on('issues', { types: ['opened', 'labeled'] })
  
  // Legacy specific methods (deprecated but still supported):
  // .onPush({ branches: ['main'] })
  // .onPullRequest({ types: ['opened', 'synchronize'] })
  // .onSchedule('0 2 * * *')
  
  // Global configuration
  .env({ GLOBAL_VAR: 'value' })
  .permissions({ contents: 'read', issues: 'write' })
  .concurrency({ group: 'my-group', 'cancel-in-progress': true })
  .defaults({
    run: {
      shell: 'bash',
      'working-directory': './app'
    }
  });
```

### Workflow Triggers (NEW!)

Flughafen now supports a generic `on()` method that provides maximum flexibility for workflow triggers:

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  .name('Advanced Workflow')
  
  // Generic on() method - supports any GitHub event
  .on('push', { 
    branches: ['main', 'develop'],
    paths: ['src/**', '!docs/**']
  })
  .on('pull_request', { 
    types: ['opened', 'synchronize', 'reopened'],
    branches: ['main'] 
  })
  .on('schedule', [
    { cron: '0 2 * * 1' },   // Weekly on Monday
    { cron: '0 0 1 * *' }    // Monthly on 1st
  ])
  .on('workflow_dispatch', {
    inputs: {
      environment: {
        description: 'Target environment',
        required: true,
        type: 'choice',
        options: ['dev', 'staging', 'prod']
      },
      debug: {
        description: 'Enable debug mode',
        type: 'boolean',
        default: false
      }
    }
  })
  .on('release', { types: ['published', 'prereleased'] })
  .on('issues', { types: ['opened', 'labeled'] })
  .on('workflow_call', {
    inputs: {
      environment: { 
        description: 'Environment', 
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
  // ... and many more event types!

**Event vs Schedule**: Note that `schedule` is treated separately from GitHub events because it's a time-based trigger rather than a repository event. All other triggers (`push`, `pull_request`, etc.) are actual GitHub events.

// Legacy methods are still supported (but deprecated):
// .onPush({ branches: ['main'] })
// .onPullRequest({ types: ['opened'] })
// .onSchedule('0 2 * * *')
```

**Supported Events**: `push`, `pull_request`, `schedule`, `workflow_dispatch`, `workflow_call`, `release`, `issues`, `issue_comment`, `pull_request_review`, `fork`, `watch`, `create`, `delete`, `deployment`, `deployment_status`, `repository_dispatch`, and many more!

**✨ Type Safety Benefits**: The generic `on()` method provides full TypeScript IntelliSense and type checking:

```typescript
// ✅ Type-safe push configuration
.on('push', {
  branches: ['main'],           // ✅ Correct
  paths: ['src/**'],           // ✅ Correct  
  'paths-ignore': ['docs/**']  // ✅ Correct
  // invalidProp: 'test'       // ❌ TypeScript error!
})

// ✅ Type-safe schedule configuration  
.on('schedule', [              // ✅ Must be array
  { cron: '0 2 * * *' }
])
// .on('schedule', { cron: '...' }) // ❌ TypeScript error - not array!

// ✅ Type-safe workflow dispatch inputs
.on('workflow_dispatch', {
  inputs: {
    environment: {
      description: 'Environment',
      type: 'choice',           // ✅ Correct type
      options: ['dev', 'prod'], // ✅ Required for choice type
      required: true
    }
  }
})
```

### Job Configuration

```typescript
.job('my-job', job => 
  job
    // Basic job config
    .runsOn('ubuntu-latest')
    .needs('previous-job')
    .if('github.ref == \'refs/heads/main\'')
    
    // Environment and permissions
    .env({ JOB_VAR: 'value' })
    .permissions({ contents: 'read' })
    
    // Strategy and matrix
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest'],
        'node-version': ['16', '18', '20']
      },
      'fail-fast': false
    })
    
    // Container and services
    .container('node:18')
    .services({
      postgres: {
        image: 'postgres:13',
        env: { POSTGRES_PASSWORD: 'postgres' }
      }
    })
    
    // Timeout and error handling
    .timeoutMinutes(60)
    .continueOnError(true)
    
    // Steps with clean scoping
    .step(step => 
      step.name('Checkout')
        .uses('actions/checkout@v4')
    )
    .step(step => 
      step.name('Setup Node')
        .uses('actions/setup-node@v4')
        .with({ 'node-version': '18' })
    )
    .step(step => 
      step.name('Run tests')
        .run('npm test')
        .env({ CI: 'true' })
    )
)
```

### Step Configuration

```typescript
.step(step => 
  step
    // Basic step config
    .name('My Step')
    .id('my-step')
    .if('success()')
    
    // Actions - Direct form
    .uses('actions/checkout@v4')
    .with({
      repository: 'owner/repo',
      ref: 'main'
    })
    
    // Actions - Callback form (new!)
    .uses('actions/setup-node@v4', action =>
      action.with({
        'node-version': '18',
        'cache': 'npm'
      })
      .env({
        NODE_ENV: 'production'
      })
    )
    
    // Or run commands
    .run('npm ci')
    .shell('bash')
    .workingDirectory('./app')
    
    // Environment and error handling
    .env({ STEP_VAR: 'value' })
    .continueOnError(true)
    .timeoutMinutes(10)
)
```
## Examples

### Complete Examples

Check out the `examples/` directory for comprehensive examples:

- **`basic-usage.ts`** - Complete workflow with multiple jobs and local actions
- **`simple-workflow.ts`** - Simple CI workflow example  
- **`simple-local-action.ts`** - Creating and using local actions
- **`very-basic.ts`** - Minimal workflow example

### Running Examples

```bash
# Synthesize workflows from examples
pnpm run demo:synth

# Or run individual examples
node bin/flughafen.js synth examples/basic-usage.ts
node bin/flughafen.js synth examples/simple-workflow.ts
```

## Local Custom Actions

Create and manage local custom actions with automatic file generation:

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define a reusable local action
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '18'
  })
  .input('cache', {
    description: 'Package manager cache to use',
    required: false,
    default: 'npm',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm']
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

// Use in workflow
const workflow = createWorkflow()
  .name('CI with Local Actions')
  .job('build', job =>
    job.step(step =>
      step.uses(setupAction)  // Reference local action
        .with({ 'node-version': '20', 'cache': 'npm' })
    )
  );

// Generates:
// - .github/workflows/ci.yml (references ./actions/setup-environment)
// - .github/actions/setup-environment/action.yml (the action definition)
```

**Benefits:**
- ✅ **Type-safe action definitions** with inputs/outputs validation
- ✅ **Automatic file generation** during synthesis
- ✅ **Reusable across workflows** in your repository
- ✅ **Custom directory structure** with `filename()` override
- ✅ **Support for composite, Node.js, and Docker actions**

## Type Generation

Generate TypeScript types from GitHub Action schemas:

```bash
# Fetch latest schemas from Schema Store
pnpm run fetch-schemas

# Generate TypeScript types from schemas
pnpm run generate-types

# Build the project (automatically runs generate-types)
pnpm run build

# Or use the CLI to generate types from workflow files
flughafen generate-types

# Generate types from specific workflow files
flughafen generate-types src/workflows/ci.ts src/workflows/deploy.ts
```

This creates type definitions in the `types/` directory for GitHub workflows and actions, enabling full type safety throughout the library.

## Factory Functions

Create workflows using convenience functions:

```typescript
import { createWorkflow } from 'flughafen';

// Standard workflow creation
const workflow = createWorkflow()
  .name('CI Pipeline')
  .onPush({ branches: ['main'] })
  .job('test', job => 
    job.runsOn('ubuntu-latest')
      .step(step => step.name('Test').run('npm test'))
  );
```

## Validation

Built-in validation ensures your workflows are valid:

```typescript
// Validate without throwing
const result = workflow.validate();
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}

// Generate YAML with validation options
const yaml = workflow.toYAML({ 
  validate: true,     // Enable validation (default: true)
  throwOnError: false // Don't throw, just warn (default: true)
});
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm build

# Generate types from schemas
pnpm run generate-types

# Fetch latest schemas
pnpm run fetch-schemas

# Run linter
pnpm run linter
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all tests pass.

## License

MIT

### Action Configuration with Callback Form

The new callback form for `.uses()` provides scoped action configuration:

```typescript
// Enhanced action configuration with callback form
.step(step => 
  step.name('Complex Action Setup')
    .uses('aws-actions/configure-aws-credentials@v4', action =>
      action
        .with({
          'role-to-assume': 'arn:aws:iam::123456789012:role/DeployRole',
          'aws-region': 'us-east-1',
          'role-duration-seconds': '3600'
        })
        .env({
          AWS_DEFAULT_REGION: 'us-east-1',
          DEPLOYMENT_ENV: 'production'
        })
    )
)

// Benefits of callback form:
// ✅ Scoped configuration - action inputs and env separate from step config
// ✅ Fluent API - chain action.with().env() for cleaner code
// ✅ Better readability - clear separation of concerns
// ✅ Type safety - ActionBuilder provides consistent interface
// ✅ Backward compatible - original direct form still works
```

## CLI Tool

Flughafen includes a CLI tool for synthesizing workflows:

### Installation & Usage

After installing the package, the CLI is available as `flughafen`:

```bash
# Synthesize a workflow file
flughafen synth my-workflow.ts

# Generate TypeScript types for GitHub Actions from workflows
flughafen generate-types

# Generate types from specific workflow files
flughafen generate-types workflow1.ts workflow2.ts

# Synthesize with verbose output
flughafen synth my-workflow.ts --verbose

# Synthesize without writing files (dry run)
flughafen synth my-workflow.ts --no-write
```

### CLI Features

- � **Fast Synthesis**: Quickly generate workflows and local actions
- 📁 **TypeScript Support**: Full support for TypeScript workflow files
- 💾 **File Output**: Automatically writes workflow and action files
- 🎨 **Pretty Output**: Colored, formatted output for better readability
- ️ **Error Handling**: Clear error messages and validation
- 📊 **Summary**: Shows generated file count and sizes

### Workflow File Pattern

Create workflow files that export a WorkflowBuilder:

```typescript
// my-workflow.ts
import { createWorkflow } from 'flughafen';

export default createWorkflow()
  .name('My Workflow')
  .onPush({ branches: ['main'] })
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Hello World')
      .run('echo "Hello from CLI!"')
    )
  );
```

### Development Scripts

Add CLI commands to your package.json:

```json
{
  "scripts": {
    "workflow:synth": "flughafen synth workflows/ci.ts",
    "workflow:dev": "flughafen synth workflows/ci.ts --verbose",
    "types:generate": "flughafen generate-types"
  }
}
```

### CLI Commands

#### `synth <file>`
Synthesize a workflow file into YAML and action files.

#### `generate-types [files...]`
Generate TypeScript types for GitHub Actions from workflow files. When no files are specified, scans the current directory for workflow files.

**Options:**
- `-w, --workflow-dir <dir>` - Directory containing workflow files
- `-o, --output <file>` - Output file for generated types
- `--github-token <token>` - GitHub token for private repositories
- `--no-include-jsdoc` - Exclude JSDoc comments from generated types
- `--verbose` - Verbose output
- `--silent` - Silent mode

