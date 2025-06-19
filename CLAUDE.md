# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- `pnpm dev` - Start development mode with TypeScript compilation in watch mode
- `pnpm build` - Build the project for production (runs type generation first)
- `pnpm prebuild` - Generate types from GitHub Actions schema (automatically run before build)

### Testing
- `pnpm test` - Run all tests once (53 core tests currently passing)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### Code Quality
- Rome is configured for linting and formatting (see `_rome.json`)
- TypeScript configuration in `tsconfig.json`

### CLI Development
- `pnpm cli:synth <file>` - Synthesize workflow from TypeScript/JavaScript file
- `pnpm demo:synth` - Demo the synth command with basic usage example
- Single `synth` command replaces legacy `watch` and `generate` commands

### Type Generation
- `pnpm generate-types` - Generate TypeScript types from GitHub Actions schema
- `pnpm exec tsx scripts/generateActionInputBuilder.ts <action-ref>` - Generate type-safe builders for GitHub Actions

## Architecture Overview

Flughafen is a type-safe GitHub Actions workflow builder with a fluent API pattern centered around a unified `synth()` method. The architecture uses builder classes that prevent context switching and provide comprehensive workflow synthesis capabilities.

### Core Builder Pattern
The project uses a sophisticated builder pattern with strict scoping and unified synthesis:

- **WorkflowBuilder** (`src/lib/builders/WorkflowBuilder.ts`) - Main entry point with `synth()` method for complete workflow generation
- **JobBuilder** (`src/lib/builders/JobBuilder.ts`) - Job-level configuration with local action collection
- **StepBuilder** (`src/lib/builders/StepBuilder.ts`) - Step-level configuration with LocalActionBuilder support
- **ActionBuilder** (`src/lib/builders/ActionBuilder.ts`) - Action-specific configuration
- **LocalActionBuilder** (`src/lib/builders/LocalActionBuilder.ts`) - Local custom action definitions with path resolution

Each builder implements the `Builder<T>` interface and provides fluent methods. The `WorkflowBuilder.synth()` method recursively processes all components and generates both workflow and action files with correct relative paths.

### Type Safety Strategy
- Generated types from GitHub Actions schema in `src/generated/github-actions.d.ts`
- Builder types in `src/types/builder-types.ts` provide type aliases and interfaces
- Dynamic action input builders can be generated via `scripts/generateActionInputBuilder.ts`
- Full TypeScript compilation with secure VM sandbox execution

### CLI Tool Architecture
The CLI (`src/cli/cli.ts`) provides unified workflow synthesis via a single `synth` command:
- Supports both TypeScript and JavaScript workflow files  
- Secure TypeScript compilation and VM sandbox execution
- Handles module imports dynamically with pre-loaded flughafen module
- Generates workflow YAML and local action files with smart path resolution
- Supports custom output directories, dry-run mode, and verbose logging

### Key Features
1. **Unified Synthesis** - Single `synth()` method handles complete workflow and action generation
2. **Smart Path Resolution** - Automatic relative path calculation for local actions regardless of output directory structure
3. **Local Actions** - First-class support for custom GitHub Actions with automatic collection and deduplication
4. **Secure Execution** - VM-based sandbox with TypeScript compilation for safe file processing
5. **Type-safe Action Builders** - Generate builders for any GitHub Action with full type safety
6. **Validation** - Built-in JSON schema validation using AJV
7. **Flexible CLI** - Single command with comprehensive options for all workflow generation needs

### Project Structure
- `src/lib/builders/` - Core builder classes with unified synthesis
- `src/utils/` - Utility modules (TypeScript compiler, sandbox, file writer, processor orchestration)
- `src/types/` - Type definitions and interfaces
- `src/generated/` - Auto-generated types from GitHub Actions schema
- `src/cli/` - Simplified CLI implementation with single `synth` command
- `examples/` - Comprehensive usage examples including complex workflows with local actions
- `scripts/` - Type generation and utility scripts
- `bin/` - CLI executable wrapper with dynamic import

### Build System
- **tsup** - TypeScript bundler with dual CommonJS/ESM output and proper externalization
- **Vitest** - Testing framework with in-source tests support (53 tests passing)
- **Rome** - Linting and formatting

### Key Entry Points
- `src/index.ts` - Main library exports including LocalActionBuilder support
- `src/cli/cli.ts` - Unified CLI with `synth` command
- `createWorkflow()` - Primary function to start building workflows with synthesis capability
- `WorkflowBuilder.synth()` - Core method for complete workflow and action generation

The codebase emphasizes type safety, clean APIs, and developer experience through sophisticated TypeScript patterns, comprehensive tooling, and a unified synthesis architecture. The project has been successfully refactored from legacy processor-based generation to a streamlined `synth()`-based approach that provides better performance, security, and maintainability.