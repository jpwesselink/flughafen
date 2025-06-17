# Flughafen 🛫

> Fluent GitHub Actions Generator

A modern, type-safe TypeScript library for building GitHub Actions workflows programmatically. Create complex CI/CD workflows with a chainable, fluent API that provides full type safety and IntelliSense support.

## Features

- ✅ **Type-Safe**: Full TypeScript support with auto-generated types from GitHub Actions schema
- ✅ **Fluent API**: Chainable builder pattern for intuitive workflow creation
- ✅ **Comprehensive**: Supports all GitHub Actions workflow features
- ✅ **Validated**: Built-in validation ensures valid workflow generation
- ✅ **Modern**: Uses latest TypeScript features and best practices
- ✅ **Tested**: Comprehensive test suite with 100% coverage

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

const workflow = createWorkflow('CI')
  .on('push', { branches: ['main'] })
  .on('pull_request')
  .addJob('test')
    .runsOn('ubuntu-latest')
    .addStep()
      .name('Checkout')
      .uses('actions/checkout@v4')
      .build()
    .addStep()
      .name('Setup Node.js')
      .uses('actions/setup-node@v4')
      .with({ 'node-version': '18' })
      .build()
    .addStep()
      .name('Install dependencies')
      .run('npm ci')
      .build()
    .addStep()
      .name('Run tests')
      .run('npm test')
      .build()
    .build()
  .build();

// Generate YAML
console.log(workflow.toYAML());
```

## API Reference

### WorkflowBuilder

Create workflows with the main `createWorkflow()` function or use `WorkflowBuilder` directly:

```typescript
import { WorkflowBuilder, createWorkflow } from 'flughafen';

// Using factory function (recommended)
const workflow = createWorkflow('My Workflow');

// Using builder directly
const workflow = new WorkflowBuilder()
  .name('My Workflow');
```

### Triggers

Configure when your workflow runs:

```typescript
workflow
  .on('push', { branches: ['main', 'develop'] })
  .on('pull_request', { paths: ['src/**'] })
  .on('schedule', [{ cron: '0 0 * * 0' }]) // Weekly
  .on('workflow_dispatch', {
    inputs: {
      environment: {
        description: 'Environment to deploy to',
        required: true,
        default: 'staging',
        type: 'choice',
        options: ['staging', 'production']
      }
    }
  });
```

### Jobs

Add jobs with dependencies, matrix strategies, and more:

```typescript
workflow
  .addJob('build')
    .runsOn('ubuntu-latest')
    .addStep()
      .name('Build')
      .run('npm run build')
      .build()
    .build()
  .addJob('test')
    .runsOn('ubuntu-latest')
    .needs(['build'])
    .strategy({
      matrix: {
        'node-version': ['16', '18', '20']
      }
    })
    .addStep()
      .name('Test Node ${{ matrix.node-version }}')
      .run('npm test')
      .build()
    .build();
```

### Steps

Create steps with conditions, timeouts, and error handling:

```typescript
job
  .addStep()
    .name('Conditional step')
    .if('github.event_name == "push"')
    .run('echo "This runs only on push"')
    .build()
  .addStep()
    .name('Step with timeout')
    .run('long-running-command')
    .timeoutMinutes(30)
    .continueOnError(true)
    .build();
```

### Environment & Permissions

Configure global settings:

```typescript
workflow
  .env({
    NODE_ENV: 'production',
    API_URL: '${{ secrets.API_URL }}'
  })
  .permissions({
    contents: 'read',
    packages: 'write'
  })
  .defaults({
    run: {
      shell: 'bash',
      'working-directory': './app'
    }
  });
```

### Factory Functions

Use pre-configured workflow templates:

```typescript
import { createCIWorkflow } from 'flughafen';

// Basic CI workflow
const ci = createCIWorkflow({
  name: 'CI',
  nodeVersions: ['16', '18', '20'],
  branches: ['main', 'develop']
});

// Advanced CI workflow with custom options
const advanced = createCIWorkflow({
  name: 'Advanced CI',
  nodeVersions: ['18', '20'],
  branches: ['main'],
  installCommand: 'pnpm install',
  buildCommand: 'pnpm build',
  testCommand: 'pnpm test',
  os: ['ubuntu-latest', 'windows-latest', 'macos-latest']
});
```

## Examples

### Multi-Job Workflow with Dependencies

```typescript
const workflow = createWorkflow('Deploy')
  .on('push', { branches: ['main'] })
  .addJob('build')
    .runsOn('ubuntu-latest')
    .addStep()
      .uses('actions/checkout@v4')
      .build()
    .addStep()
      .run('npm ci && npm run build')
      .build()
    .build()
  .addJob('test')
    .runsOn('ubuntu-latest')
    .needs(['build'])
    .strategy({
      matrix: {
        'test-type': ['unit', 'integration', 'e2e']
      }
    })
    .addStep()
      .run('npm run test:${{ matrix.test-type }}')
      .build()
    .build()
  .addJob('deploy')
    .runsOn('ubuntu-latest')
    .needs(['test'])
    .environment('production')
    .addStep()
      .name('Deploy to production')
      .run('npm run deploy')
      .env({ DEPLOY_KEY: '${{ secrets.DEPLOY_KEY }}' })
      .build()
    .build()
  .build();
```

### Conditional Workflow with Matrix

```typescript
const workflow = createWorkflow('Cross-Platform Build')
  .on('push')
  .addJob('build')
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        'node-version': ['16', '18', '20']
      }
    })
    .runsOn('${{ matrix.os }}')
    .addStep()
      .name('Setup Node.js ${{ matrix.node-version }}')
      .uses('actions/setup-node@v4')
      .with({ 'node-version': '${{ matrix.node-version }}' })
      .build()
    .addStep()
      .name('Build on ${{ matrix.os }}')')
      .run('npm run build')
      .if('matrix.os != "windows-latest" || matrix.node-version == "18"')
      .build()
    .build()
  .build();
```

## Development

```bash
# Install dependencies
pnpm install

# Generate types from schema
pnpm run generate-types

# Build the project
pnpm run build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Your Name](./LICENSE.md)

