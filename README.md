# Flughafen 🛫

[![CI](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml/badge.svg)](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jpwesselink/flughafen/branch/main/graph/badge.svg)](https://codecov.io/gh/jpwesselink/flughafen)

**Type-Safe GitHub Actions Workflows in TypeScript**

Build GitHub Actions workflows with full type safety, IntelliSense, and compile-time validation. Flughafen replaces error-prone YAML with a fluent, programmatic API.

> **Status**: Approaching v1.0. Core workflow building is stable. Reverse engineering and validation features under active development.

## What is Flughafen?

**Flughafen** (German for "airport") is a modern TypeScript-first workflow builder that provides:

- 🎯 **Fluent API** - Clean, callback-based configuration with proper scoping
- 🔒 **Type Safety** - Full TypeScript support with comprehensive type definitions from official GitHub schemas
- 🛡️ **Context Safety** - Prevents calling wrong methods in wrong contexts through scoped callbacks
- ⚡ **Developer Experience** - Excellent IntelliSense and compile-time validation
- 🔄 **Reverse Engineering** - Convert existing YAML workflows to type-safe TypeScript
- 🚀 **Modern Architecture** - Monorepo with CLI tools and schema-driven code generation

## Quick Example

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  .name('CI Pipeline')
  .on('push', { branches: ['main'] })
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.name('Checkout').uses('actions/checkout@v4'))
      .step((step) => step.name('Test').run('npm test'))
  );

export default workflow;
```

## Why Flughafen?

| Problem | Flughafen Solution |
|---------|-------------------|
| ❌ No type safety in YAML | ✅ Full TypeScript type checking |
| ❌ No autocomplete/IntelliSense | ✅ Complete IDE support |
| ❌ Runtime errors only | ✅ Compile-time validation |
| ❌ Easy to mix up contexts | ✅ Function-based scoping prevents errors |
| ❌ Manual action input validation | ✅ Type-safe action configuration |
| ❌ Legacy YAML workflows | ✅ Convert existing workflows to TypeScript |

## Packages

This monorepo contains:

- **[@flughafen/flughafen](./packages/flughafen)** - Core library with workflow builders
- **[@flughafen/cli](./packages/cli)** - Command-line tools for building and validating workflows
- **[@flughafen/schema-tools](./packages/schema-tools)** - Internal tooling for schema-driven type generation

## Installation

```bash
# Core library
pnpm add flughafen

# CLI (optional)
pnpm add -D @flughafen/cli
```

## Documentation

- 📖 **[Getting Started Tutorial](./docs/tutorial.md)** - Step-by-step guide for beginners
- 📚 **[API Reference](./docs/api.md)** - Complete API documentation
- 🔄 **[Reverse Engineering Guide](./docs/reverse-engineering-quick-start.md)** - Convert YAML to TypeScript
- 📦 **[Core Library](./packages/flughafen/README.md)** - Flughafen package docs
- 🛠️ **[CLI Documentation](./packages/cli/README.md)** - Command-line tools
- 💡 **[Examples](./examples/)** - Real-world workflow examples
- ❓ **[FAQ](./docs/faq.md)** - Frequently asked questions

## Features

### ✅ Stable (Production Ready)

- **Core Workflow Builder API** - Build workflows with type-safe fluent interface
- **Type-Safe Action Builders** - Auto-generated types for GitHub Actions
- **Local Action Support** - Create and use custom local actions
- **Schema-Driven Type Generation** - Automatic types from GitHub schemas
- **Expression Helpers** - Type-safe `expr()` for GitHub Actions expressions
- **Comprehensive Testing** - 366+ tests across 26 test suites

### ✅ Complete (Testing in Progress)

- **Reverse Engineering** - Convert YAML workflows to TypeScript
  - Expression conversion (`${{ }}` → `expr()`)
  - Batch conversion support
  - 100% success rate with tested real-world workflows (Angular, Prisma, Nx, Rust)
  - CLI integration (`flughafen reverse`)

### 🚧 In Development

- **Validation Pipeline** - Enhanced workflow validation
  - TypeScript compilation validation
  - Workflow structure validation
  - Security best practices
  - Action schema validation

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint

# Start documentation site
pnpm docs:dev
```

## Project Status

**Current Version**: Pre-v1.0 (Approaching Stable Release)

**Test Coverage**:
- 366+ passing tests
- 26 test suites
- Real-world workflow validation

**Performance**:
- ~45ms average conversion time for typical workflows
- Efficient schema caching

**Roadmap**: Focus on stability and bug fixes leading to v1.0 release.

## License

MIT

## Support

- 📖 **Documentation**: [docs/](./docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/jpwesselink/flughafen/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jpwesselink/flughafen/discussions)

## Contributing

See [FAQ](./docs/faq.md) for information about contributing. This project is approaching v1.0, and we welcome feedback and bug reports.

