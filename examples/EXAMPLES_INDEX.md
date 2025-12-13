# Flughafen Examples Index

This directory contains various examples for testing and demonstrating Flughafen's capabilities.

## Directory Structure

### 📁 `real-world-examples/`
Real `.github` folders from popular open-source projects, providing comprehensive examples of production GitHub Actions workflows.

#### Projects Included:
- **Next.js** - Complex build pipelines and reusable workflows
- **VS Code** - Enterprise-grade multi-platform testing
- **React** - Advanced React ecosystem workflows
- **TypeScript** - Language tooling and compiler testing
- **tRPC** - Full-stack TypeScript framework with funding configuration
- **Vitest** - Fast unit testing framework with multi-sponsor funding
- **Prisma** - Database toolkit with comprehensive CI/CD
- **Rust** - System programming language with cross-platform builds
- **Turborepo** - Build system with advanced caching strategies
- **Playwright** - End-to-end testing framework with browser automation
- **Nx** - Monorepo development toolkit

#### Workflow Call Examples:
- **`workflow-call-examples/`** - Simple, focused examples of `workflow_call` functionality
  - `simple-reusable.yml` - Basic reusable workflow with inputs, secrets, outputs
  - `caller-workflow.yml` - Workflow that calls reusable workflows
  - Complete documentation and usage examples

#### Funding Examples:
- **`trpc/`** - Simple funding configuration with GitHub Sponsors and Open Collective
  - `FUNDING.yml` - Single sponsor per platform
- **`vitest/`** - Multi-sponsor funding configuration
  - `FUNDING.yml` - Multiple GitHub sponsors with Open Collective

### 📁 `simple-validation.ts`, `demo-validation.ts`, etc.
Basic TypeScript examples for testing core Flughafen functionality.

## Testing Flughafen Features

### Workflow_call Support

Our `workflow_call` support can be tested with:

```bash
# Test real-world reusable workflows
npx flughafen reverse examples/real-world-examples/next-js/.github/workflows/build_reusable.yml

# Test simple examples
npx flughafen reverse examples/real-world-examples/workflow-call-examples/

# Test entire repository workflows
npx flughafen reverse examples/real-world-examples/react/.github/
```

### Funding Support

Our funding system supports analysis, validation, and TypeScript generation from FUNDING.yml files:

```bash
# Analyze real-world funding configurations
npx flughafen analyze examples/real-world-examples/trpc/.github/FUNDING.yml
npx flughafen analyze examples/real-world-examples/vitest/.github/FUNDING.yml

# Generate TypeScript from funding config
npx flughafen funding:generate examples/real-world-examples/trpc/.github/FUNDING.yml

# Validate funding configuration
npx flughafen funding:validate examples/real-world-examples/vitest/.github/FUNDING.yml
```

## What's Demonstrated

### ✅ Workflow_call Features
- Complete `workflow_call` trigger parsing
- Inputs with types, defaults, and descriptions
- Required and optional secrets
- Workflow outputs
- Jobs that call reusable workflows (`.uses()`)
- Expression conversion (`${{ expr('...') }}`)

### ✅ Funding Features
- GitHub FUNDING.yml parsing and validation
- Support for all 13+ funding platforms (GitHub Sponsors, Patreon, Open Collective, etc.)
- Multiple sponsors per platform (arrays)
- Custom donation URLs
- TypeScript code generation from funding configurations
- Roundtrip validation (FUNDING.yml → TypeScript → FUNDING.yml)
- JSON Schema validation with detailed error reporting
- Real-world example analysis and testing

### ✅ Real-World Patterns
- Multi-platform builds and testing
- Matrix strategies and parallel execution
- Artifact management and caching
- Security scanning and validation
- Deployment pipelines and environments
- Dependency management strategies

### ✅ Complexity Levels
- **Beginner**: Simple push/PR workflows
- **Intermediate**: Matrix builds, reusable workflows
- **Advanced**: Enterprise patterns, massive parallelization

## Usage

1. **Browse examples** to understand different workflow patterns
2. **Test reverse engineering** with Flughafen CLI
3. **Validate functionality** using our comprehensive test suite
4. **Learn best practices** from industry-leading projects

## Contributing

To add more examples:
1. Add new workflow files or directories
2. Update this index with descriptions
3. Test with Flughafen to ensure compatibility
4. Document any interesting patterns or features

---

*Updated: December 2025 - Workflow_call support and comprehensive funding system implementation*