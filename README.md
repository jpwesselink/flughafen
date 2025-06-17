# Flughafen 🛫

> Type-Safe GitHub Actions Workflow Builder

A modern, type-safe TypeScript library for building GitHub Actions workflows programmatically. Choose between two powerful APIs: a linear fluent interface or an explicit callback-based approach.

## Features

- ✅ **Type-Safe**: Full TypeScript support with auto-generated types from GitHub Actions schema
- ✅ **Dual APIs**: Choose between linear fluent API or callback-based scoped API
- ✅ **Context-Safe**: Prevents inappropriate method calls through proper scoping
- ✅ **Comprehensive**: Supports all GitHub Actions workflow features
- ✅ **Validated**: Built-in validation ensures valid workflow generation
- ✅ **Modern**: Uses latest TypeScript features and best practices
- ✅ **Tested**: Comprehensive test suite with extensive coverage

## Installation

```bash
pnpm add flughafen
# or
npm install flughafen
# or
yarn add flughafen
```

## Quick Start

### Original API (Linear, Fluent Interface)

Perfect for simple, linear workflows:

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  .name('Simple CI')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test')
    .runsOn('ubuntu-latest')
    .step()
      .name('Checkout')
      .checkout()
    .step()
      .name('Setup Node.js')
      .setupNode({ with: { 'node-version': '18' } })
    .step()
      .name('Install dependencies')
      .run('npm ci')
    .step()
      .name('Run tests')
      .run('npm test');

// Generate YAML - auto-completes everything!
console.log(workflow.toYAML());
```

### Callback API (Explicit Scoping)

Perfect for complex workflows with multiple jobs:

```typescript
import { createCallbackWorkflow } from 'flughafen';

const workflow = createCallbackWorkflow()
  .name('CI/CD Pipeline')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '18' } })
       )
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  )
  .job('deploy', job =>
    job.needs('test')
       .runsOn('ubuntu-latest')
       .if('github.ref == \'refs/heads/main\'')
       .step(step => step.checkout())
       .step(step =>
         step.name('Deploy')
             .run('npm run deploy')
       )
  );

console.log(workflow.toYAML());
```

## API Comparison

| Feature | Original API | Callback API |
|---------|-------------|--------------|
| **Best for** | Simple, linear workflows | Complex, multi-job workflows |
| **Structure** | Flat chaining | Explicit nesting |
| **Type Safety** | ✅ Context-aware | ✅ Scoped callbacks |
| **Readability** | Good for simple cases | Excellent for complex cases |
| **Misuse Prevention** | ✅ Fixed context switching | ✅ Impossible to escape scope |

## Why Two APIs?

The callback-based API was introduced to solve a fundamental issue: **context switching confusion**. 

```typescript
// ❌ This was possible before (confusing!)
createWorkflow()
  .job('test')
  .step()
  .job('another') // Wrong context!

// ✅ Now both APIs prevent this:

// Original API - only .toYAML() completes
createWorkflow()
  .job('test')
  .step()
  .toYAML() // ✅ Only valid completion

// Callback API - explicit scope boundaries
createCallbackWorkflow()
  .job('test', job => {
    // Only job methods available here
    return job.step(step => {
      // Only step methods available here
      return step.checkout();
    });
  });
```
## API Reference

### Original API

The original API provides a linear, fluent interface:

```typescript
import { createWorkflow } from 'flughafen';

createWorkflow()
  .name('My Workflow')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test')
    .runsOn('ubuntu-latest')
    .strategy({ matrix: { 'node-version': ['16', '18', '20'] } })
    .step().checkout()
    .step().setupNode({ with: { 'node-version': '${{ matrix.node-version }}' } })
    .step().run('npm ci')
    .step().run('npm test')
  .toYAML(); // Complete the workflow
```

### Callback API

The callback API provides explicit scoping and structure:

```typescript
import { createCallbackWorkflow } from 'flughafen';

