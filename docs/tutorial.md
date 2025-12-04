# Flughafen Tutorial: Building Your First Workflow

This tutorial will guide you through creating GitHub Actions workflows with Flughafen, from basic concepts to advanced features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Workflow](#your-first-workflow)
3. [Working with Jobs](#working-with-jobs)
4. [Configuring Steps](#configuring-steps)
5. [Using Actions](#using-actions)
6. [Matrix Builds](#matrix-builds)
7. [Local Custom Actions](#local-custom-actions)
8. [Advanced Patterns](#advanced-patterns)
9. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Basic understanding of GitHub Actions concepts

### Installation

```bash
npm install flughafen
# or
pnpm add flughafen
```

### Project Setup

Create a new directory for your workflows:

```bash
mkdir -p workflows
cd workflows
```

Create a `tsconfig.json` for TypeScript support:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## Your First Workflow

Let's create a simple CI workflow that runs tests on every push to `main`.

### Step 1: Create the Workflow File

Create `workflows/ci.ts`:

```typescript
import { createWorkflow } from 'flughafen';

export default createWorkflow()
  .name('Continuous Integration')
  .on('push', { branches: ['main'] })
  .job('test', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout code')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Run tests')
          .run('npm test')
      )
  );
```

### Step 2: Generate the YAML

```bash
npx flughafen build workflows/ci.ts
```

This creates `.github/workflows/ci.yml`:

```yaml
name: Continuous Integration
on:
  push:
    branches:
      - main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

**🎉 Congratulations!** You've created your first workflow with Flughafen.

---

## Working with Jobs

Jobs are independent units of work that run in parallel by default.

### Single Job Example

```typescript
createWorkflow()
  .name('Simple Build')
  .on('push')
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step => step.run('npm run build'))
  );
```

### Multiple Jobs

```typescript
createWorkflow()
  .name('Build and Deploy')
  .on('push', { branches: ['main'] })
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step => step.name('Build').run('npm run build'))
  )
  .job('deploy', job =>
    job
      .runsOn('ubuntu-latest')
      .needs('build')  // Wait for build job to complete
      .step(step => step.name('Deploy').run('npm run deploy'))
  );
```

### Job Dependencies

Control job execution order with `.needs()`:

```typescript
createWorkflow()
  .job('lint', job => job.runsOn('ubuntu-latest'))
  .job('test', job => job.runsOn('ubuntu-latest'))
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .needs(['lint', 'test'])  // Runs after both complete
  )
  .job('deploy', job =>
    job
      .runsOn('ubuntu-latest')
      .needs('build')  // Runs after build completes
  );
```

### Conditional Jobs

Run jobs only when conditions are met:

```typescript
createWorkflow()
  .job('deploy', job =>
    job
      .runsOn('ubuntu-latest')
      .if("github.ref == 'refs/heads/main'")  // Only on main branch
      .step(step => step.run('npm run deploy'))
  );
```

---

## Configuring Steps

Steps are the individual tasks that make up a job.

### Running Commands

```typescript
.step(step =>
  step
    .name('Install and test')
    .run('npm ci && npm test')
)
```

### Running Multiple Commands

```typescript
.step(step =>
  step
    .name('Build application')
    .runCommands([
      'npm ci',
      'npm run build',
      'npm run package'
    ])
)
```

### Step Configuration Options

```typescript
.step(step =>
  step
    .name('Deploy')
    .id('deploy-step')  // Reference outputs with steps.deploy-step.outputs.xxx
    .run('npm run deploy')
    .shell('bash')
    .workingDirectory('./packages/app')
    .env({ NODE_ENV: 'production' })
    .continueOnError(true)  // Don't fail the job if this step fails
    .timeoutMinutes(10)
    .if("success()")  // Only run if previous steps succeeded
)
```

---

## Using Actions

GitHub Actions are reusable units of code from the GitHub Marketplace or your repository.

### Basic Action Usage

```typescript
.step(step =>
  step.name('Checkout')
    .uses('actions/checkout@v4')
)
```

### Action with Inputs - Shorthand Form

```typescript
.step(step =>
  step.name('Setup Node.js')
    .uses('actions/setup-node@v4', {
      'node-version': '20',
      'cache': 'npm'
    })
)
```

### Action with Inputs - Callback Form (Recommended)

The callback form provides better scoping and allows chaining `.with()` and `.env()`:

```typescript
.step(step =>
  step.name('Setup Node.js')
    .uses('actions/setup-node@v4', action =>
      action
        .with({
          'node-version': '20',
          'cache': 'npm',
          'registry-url': 'https://registry.npmjs.org'
        })
        .env({
          NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}'
        })
    )
)
```

### Type-Safe Actions (with generated types)

First, generate types for the actions you use:

```bash
npx flughafen generate types
```

Now you get full autocomplete and validation:

```typescript
.step(step =>
  step.uses('actions/checkout@v4', action =>
    action.with({
      repository: 'owner/repo',     // ✅ Autocomplete
      ref: 'main',                  // ✅ Type-checked
      'fetch-depth': 1,             // ✅ Validated
      'sparse-checkout': 'src/'     // ✅ All options available
      // invalidProp: 'test'        // ❌ TypeScript error!
    })
  )
)
```

---

## Matrix Builds

Test across multiple versions, operating systems, or configurations.

### Basic Matrix

```typescript
createWorkflow()
  .name('Matrix Test')
  .on('push')
  .job('test', job =>
    job
      .runsOn('${{ matrix.os }}')
      .strategy({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['18', '20', '22']
        }
      })
      .step(step =>
        step.name('Checkout')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Setup Node.js ${{ matrix.node-version }}')
          .uses('actions/setup-node@v4', action =>
            action.with({ 'node-version': '${{ matrix.node-version }}' })
          )
      )
      .step(step =>
        step.name('Test')
          .run('npm test')
      )
  );
