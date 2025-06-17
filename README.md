# Flughafen 🛫

> Type-Safe GitHub Actions Workflow Builder

A modern, type-safe TypeScript library for building GitHub Actions# Use in your workflow
createWorkflow()orkflows programmatically. Features a clean, fluent API with function-based configuration that prevents context switching errors and provides ex# Use in your workflow
.step(step => 
  step.uses('actions/checkout@v4')
    .with(checkoutInputs)
)nt TypeScript intellisense.

## ✨ Key Features

- 🎯 **Function-Based API**: Clean, scoped configuration with fluent interface
- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Context-Safe**: Prevents inappropriate method calls through proper scoping
- 📦 **Comprehensive**: Supports all GitHub Actions workflow features
- ✅ **Validated**: Built-in validation ensures valid workflow generation
- 🚀 **Modern**: Uses latest TypeScript features and best practices
- 🧪 **Tested**: Comprehensive test suite with extensive coverage
- 🏗️ **Action Builders**: Generate type-safe builders for any GitHub Action
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
          .uses('actions/setup-node@v4')
          .with({ 'node-version': '18' })
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

### Type-Safe Action Builders

Generate type-safe builders for any GitHub Action:

```bash
# Generate builders for common actions
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts aws-actions/configure-aws-credentials@v4
```

```typescript
// Use the generated builders
import { CheckoutInputsBuilder_v4 } from './generated/CheckoutInputsBuilder_v4';
import { SetupNodeInputsBuilder_v4 } from './generated/SetupNodeInputsBuilder_v4';

// ✅ Type-safe, with autocomplete and validation
const checkoutInputs = new CheckoutInputsBuilder_v4()
  .repository('owner/repo')
  .ref('main')
  .fetchDepth(1)                    // Correct type (number)
  .submodules('recursive')          // Enum validation
  .build();

const nodeInputs = new SetupNodeInputsBuilder_v4()
  .nodeVersion('18')
  .cache('npm')                     // Autocomplete available
  .registryUrl('https://registry.npmjs.org')
  .build();

// Use in your workflow
createWorkflow()
  .job('build', job =>
    job.step(step => 
      step.uses('actions/checkout@v4')
        .with(checkoutInputs)         // ✅ Fully typed
    )
    .step(step =>
      step.uses('actions/setup-node@v4')
        .with(nodeInputs)
    )
  );
```

Generated builders provide:
- ✅ **Full TypeScript type safety** with proper types (string, number, boolean)
- ✅ **IDE autocomplete** for all available inputs  
- ✅ **Compile-time validation** of parameters
- ✅ **CamelCase method names** for better developer experience
- ✅ **Versioned filenames** to prevent conflicts (`CheckoutInputsBuilder_v4.ts`)
- ✅ **Automatic output** to `generated/` directory

## API Reference

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  // Basic configuration
  .name('My Workflow')
  .runName('Custom run name')
  
  // Triggers
  .onPush({ branches: ['main'] })
  .onPullRequest({ types: ['opened', 'synchronize'] })
  .onSchedule('0 2 * * *')
  .onWorkflowDispatch({
    environment: {
      description: 'Environment to deploy to',
      required: true,
      type: 'choice',
      options: ['dev', 'staging', 'prod']
    }
  })
  
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
    
    // Actions
    .uses('actions/checkout@v4')
    .with({
      repository: 'owner/repo',
      ref: 'main'
    })
    
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

- **`callback-api.ts`** - Advanced workflow examples with complex pipelines  
- **`callback-examples.ts`** - Additional workflow patterns and use cases
- **`action-input-builders.ts`** - Using generated type-safe action input builders

### Running Examples

```bash
# Run examples to see the generated YAML
pnpm exec tsx examples/callback-api.ts
pnpm exec tsx examples/callback-examples.ts
pnpm exec tsx examples/action-input-builders.ts
```
## Action Builders

Generate type-safe builders for any GitHub Action:

```bash
# Generate a builder for any GitHub Action
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts aws-actions/configure-aws-credentials@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts docker/setup-buildx-action@v3
```

This creates builders in the `generated/` directory:

```typescript
// Example: Using the generated checkout builder
import { CheckoutInputsBuilder_v4 } from './generated/CheckoutInputsBuilder_v4';

const checkoutInputs = new CheckoutInputsBuilder_v4()
  .repository('owner/repo')
  .ref('main')
  .fetchDepth('1')
  .token('${{ secrets.GITHUB_TOKEN }}')
  .build();

// Use in your workflow
.step(step => {
  step.uses('actions/checkout@v4')
    .with(checkoutInputs);
})
```

## Factory Functions

Use pre-built workflow templates:

```typescript
import { createCIWorkflow } from 'flughafen';

// Quick CI workflow setup
const nodeCI = createCIWorkflow('Node.js CI', {
  branches: ['main', 'develop'],
  nodeVersion: '18',
  runner: 'ubuntu-latest'
});

console.log(nodeCI.toYAML());
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

# Build
pnpm build

# Generate action builders
pnpm exec tsx scripts/generateActionInputBuilder.ts <action-reference>
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all tests pass.

## License

MIT