createCallbackWorkflow()
  .name('My Workflow')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .strategy({ matrix: { 'node-version': ['16', '18', '20'] } })
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '${{ matrix.node-version }}' } })
       )
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  )
  .toYAML(); // Complete the workflow
```

### Common Methods

Both APIs support the same workflow features:

**Triggers:**
- `.onPush(config?)` - Push events
- `.onPullRequest(config?)` - Pull request events  
- `.onSchedule(cron)` - Scheduled events
- `.onWorkflowDispatch(inputs?)` - Manual dispatch

**Job Configuration:**
- `.runsOn(runner)` - Set runner
- `.needs(jobId)` - Job dependencies
- `.strategy(config)` - Matrix strategies
- `.if(condition)` - Conditional execution
- `.env(variables)` - Environment variables
- `.permissions(perms)` - Job permissions

**Step Actions:**
- `.checkout()` - Checkout repository
- `.setupNode(config)` - Setup Node.js
- `.run(command)` - Run shell command
- `.uses(action)` - Use an action
- `.with(inputs)` - Action inputs
- `.name(name)` - Step name

## Examples

### Original API - Simple Workflow

```typescript
import { createWorkflow } from 'flughafen';

const simple = createWorkflow()
  .name('Simple CI')
  .onPush()
  .onPullRequest()
  .job('test')
    .runsOn('ubuntu-latest')
    .step().checkout()
    .step().setupNode({ with: { 'node-version': '18' } })
    .step().run('npm ci')
    .step().run('npm test');

console.log(simple.toYAML());
```

### Callback API - Multi-Job Pipeline

```typescript
import { createCallbackWorkflow } from 'flughafen';

const pipeline = createCallbackWorkflow()
  .name('CI/CD Pipeline')
  .onPush({ branches: ['main'] })
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => step.setupNode({ with: { 'node-version': '18' } }))
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  )
  .job('build', job =>
    job.needs('test')
       .runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => step.setupNode({ with: { 'node-version': '18' } }))
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm run build'))
  )
  .job('deploy', job =>
    job.needs('build')
       .runsOn('ubuntu-latest')
       .if('github.ref == \'refs/heads/main\'')
       .step(step => step.checkout())
       .step(step =>
         step.name('Deploy to production')
             .run('npm run deploy')
             .env({ DEPLOY_TOKEN: '${{ secrets.DEPLOY_TOKEN }}' })
       )
  );

console.log(pipeline.toYAML());
```

### Matrix Strategy

```typescript
// Original API
const matrix = createWorkflow()
  .name('Cross-platform Tests')
  .onPush()
  .job('test')
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        'node-version': ['16', '18', '20']
      }
    })
    .runsOn('${{ matrix.os }}')
    .step().checkout()
    .step().setupNode({ with: { 'node-version': '${{ matrix.node-version }}' } })
    .step().run('npm ci')
    .step().run('npm test');

// Callback API
const matrixCallback = createCallbackWorkflow()
  .name('Cross-platform Tests')
  .onPush()
  .job('test', job =>
    job.strategy({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['16', '18', '20']
        }
      })
       .runsOn('${{ matrix.os }}')
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '${{ matrix.node-version }}' } })
       )
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  );
```

## Validation

Both APIs include built-in validation:

```typescript
// Validate without throwing
const result = workflow.validate();
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}

// Generate YAML with validation options
workflow.toYAML({ 
  validate: true,     // Enable validation (default: true)
  throwOnError: false // Don't throw, just warn (default: true)
});
```

## Preset Workflows

Use pre-built workflow templates:

```typescript
import { presets } from 'flughafen';

// Node.js CI preset
const nodeCI = presets.nodeCI('Node CI', {
  branches: ['main', 'develop'],
  nodeVersions: ['18', '20'],
  runners: ['ubuntu-latest']
});

console.log(nodeCI.toYAML());
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Run examples
pnpm tsx examples/usage.ts
pnpm tsx examples/callback-examples.ts
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all tests pass.

## License

MIT