```

This creates **9 jobs** (3 OS × 3 Node versions).

### Matrix with Includes

Add specific configurations:

```typescript
.strategy({
  matrix: {
    os: ['ubuntu-latest', 'windows-latest'],
    'node-version': ['18', '20']
  },
  include: [
    {
      os: 'ubuntu-latest',
      'node-version': '22',
      experimental: true
    }
  ]
})
```

### Matrix with Excludes

Skip specific combinations:

```typescript
.strategy({
  matrix: {
    os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    'node-version': ['18', '20']
  },
  exclude: [
    {
      os: 'macos-latest',
      'node-version': '18'  // Skip Node 18 on macOS
    }
  ],
  'fail-fast': false,  // Continue even if one job fails
  'max-parallel': 3    // Run max 3 jobs at once
})
```

---

## Local Custom Actions

Create reusable actions within your repository.

### Creating a Local Action

```typescript
import { createLocalAction } from 'flughafen';

const setupNodeEnv = createLocalAction()
  .name('setup-node-env')
  .description('Setup Node.js environment with caching')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '20'
  })
  .input('package-manager', {
    description: 'Package manager to use',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm'],
    default: 'npm'
  })
  .output('cache-hit', {
    description: 'Whether dependencies were cached',
    value: '${{ steps.cache.outputs.cache-hit }}'
  })
  .using('composite')
  .step(step =>
    step.name('Setup Node.js')
      .uses('actions/setup-node@v4', action =>
        action.with({
          'node-version': '${{ inputs.node-version }}',
          'cache': '${{ inputs.package-manager }}'
        })
      )
  )
  .step(step =>
    step.name('Install dependencies')
      .id('install')
      .run('${{ inputs.package-manager }} install')
  );
```

### Using Local Actions in Workflows

```typescript
import { createWorkflow } from 'flughafen';
import { setupNodeEnv } from './actions/setup-node-env';

export default createWorkflow()
  .name('CI with Local Action')
  .on('push')
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step =>
        step.name('Setup environment')
          .uses(setupNodeEnv, action =>
            action.with({
              'node-version': '20',
              'package-manager': 'pnpm'
            })
          )
      )
      .step(step =>
        step.name('Build')
          .run('pnpm run build')
      )
  );
```

### What Gets Generated

When you run `flughafen build`, two files are created:

1. `.github/workflows/ci.yml` - The workflow file
2. `.github/actions/setup-node-env/action.yml` - The local action

The workflow references the action as `./actions/setup-node-env`.

---

## Advanced Patterns

### Workflow Dispatch with Inputs

Create manually-triggered workflows:

```typescript
createWorkflow()
  .name('Manual Deploy')
  .on('workflow_dispatch', {
    inputs: {
      environment: {
        description: 'Deployment environment',
        required: true,
        type: 'choice',
        options: ['dev', 'staging', 'prod']
      },
      version: {
        description: 'Version to deploy',
        required: true,
        type: 'string'
      },
      dry_run: {
        description: 'Run in dry-run mode',
        type: 'boolean',
        default: false
      }
    }
  })
  .job('deploy', job =>
    job
      .runsOn('ubuntu-latest')
      .environment({ name: '${{ inputs.environment }}' })
      .step(step =>
        step.name('Deploy ${{ inputs.version }} to ${{ inputs.environment }}')
          .run('echo "Deploying version ${{ inputs.version }}"')
      )
  );
```

### Scheduled Workflows

Run workflows on a schedule:

```typescript
createWorkflow()
  .name('Nightly Build')
  .on('schedule', [
    { cron: '0 2 * * *' }      // Every day at 2 AM UTC
  ])
  .job('build', job =>
    job.runsOn('ubuntu-latest')
      .step(step => step.run('npm run build'))
  );
