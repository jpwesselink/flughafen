# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flughafen** is a TypeScript-first workflow builder for GitHub Actions that provides a fluent, type-safe API for creating CI/CD pipelines. It addresses the limitations of YAML-based workflow definitions by offering compile-time validation, IntelliSense support, and programmatic workflow generation with comprehensive local custom actions support.

## Development Commands

### Core Development
- `pnpm dev` - Development mode with hot reload using tsup
- `pnpm build` - Production build (automatically runs generate-types first)
- `pnpm test` - Run test suite once
- `pnpm test:watch` - Run tests in watch mode  
- `pnpm test:coverage` - Run tests with coverage reports

### Code Quality
- `pnpm run linter` - Run Biome linter on source files
- Code style: **tabs for indentation**, double quotes, semicolons, 120 line width

### Type Generation & Schemas
- `pnpm run generate-types` - Generate TypeScript types from GitHub Action schemas
- `pnpm run fetch-schemas` - Fetch latest GitHub Action schemas from Schema Store
- Types are auto-generated during build process

### CLI Usage
- `pnpm run cli:synth <file>` - Synthesize workflow from TypeScript file
- `pnpm run demo:synth` - Demo synthesis using examples/simple-workflow.ts
- `node bin/flughafen.js synth <file>` - Direct CLI usage

## Architecture

### Builder Pattern with Function Scoping
The codebase uses a fluent builder pattern with **function-based scoping** to prevent context switching errors:

```typescript
createWorkflow()
  .job('test', job => 
    job.runsOn('ubuntu-latest')  // job context
      .step(step => 
        step.uses('actions/checkout@v4')  // step context
      )
  )
```

### Core Components

**Builders** (`src/lib/builders/`):
- `WorkflowBuilder` - Main workflow creation with triggers, jobs, global config
- `JobBuilder` - Job-level configuration (runs-on, strategy, steps)
- `StepBuilder` - Step-level configuration with action callbacks
- `ActionBuilder` - Type-safe action configuration
- `LocalActionBuilder` - Custom local action creation

**Schema System** (`src/lib/schema/`):
- `SchemaManager` - Manages GitHub Action schema fetching and processing
- `TypeGenerator` - Generates TypeScript interfaces from action schemas
- `ActionSchemaFetcher` - Fetches schemas from GitHub/Schema Store
- `WorkflowScanner` - Scans workflow files for used actions

**CLI & Processing** (`src/cli/`, `src/utils/`):
- `cli.ts` - Main CLI implementation using yargs
- `workflow-sandbox.ts` - Secure Node.js VM sandbox for executing workflow files
- `workflow-processor.ts` - Workflow file processing and compilation
- `typescript-compiler.ts` - TypeScript compilation using esbuild
- Commands: `synth`, `generate-types`

### Key Features
- **Type-safe action configuration** with `.with()` method and callback form
- **Local custom actions** that generate separate action.yml files
- **Generic event triggers** via `.on()` method for all GitHub events
- **Automatic type generation** from GitHub Action schemas
- **Built-in validation** using AJV schema validation
- **Secure execution** using Node.js VM sandbox for workflow file processing

## Testing

- **Framework**: Vitest with V8 coverage provider
- **Test files**: `src/__tests__/WorkflowBuilder.test.ts` 
- **Coverage**: Text, JSON, and HTML reports
- **Config**: `vitest.config.ts`

## Build System

- **Bundler**: tsup for dual format output (CJS + ESM)
- **Config**: `tsup.config.ts`
- **Outputs**: `dist/index.js` (CJS), `dist/esm/index.js` (ESM)
- **External dependencies**: esbuild externalized for CLI

## Key Patterns

### Local Actions
Local actions are defined with `createLocalAction()` and automatically generate separate `action.yml` files during synthesis. They're referenced in workflows like regular actions but resolve to `./actions/<name>` paths. Files are automatically generated in `.github/actions/<name>/action.yml` during workflow synthesis.

### Action Callback Form
Steps support callback form for scoped action configuration with type-safe action inputs:
```typescript
.step(step => 
  step.uses('actions/setup-node@v4', action =>
    action.with({ 'node-version': '18' })
      .env({ NODE_ENV: 'production' })
  )
)
```

### Generic Event Triggers
The `.on()` method supports any GitHub event with full type safety and proper configuration validation:
```typescript
.on('push', { branches: ['main'] })
.on('workflow_dispatch', { inputs: { ... } })
.on('release', { types: ['published'] })
.on('schedule', [{ cron: '0 2 * * *' }])
```

### Workflow File Structure
Workflow files should export a `WorkflowBuilder` as the default export:
```typescript
// my-workflow.ts
import { createWorkflow } from 'flughafen';

export default createWorkflow()
  .name('My Workflow')
  .on('push', { branches: ['main'] })
  .job('test', job => job.runsOn('ubuntu-latest'));
```

## Dependencies

**Runtime**: `ajv` (validation), `yaml` (generation), `yargs` (CLI), `esbuild` (compilation)
**Dev**: `vitest` (testing), `@biomejs/biome` (linting), `tsup` (bundling), `typescript`