# Flughafen 🛫

> **Type-Safe GitHub Actions Workflow Builder for TypeScript**

Build GitHub Actions workflows with full type safety, IntelliSense support, and compile-time validation. Flughafen eliminates the pain points of YAML-based workflows by providing a fluent, programmatic API with function-based scoping that prevents context switching errors.

[![npm version](https://img.shields.io/npm/v/flughafen.svg)](https://www.npmjs.com/package/flughafen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Why Flughafen?](#-why-flughafen)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Examples](#-examples)
- [CLI Tool](#-cli-tool)
- [Type Generation](#-type-generation)
- [Local Custom Actions](#-local-custom-actions)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Why Flughafen?

**YAML workflows are hard to maintain.** You lose type safety, get no autocomplete, and errors only appear at runtime. Flughafen solves this:

| Problem | Flughafen Solution |
|---------|-------------------|
| ❌ No type safety in YAML | ✅ Full TypeScript type checking |
| ❌ No autocomplete/IntelliSense | ✅ Complete IDE support with autocomplete |
| ❌ Runtime errors only | ✅ Compile-time validation |
| ❌ Easy to mix up contexts (job vs step) | ✅ Function-based scoping prevents errors |
| ❌ Manual action input validation | ✅ Type-safe action configuration |
| ❌ Copy-paste for reusable logic | ✅ Local custom actions with type safety |

---

## ✨ Key Features

### 🎯 **Function-Based API**
Clean, scoped configuration with fluent interface that prevents context switching errors

```typescript
createWorkflow()
  .job('test', job =>
    job.runsOn('ubuntu-latest')  // ✅ Only job methods available
      .step(step =>
        step.uses('actions/checkout@v4')  // ✅ Only step methods available
      )
  )
```

### 🔒 **Type-Safe Configuration**
Full TypeScript support with comprehensive type definitions for GitHub Actions

### 🛡️ **Context-Safe**
Prevents inappropriate method calls through proper function scoping - no more calling step methods at job level!

### 📦 **Comprehensive**
Supports all GitHub Actions workflow features: triggers, jobs, steps, matrix builds, environments, permissions, and more

### ✅ **Validated**
Built-in validation ensures valid workflow generation with helpful error messages

### 🧪 **Well-Tested**
Comprehensive test suite with 366+ tests across 26 test suites ensuring reliability

### 🏗️ **Type-Safe Actions**
Generate and use type-safe builders for any GitHub Action with full autocomplete

### 🎨 **Local Custom Actions**
Create and manage custom local actions with automatic file generation and type safety

### 🔄 **Reverse Engineering**
Convert existing YAML workflows to type-safe TypeScript with automatic expression handling

### ⚡ **Modern Tooling**
Uses latest TypeScript features, Vitest for testing, and tsup for fast builds

---

## 📦 Installation

```bash
npm install flughafen
# or
pnpm add flughafen
# or
yarn add flughafen
```

**Requirements:**
- Node.js >= 18.0.0
- TypeScript >= 5.0.0

---

## 🚀 Quick Start

### Create Your First Workflow

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  .name('CI Pipeline')
  .on('push', { branches: ['main'] })
  .on('pull_request')
  .job('test', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout code')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Setup Node.js')
          .uses('actions/setup-node@v4', action =>
            action.with({
              'node-version': '20',
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
  );

// Generate YAML
console.log(workflow.toYAML());
```

### Use the CLI

```bash
# Create a workflow file
echo "export default createWorkflow()..." > my-workflow.ts

# Generate YAML files
flughafen build my-workflow.ts

# Outputs:
# ✓ .github/workflows/my-workflow.yml
```

---

## 📚 Documentation

### Core Documentation

- **[Tutorial](https://github.com/jpwesselink/flughafen/blob/main/docs/tutorial.md)** - Step-by-step guide to building your first workflows
- **[API Reference](https://github.com/jpwesselink/flughafen/blob/main/docs/api.md)** - Complete API documentation with all methods and options
- **[Examples](https://github.com/jpwesselink/flughafen/tree/main/packages/core/examples)** - Real-world examples and patterns

### Quick Links

- [Workflow Triggers](#workflow-triggers)
- [Job Configuration](#job-configuration)
- [Step Configuration](#step-configuration)
- [Local Custom Actions](#-local-custom-actions)
- [Type Generation](#-type-generation)
- [Validation](#validation)

---

## 💡 Examples

### Matrix Build

```typescript
createWorkflow()
  .name('Matrix Build')
  .on('push')
  .job('test', job =>
    job
      .runsOn('${{ matrix.os }}')
      .strategy({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['18', '20', '22']
        },
        'fail-fast': false
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
        step.name('Run tests')
          .run('npm test')
      )
  );
```

### Workflow with Deployment

```typescript
createWorkflow()
  .name('Deploy to Production')
  .on('release', { types: ['published'] })
  .permissions({ contents: 'read', deployments: 'write' })
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step => step.name('Build').run('npm run build'))
  )
  .job('deploy', job =>
    job
      .runsOn('ubuntu-latest')
      .needs('build')
      .environment({ name: 'production', url: 'https://example.com' })
      .step(step =>
        step.name('Deploy to production')
          .run('npm run deploy')
          .env({ DEPLOYMENT_ENV: 'production' })
      )
  );
```

### More Examples

Check out the [`examples/`](https://github.com/jpwesselink/flughafen/tree/main/packages/core/examples) directory for comprehensive examples:

- **`basic-usage.ts`** - Complete workflow with multiple jobs and local actions
- **`simple-local-action.ts`** - Creating and using local custom actions
- **`advanced-triggers.ts`** - Complex trigger configurations
- **`very-basic.ts`** - Minimal workflow example

---

## 🛠️ CLI Tool

Flughafen includes a powerful CLI for workflow building and type generation.

### Installation

The CLI is included when you install the package:

```bash
npm install -g flughafen
# or use npx
npx flughafen --help
```

### Commands

#### `build <file>` - Build Workflows

Generate YAML workflows and action files from TypeScript:

```bash
# Synthesize a single workflow
flughafen build my-workflow.ts

# Custom output directory
flughafen build my-workflow.ts -d ./ci

# Dry run (preview without writing)
flughafen build my-workflow.ts --dry-run

# Verbose output
flughafen build my-workflow.ts --verbose
```

#### `validate <files...>` - Validate Workflows

Comprehensive validation with TypeScript compilation, structure checks, and security analysis:

```bash
# Validate workflow files
flughafen validate workflows/*.ts

# Strict mode (fail on warnings)
flughafen validate workflows/ci.ts --strict

# Verbose validation output
flughafen validate workflows/*.ts --verbose
```

#### `build <files...>` - Complete Build Pipeline

Run validation, type generation, and synthesis in one command:

```bash
# Complete build
flughafen build workflows/ci.ts

# Build multiple workflows
flughafen build workflows/*.ts

# Build with verbose output
flughafen build workflows/ci.ts --verbose
```

#### `generate-types [files...]` - Generate Action Types

Generate TypeScript types for GitHub Actions:

```bash
# Auto-detect and generate types
flughafen generate-types

# Generate from specific workflows
flughafen generate-types workflows/ci.ts workflows/deploy.ts

# Custom output location
flughafen generate-types -o ./types/actions.d.ts
```

### Workflow File Pattern

Create workflow files that export a WorkflowBuilder as the default export:

```typescript
// workflows/ci.ts
import { createWorkflow } from 'flughafen';

export default createWorkflow()
  .name('Continuous Integration')
  .on('push', { branches: ['main'] })
  .job('test', job =>
    job.runsOn('ubuntu-latest')
      .step(step => step.run('npm test'))
  );
```

---

## 🔧 Type Generation

Generate TypeScript types from GitHub Action schemas for full type safety:

```bash
# Generate types from action schemas
pnpm run generate-types

# Fetch latest schemas and generate types
pnpm run fetch-schemas
pnpm run generate-types

# Or use the CLI
flughafen generate-types
```

This creates type definitions in `generated/types/` enabling:
- Full autocomplete for action inputs
- Compile-time validation of action configurations
- IntelliSense support in your IDE

**Example with generated types:**

```typescript
// Types automatically generated for actions/checkout@v4
.step(step =>
  step.uses('actions/checkout@v4', action =>
    action.with({
      repository: 'owner/repo',  // ✅ Autocomplete available
      ref: 'main',               // ✅ Type-checked
      'fetch-depth': 1           // ✅ Validated
      // invalidProp: 'test'     // ❌ TypeScript error!
    })
  )
)
```

---

## 🎨 Local Custom Actions

Create reusable local actions with automatic file generation and type safety:

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define a reusable local action
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment')
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
    description: 'Whether cache was restored',
    value: '${{ steps.cache.outputs.cache-hit }}'
  })
  .using('composite')
  .step(step =>
    step.name('Setup Node.js')
      .uses('actions/setup-node@v4', action =>
        action.with({
          'node-version': '${{ inputs.node-version }}'
        })
      )
  )
  .step(step =>
    step.name('Install dependencies')
      .run('${{ inputs.package-manager }} install')
  );

// Use in workflow with type safety
const workflow = createWorkflow()
  .name('CI with Local Action')
  .on('push')
  .job('build', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step =>
        step.uses(setupAction, action =>
          action.with({
            'node-version': '20',      // ✅ Type-safe inputs
            'package-manager': 'pnpm'  // ✅ Validated choices
          })
        )
      )
  );

// Generates:
// .github/workflows/ci.yml (references ./actions/setup-environment)
// .github/actions/setup-environment/action.yml
```

### Local Action Features

- ✅ **Composite, Node.js, and Docker actions** - Full support for all action types
- ✅ **Type-safe inputs and outputs** - Compile-time validation
- ✅ **Automatic file generation** - Action files created during synthesis
- ✅ **Reusable across workflows** - Share logic across your repository
- ✅ **Custom paths** - Override default `.github/actions/` location

---

## Workflow Triggers

Flughafen supports all GitHub Events with full type safety:

```typescript
createWorkflow()
  .name('Comprehensive Triggers')

  // Push events
  .on('push', {
    branches: ['main', 'develop'],
    paths: ['src/**', '!docs/**']
  })

  // Pull request events
  .on('pull_request', {
    types: ['opened', 'synchronize', 'reopened'],
    branches: ['main']
  })

  // Scheduled workflows (cron)
  .on('schedule', [
    { cron: '0 2 * * 1' },   // Weekly on Monday 2 AM
    { cron: '0 0 1 * *' }    // Monthly on 1st
  ])

  // Manual workflow dispatch
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

  // Reusable workflow
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

  // Other events
  .on('release', { types: ['published'] })
  .on('issues', { types: ['opened', 'labeled'] })
  .on('deployment');
```

---

## Job Configuration

Configure jobs with matrix builds, containers, services, and more:

```typescript
.job('my-job', job =>
  job
    // Basic configuration
    .runsOn('ubuntu-latest')
    .needs(['build', 'lint'])
    .if("github.ref == 'refs/heads/main'")

    // Environment
    .environment({
      name: 'production',
      url: 'https://example.com'
    })
    .env({ NODE_ENV: 'production' })
    .permissions({ contents: 'read', deployments: 'write' })

    // Matrix strategy
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest'],
        'node-version': ['18', '20', '22']
      },
      'fail-fast': false,
      'max-parallel': 3
    })

    // Container and services
    .container({
      image: 'node:20',
      env: { NODE_ENV: 'test' },
      options: '--cpus 2'
    })
    .services({
      postgres: {
        image: 'postgres:15',
        env: { POSTGRES_PASSWORD: 'postgres' },
        ports: ['5432:5432']
      }
    })

    // Configuration
    .timeoutMinutes(30)
    .continueOnError(false)
    .concurrency({
      group: '${{ github.workflow }}-${{ github.ref }}',
      'cancel-in-progress': true
    })

    // Steps
    .step(step => step.run('echo "Hello"'))
)
```

---

## Step Configuration

Configure steps with actions, commands, and conditions:

```typescript
.step(step =>
  step
    // Basic configuration
    .name('My Step')
    .id('my-step')
    .if("success()")

    // Using actions - Callback form (recommended)
    .uses('actions/checkout@v4', action =>
      action
        .with({
          repository: 'owner/repo',
          ref: 'main',
          'fetch-depth': 1
        })
        .env({ GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' })
    )

    // Using actions - Shorthand form
    .uses('actions/checkout@v4', {
      repository: 'owner/repo',
      ref: 'main'
    })

    // Or run shell commands
    .run('npm ci && npm test')
    .shell('bash')
    .workingDirectory('./packages/app')

    // Environment and error handling
    .env({ CI: 'true', NODE_ENV: 'test' })
    .continueOnError(true)
    .timeoutMinutes(10)
)
```

---

## Validation

Built-in comprehensive validation with TypeScript compilation, security checks, and best practices:

```typescript
import { validate } from 'flughafen';

// Programmatic validation
const result = await validate({
  files: ['workflows/ci.ts'],
  strict: true,
  verbose: true
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Or use CLI
// flughafen validate workflows/*.ts --strict
```

**Validation includes:**
- ✅ TypeScript compilation and type checking
- ✅ Workflow structure validation
- ✅ Security best practices (secrets, permissions)
- ✅ GitHub Actions expression validation
- ✅ Job dependencies and circular reference detection
- ✅ Action version and input validation

---

## 🔨 Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Build the project
pnpm build

# Development mode with hot reload
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Generate types from schemas
pnpm run generate-types

# Fetch latest GitHub Action schemas
pnpm run fetch-schemas
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Before submitting:**
- Run tests: `pnpm test`
- Run linter: `pnpm lint`
- Ensure types are valid: `pnpm typecheck`

---

## 📄 License

MIT © [Your Name]

---

## 🙏 Acknowledgments

- Inspired by the need for type-safe GitHub Actions workflows
- Built with modern TypeScript tooling: Vitest, tsup, Turborepo
- Schema types generated from [SchemaStore](https://github.com/SchemaStore/schemastore)

---

## 📞 Support

- 📖 [Documentation](https://github.com/jpwesselink/flughafen#readme)
- 🐛 [Issue Tracker](https://github.com/jpwesselink/flughafen/issues)
- 💬 [Discussions](https://github.com/jpwesselink/flughafen/discussions)

---

**Made with ❤️ for the TypeScript community**