```

### Reusable Workflows

Create workflows that can be called by other workflows:

```typescript
// reusable-deploy.ts
createWorkflow()
  .name('Reusable Deploy')
  .on('workflow_call', {
    inputs: {
      environment: {
        description: 'Target environment',
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
  .job('deploy', job =>
    job
      .environment({ name: '${{ inputs.environment }}' })
      .step(step =>
        step.run('deploy.sh')
          .env({ DEPLOY_TOKEN: '${{ secrets.deploy_token }}' })
      )
  );
```

Call it from another workflow:

```typescript
createWorkflow()
  .name('Deploy to Production')
  .on('release', { types: ['published'] })
  .job('deploy-prod', job =>
    job.uses('./.github/workflows/reusable-deploy.yml', {
      environment: 'production',
      secrets: { deploy_token: '${{ secrets.PROD_DEPLOY_TOKEN }}' }
    })
  );
```

### Environment Protection

Use environments with protection rules:

```typescript
.job('deploy', job =>
  job
    .runsOn('ubuntu-latest')
    .environment({
      name: 'production',
      url: 'https://example.com'
    })
    .step(step => step.run('npm run deploy'))
)
```

### Concurrency Control

Prevent concurrent workflow runs:

```typescript
createWorkflow()
  .name('Deploy')
  .concurrency({
    group: 'production-deploy',
    'cancel-in-progress': false  // Queue instead of canceling
  })
  .job('deploy', job => /* ... */)
```

---

## Best Practices

### 1. Use Type-Safe Actions

Always generate types for better IntelliSense:

```bash
npx flughafen generate types
```

### 2. Use the Callback Form for Actions

Prefer the callback form for better scoping:

```typescript
// ✅ Good - callback form
.uses('actions/setup-node@v4', action =>
  action.with({ 'node-version': '20' })
)

// ❌ Less clear - shorthand form
.uses('actions/setup-node@v4', { 'node-version': '20' })
```

### 3. Name Your Steps

Always name steps for better debugging:

```typescript
.step(step =>
  step.name('Install dependencies')  // ✅ Named
    .run('npm ci')
)
```

### 4. Use Local Actions for Reusable Logic

Extract common patterns into local actions:

```typescript
// ✅ Reusable across workflows
const setupEnv = createLocalAction()
  .name('setup-env')
  /* ... */;

// Use in multiple workflows
workflow1.job('test', job => job.step(step => step.uses(setupEnv)));
workflow2.job('build', job => job.step(step => step.uses(setupEnv)));
```

### 5. Validate Before Deploying

Always validate your workflows:

```bash
npx flughafen validate workflows/*.ts --strict
```

### 6. Pin Action Versions

Use specific versions or commit SHAs:

```typescript
// ✅ Pinned to specific version
.uses('actions/checkout@v4')

// ✅ Pinned to commit SHA
.uses('actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab')

// ❌ Avoid floating tags
.uses('actions/checkout@main')
```

### 7. Use Environment Variables Wisely

Define variables at the appropriate scope:

```typescript
createWorkflow()
  .env({ GLOBAL_VAR: 'value' })  // Workflow-level
  .job('build', job =>
    job
      .env({ JOB_VAR: 'value' })  // Job-level
      .step(step =>
        step.env({ STEP_VAR: 'value' })  // Step-level
          .run('echo $STEP_VAR')
      )
  )
```

### 8. Handle Secrets Securely

Never hardcode secrets:

```typescript
// ❌ NEVER do this
.env({ API_KEY: 'secret-key-12345' })

// ✅ Use GitHub Secrets
.env({ API_KEY: '${{ secrets.API_KEY }}' })
```

### 9. Use Conditions Wisely

Optimize with conditional execution:

```typescript
.job('deploy', job =>
  job
    .if("github.ref == 'refs/heads/main'")  // Only on main
    /* ... */
)

.step(step =>
  step
    .if("success()")  // Only if previous steps succeeded
    /* ... */
)
```

### 10. Organize Workflow Files

Structure your workflows logically:

```
workflows/
├── ci.ts              # Continuous integration
├── deploy.ts          # Deployment workflows
├── release.ts         # Release automation
└── actions/
    ├── setup-env.ts   # Local actions
    └── deploy.ts
```

---

## Next Steps

Now that you've completed the tutorial, you can:

1. **Explore the [API Reference](./api.md)** for complete documentation
2. **Check the [examples](./examples)** page for real-world patterns
3. **Read about [validation](./api.md#validation)** to catch errors early
4. **Learn about [type generation](./api.md#type-generation)** for better IntelliSense
5. **Contribute** to Flughafen on GitHub

---

## Getting Help

- 📖 [API Reference](./api.md)
- 📂 [Examples](./examples)
- 🐛 [Issue Tracker](https://github.com/jpwesselink/flughafen/issues)

Happy workflow building! 🛫
