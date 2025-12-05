# Flughafen Examples

This directory contains examples demonstrating how to use flughafen to create GitHub Actions workflows.

## Basic Usage

### Running Examples

To preview what files would be generated:
```bash
flughafen synth examples/basic-usage.ts --dry-run
```

To generate files to the `.github` directory:
```bash
flughafen synth examples/basic-usage.ts -d .github
```

To generate files to a custom directory:
```bash
flughafen synth examples/basic-usage.ts -d ci
```

### Available Examples

- **`very-basic.ts`** - Minimal example perfect for getting started:
  - Simple workflow with checkout, Node.js setup, install, and test
  - Uses external GitHub Actions with configuration
  - Demonstrates the absolute basics

- **`simple-local-action.ts`** - Introduction to local actions:
  - Creating a reusable local action
  - Using the local action in multiple jobs
  - Type-safe action configuration

- **`basic-usage.ts`** - Comprehensive intermediate example showing:
  - Creating workflows with the fluent API
  - Defining local custom actions
  - Type-safe local actions with generics
  - Using matrix strategies
  - Setting up CI/CD pipelines
  - Multiple jobs with dependencies

- **`advanced-triggers.ts`** - Complete trigger reference:
  - All supported GitHub workflow triggers
  - Event-specific configurations
  - Scheduled and manual workflows
  - workflow_call for reusable workflows

## Key Concepts Demonstrated

### 1. Local Actions
```typescript
const setupAction = createLocalAction()
  .name('setup-node-env')
  .description('Setup Node.js environment with dependency caching')
  .input('node-version', { default: '18' })
  .using('composite')
  .steps([...]);
```

### 2. Workflow Creation
```typescript
const workflow = createWorkflow()
  .name('CI Pipeline')
  .on('push', { branches: ['main'] })
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => step.uses(setupAction))
  );
```

### 3. Matrix Strategies
```typescript
.strategy({
  matrix: {
    'node-version': ['16', '18', '20']
  }
})
```

### 4. Conditional Steps
```typescript
.if('${{ github.event_name == \'push\' }}')
```

## Generated Output

When you run the `synth` command, flughafen will generate:

- **Workflow files**: `.github/workflows/*.yml` (or custom directory)
- **Action files**: `.github/actions/*/action.yml` (or custom directory)
- **Correct relative paths**: Actions are referenced with proper relative paths regardless of output directory structure

## Learn More

- Check the main [README.md](../README.md) for installation and setup
- See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for technical details
