# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- `pnpm dev` - Start development mode with TypeScript compilation in watch mode
- `pnpm build` - Build the project for production (runs type generation first)
- `pnpm prebuild` - Generate types from GitHub Actions schema (automatically run before build)

### Testing
- `pnpm test` - Run all tests once
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### Code Quality
- Rome is configured for linting and formatting (see `_rome.json`)
- TypeScript configuration in `tsconfig.json`

### CLI Development
- `pnpm cli:watch` - Run CLI in watch mode
- `pnpm cli:generate` - Run CLI generate command
- `pnpm demo:watch` - Demo CLI watch functionality
- `pnpm demo:generate` - Demo CLI generate functionality

### Type Generation
- `pnpm generate-types` - Generate TypeScript types from GitHub Actions schema
- `pnpm exec tsx scripts/generateActionInputBuilder.ts <action-ref>` - Generate type-safe builders for GitHub Actions

## Architecture Overview

Flughafen is a type-safe GitHub Actions workflow builder with a fluent API pattern. The architecture is centered around builder classes that prevent context switching and provide scoped configuration.

### Core Builder Pattern
The project uses a sophisticated builder pattern with strict scoping:

- **WorkflowBuilder** (`src/lib/builders/WorkflowBuilder.ts`) - Main entry point, handles workflow-level configuration
- **JobBuilder** (`src/lib/builders/JobBuilder.ts`) - Job-level configuration within workflows
- **StepBuilder** (`src/lib/builders/StepBuilder.ts`) - Step-level configuration within jobs
- **ActionBuilder** (`src/lib/builders/ActionBuilder.ts`) - Action-specific configuration
- **LocalActionBuilder** (`src/lib/builders/LocalActionBuilder.ts`) - Local custom action definitions

Each builder implements the `Builder<T>` interface and provides fluent methods that return the same builder instance for chaining.

### Type Safety Strategy
- Generated types from GitHub Actions schema in `src/generated/github-actions.d.ts`
- Builder types in `src/types/builder-types.ts` provide type aliases and interfaces
- Dynamic action input builders can be generated via `scripts/generateActionInputBuilder.ts`

### CLI Tool Architecture
The CLI (`src/cli/watch.ts`) provides file watching and YAML generation:
- Supports both TypeScript and JavaScript workflow files
- Uses chokidar for file watching
- Handles module imports dynamically (CommonJS and ES modules)
- Generates workflow YAML and local action files

### Key Features
1. **Function-based API** - Each builder scope (workflow, job, step) has callback functions that provide clean separation
2. **Local Actions** - Can define and generate custom GitHub Actions alongside workflows
3. **Type-safe Action Builders** - Generate builders for any GitHub Action with full type safety
4. **Validation** - Built-in JSON schema validation using AJV
5. **CLI Tool** - Real-time workflow development with file watching

### Project Structure
- `src/lib/builders/` - Core builder classes
- `src/types/` - Type definitions and interfaces
- `src/generated/` - Auto-generated types from GitHub Actions schema
- `src/cli/` - CLI implementation
- `examples/` - Comprehensive usage examples
- `scripts/` - Type generation and utility scripts
- `bin/` - CLI executable wrapper

### Build System
- **tsup** - TypeScript bundler with dual CommonJS/ESM output
- **Vitest** - Testing framework with in-source tests support
- **Rome** - Linting and formatting

### Key Entry Points
- `src/index.ts` - Main library exports
- `src/cli.ts` - CLI entry point
- `createWorkflow()` - Primary function to start building workflows

The codebase emphasizes type safety, clean APIs, and developer experience through sophisticated TypeScript patterns and comprehensive tooling.