# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flughafen** is a TypeScript-first workflow builder for GitHub Actions that provides a fluent, type-safe API for creating CI/CD pipelines. It addresses the limitations of YAML-based workflow definitions by offering compile-time validation, IntelliSense support, and programmatic workflow generation with comprehensive local custom actions support.

### Package Structure

This is a monorepo with two main packages:
- **`packages/flughafen/`** - Core library with builders, validation, schema management, operations
- **`packages/cli/`** - CLI wrapper that provides command-line interface to core functionality

**New Additions:**
- **`.claude/`** - Persistent todo system for cross-session continuity
- **`biome.json`** - Root-level code formatting and linting configuration
- **`examples/`** - Workflow examples moved to root level for better discoverability
- **Validation System** - Comprehensive validation moved from CLI to core package

## Development Commands

### Core Development
- `pnpm dev` - Development mode with hot reload using tsup
- `pnpm build` - Production build (automatically runs generate-types first)
- `pnpm test` - Run test suite once
- `pnpm test:watch` - Run tests in watch mode  
- `pnpm test:coverage` - Run tests with coverage reports
- We use pnpm as the package manager for this project

### Code Quality
- `pnpm lint` - Run Biome linter on all source files (root configuration)
- `pnpm lint:fix` - Run Biome linter with auto-fixes
- `pnpm format` - Format code using Biome
- `pnpm turbo lint` - Run linting across all packages
- Code style: **tabs for indentation**, double quotes, semicolons, 120 line width

### Type Generation & Schemas
- `pnpm run generate-types` - Generate TypeScript types from GitHub Action schemas
- `pnpm run fetch-schemas` - Fetch latest GitHub Action schemas from Schema Store
- Types are auto-generated during build process

### CLI Usage
- `pnpm run cli:synth <file>` - Synthesize workflow from TypeScript file
- `pnpm run demo:synth` - Demo synthesis using examples/simple-workflow.ts
- `node bin/flughafen.js synth <file>` - Direct CLI usage

### Validation & Build
- `pnpm turbo typecheck` - TypeScript compilation check across all packages
- `pnpm turbo build` - Full build including validation, type generation, and compilation
- `node packages/cli/bin/flughafen validate <files>` - Comprehensive workflow validation
- `node packages/cli/bin/flughafen build <files>` - Complete pipeline: validate + generate-types + synth
- Validation features: TypeScript compilation, structure, security, best practices, expressions

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

**Core Library** (`packages/flughafen/src/`):
- **Builders** (`core/builders/`) - `WorkflowBuilder`, `JobBuilder`, `StepBuilder`, `ActionBuilder`, `LocalActionBuilder`
- **Schema System** (`schema/`) - Schema fetching, type generation, action interface management
- **Validation System** (`validation/`) - Comprehensive workflow validation (NEW!)
- **Operations** (`operations/`) - High-level programmatic APIs (`synth`, `validate`, `generate-types`)
- **Processing** (`processing/`) - Workflow compilation and sandbox execution
- **Utils** (`utils/`) - Error handling, string utilities, helper functions

**CLI Package** (`packages/cli/src/`):
- **Commands** (`commands/`) - CLI command implementations (thin wrappers around core operations)
- **Utils** (`utils/`) - CLI-specific utilities (spinners, config loading, output formatting)
- Main CLI entry point using yargs

**Validation System** (`packages/flughafen/src/validation/`):
- `WorkflowValidator` - Main validation orchestrator
- `TypeScriptValidator` - TypeScript compilation validation
- `StructureValidator` - Workflow structure validation  
- `SecurityValidator` - Security best practices validation
- `BestPracticesValidator` - General best practices validation
- `SyntaxValidator` - Basic syntax validation
- Expression validation integrated from schema system

**New CLI Commands** (`packages/cli/src/commands/`):
- `build.ts` - Unified build command (validate + generate-types + synth)
- `generate.ts` - Enhanced type generation with workflow scanning
- Enhanced `validate.ts` - Comprehensive validation using core system

**New Core Operations** (`packages/flughafen/src/operations/`):
- `validate.ts` - Programmatic validation API for external use
- Enhanced schema expressions system (`src/schema/expressions/`)

**Project Organization**:
- `examples/` - Moved to root level for better discoverability
- `.claude/` - Persistent state management for Claude Code sessions
- Root `biome.json` - Centralized code quality configuration

### Key Features
- **Type-safe action configuration** with `.with()` method and callback form
- **Local custom actions** that generate separate action.yml files
- **Generic event triggers** via `.on()` method for all GitHub events
- **Automatic type generation** from GitHub Action schemas
- **Comprehensive validation system** with TypeScript compilation, security, best practices, and expression validation
- **Secure execution** using Node.js VM sandbox for workflow file processing
- **Unified build pipeline** combining validation, type generation, and synthesis

## Testing

- **Framework**: Vitest with V8 coverage provider
- **Test files**: `src/__tests__/WorkflowBuilder.test.ts` 
- **Coverage**: Text, JSON, and HTML reports
- **Config**: `vitest.config.ts`

## Build System

- **Monorepo**: Turborepo for coordinated builds across packages
- **Bundler**: tsup for dual format output (CJS + ESM)
- **Config**: `tsup.config.ts` in each package
- **Outputs**: `dist/index.js` (CJS), `dist/esm/index.js` (ESM)
- **External dependencies**: esbuild and typescript externalized for CLI
- **Linting**: Biome configured at root level (`biome.json`)

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

### Validation System Architecture

The validation system provides comprehensive workflow validation with modular, extensible validators:

```typescript
// Programmatic usage
import { validate, WorkflowValidator } from 'flughafen';

// High-level API
const result = await validate({
  files: ['workflow.ts'],
  strict: true,
  verbose: true
});

// Direct validator usage
const validator = new WorkflowValidator();
const fileResult = await validator.validateFile('workflow.ts');

// CLI usage
flughafen validate workflow.ts --strict --verbose
flughafen build workflow.ts  // includes validation + types + synthesis
```

**Validation Architecture:**
- **`WorkflowValidator`** - Main orchestrator coordinating all validators
- **`TypeScriptValidator`** - Full TypeScript compiler integration with semantic analysis
- **`StructureValidator`** - Workflow schema validation, required fields, job configuration
- **`SecurityValidator`** - Security best practices, hardcoded secrets, permission analysis
- **`BestPracticesValidator`** - Step naming conventions, action versioning, timeouts
- **`SyntaxValidator`** - Basic file structure and import validation
- **Expression System** - GitHub Actions `${{ }}` expressions with context-aware validation

**Validation Features:**
- **TypeScript Compilation** - Catches type errors, missing imports, and semantic issues at validation time
- **Workflow Structure** - Schema validation against GitHub Actions workflow format
- **Security Analysis** - Detects potential security issues like hardcoded secrets and script injection
- **Best Practices** - Enforces naming conventions, versioning standards, timeout specifications
- **Expression Validation** - Validates GitHub Actions expressions with workflow context awareness
- **Modular Design** - Each validator can be used independently or as part of the complete system
- **Detailed Reporting** - Provides actionable error messages with suggestions for fixes

**Validation Results:**
```typescript
interface WorkflowValidationResult {
  file: string;
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
  duration: number;
}
```

## Documentation

See `/docs/RFC.md` for the comprehensive project RFC that covers:
- **Project architecture and design principles**
- **Implementation details and usage examples**
- **CLI commands and workflow patterns**
- **Comparison to alternatives and future roadmap**

Additional documentation in `/docs/`:
- `cli-package-plan.md` - CLI package separation architecture
- `local-actions.md` - Local action implementation details
- `phase4-developer-experience-plan.md` - DX improvement roadmap
- `project-structure.md` - Codebase organization

## Recent Major Changes (December 2025)

### ✅ Validation System Migration (COMPLETED)
- **Moved all validation logic from CLI to core package** (`/packages/flughafen/src/validation/`)
- **Created comprehensive validation system** with modular validators (`WorkflowValidator`, `TypeScriptValidator`, etc.)
- **Integrated TypeScript compiler for semantic analysis** - catches type errors at validation time
- **Unified CLI commands**: `validate`, `build` (validate + generate-types + synth)
- **Type conflict resolution**: Renamed legacy validation types to avoid conflicts with new `WorkflowValidationResult`
- **End-to-end testing**: Complete validation pipeline tested and functional
- **ESM build fixes**: Externalized TypeScript dependency to resolve dynamic require issues

### 📁 Major File Structure Changes
**New Files Added:**
- `.claude/todos.json` - Persistent todo system for Claude Code sessions
- `biome.json` - Root-level code formatting configuration
- `packages/cli/src/commands/build.ts` - Unified build pipeline command
- `packages/flughafen/src/validation/` - Complete validation system (6+ new files)
- `packages/flughafen/src/operations/validate.ts` - Programmatic validation API
- `packages/flughafen/src/schema/expressions/` - Enhanced expression validation
- `examples/` - Moved workflow examples to root level

**Key Modified Files:**
- `packages/flughafen/src/types/builder-types.ts` - Resolved ValidationResult type conflicts
- `packages/flughafen/tsup.config.ts` - Externalized TypeScript for ESM compatibility
- Multiple CLI command files updated to use core validation system

### ✅ Code Quality Infrastructure  
- **Centralized Biome configuration** at root level (`biome.json`)
- **Turborepo integration** for coordinated builds and linting
- **Disabled template string warnings** for GitHub Actions expressions (false positives)

### ✅ Current Status
- **TypeScript compilation**: All type conflicts resolved, builds successfully
- **Validation system**: Fully functional, comprehensive validation with detailed error reporting
- **Build pipeline**: Complete validation → type generation → synthesis workflow working end-to-end
- **CLI integration**: All validation features accessible via CLI commands

## Important Notes for New Sessions

1. **Check persistent todo list** at `/.claude/todos.json` for current tasks and project status
2. **Use TodoRead/TodoWrite frequently** to track multi-step tasks and sync with persistent list
2. **Core logic belongs in `/packages/flughafen/`** - CLI should be thin wrappers
3. **GitHub Actions expressions use `${{ }}` syntax** - these trigger Biome template string warnings (ignore them)
4. **Validation system**: The comprehensive validation system is in `/packages/flughafen/src/validation/` using `WorkflowValidationResult/Error` types
5. **Testing approach**: Use `pnpm turbo typecheck` and `pnpm turbo build` to verify changes
6. **Architecture**: Follow the builder pattern with function scoping as documented in the RFC

## Dependencies

**Runtime**: `ajv` (validation), `yaml` (generation), `yargs` (CLI), `esbuild` (compilation)
**Dev**: `vitest` (testing), `@biomejs/biome` (linting), `tsup` (bundling), `typescript`