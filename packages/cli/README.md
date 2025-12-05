# flughafen

Command-line interface for Flughafen - Type-safe GitHub Actions workflow builder.

## Status

✅ **Stable** - Core commands operational. Validation features under active development.

## Installation

```bash
# Install as dev dependency (recommended)
pnpm add -D flughafen @flughafen/core

# Or install globally
npm install -g flughafen
```

## Commands

### Build Workflows

Build TypeScript workflows to YAML:

```bash
# Build all workflows in default directory
flughafen build

# Build specific file
flughafen build workflows/ci.ts

# Build with output directory
flughafen build workflows/ci.ts --output .github/workflows
```

### Validate Workflows

Validate workflow syntax and structure:

```bash
# Validate workflow file
flughafen validate workflows/ci.ts

# Validate with strict mode
flughafen validate workflows/ci.ts --strict

# Validation only (no generation)
flughafen validate workflows/ci.ts --validate-only
```

### Reverse Engineering

Convert existing YAML workflows to TypeScript:

```bash
# Convert single workflow
flughafen reverse .github/workflows/ci.yml

# Convert entire directory
flughafen reverse .github

# With options
flughafen reverse .github \
  --output ./workflows \
  --extract-local-actions \
  --verbose

# Preview without writing files
flughafen reverse .github --preview

# Extract only local actions
flughafen reverse .github --local-actions-only
```

### Generate Types

Generate TypeScript definitions for GitHub Actions:

```bash
# Generate types for an action
flughafen generate-types actions/setup-node@v4

# Generate types for multiple actions
flughafen generate-types actions/setup-node@v4 actions/checkout@v4
```

## Examples

### Basic Workflow

```typescript
// workflows/ci.ts
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('CI Pipeline')
  .on('push', { branches: ['main'] })
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm test'))
  );
```

Build it:

```bash
flughafen build workflows/ci.ts
```

### Convert Existing Workflow

```bash
# Convert YAML to TypeScript
flughafen reverse .github/workflows/ci.yml --output workflows

# Review the generated TypeScript
cat workflows/ci.ts

# Build it back to verify
flughafen build workflows/ci.ts

# Compare outputs
diff .github/workflows/ci.yml .github/workflows/ci.yml.generated
```

### Validate Before Commit

```bash
# Add to package.json
{
  "scripts": {
    "workflows:build": "flughafen build",
    "workflows:validate": "flughafen validate",
    "precommit": "pnpm workflows:validate && pnpm workflows:build"
  }
}
```

## Features

### ✅ Implemented

- **Build Command** - Convert TypeScript workflows to YAML
- **Validate Command** - Syntax and structure validation
- **Reverse Command** - Convert YAML workflows to TypeScript
  - Expression conversion (`${{ }}` → `expr()`)
  - Local action extraction
  - Batch processing
- **Generate Types** - Action type definitions

### 🚧 In Development

- **Advanced Validation** - Enhanced workflow analysis
  - Action schema validation
  - Reusable workflow validation
  - Security best practices
  - Performance analysis

## CLI Options

### Global Options

```bash
--help, -h        Show help
--version, -v     Show version
--verbose         Enable verbose logging
--quiet, -q       Suppress output
```

### Build Options

```bash
--output, -o      Output directory (default: .github/workflows)
--watch, -w       Watch for changes
--dry-run         Preview without writing files
```

### Validate Options

```bash
--strict          Fail on warnings
--validate-only   Validate without generation
--fix             Auto-fix issues where possible
```

### Reverse Options

```bash
--output, -o              Output directory (default: ./workflows)
--extract-local-actions   Extract .github/actions to separate files
--local-actions-only      Only extract local actions
--preview                 Preview without writing files
--skip-local-actions      Skip local action extraction
--verbose                 Show detailed progress
--silent                  Suppress all output
```

## Development

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Test the CLI
./bin/flughafen --help

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## Architecture

The CLI package provides a lightweight command-line interface that orchestrates the core Flughafen library:

```
flughafen/
├── src/
│   ├── cli.ts              # Main CLI application (yargs)
│   ├── commands/
│   │   ├── build.ts        # Build command
│   │   ├── validate.ts     # Validate command
│   │   ├── reverse.ts      # Reverse engineering command
│   │   ├── generate-types.ts # Type generation command
│   │   └── index.ts        # Command exports
│   └── utils/
│       └── spinner.ts      # Progress indicators
├── bin/
│   └── flughafen           # Executable entry point
└── dist/                   # Built output
```

## Troubleshooting

### Command Not Found

```bash
# Ensure package is installed
pnpm list flughafen

# Or use npx
npx flughafen build
```

### Build Errors

```bash
# Enable verbose mode
flughafen build --verbose

# Check TypeScript compilation
tsc --noEmit
```

## Documentation

- 📖 **[Documentation](https://github.com/jpwesselink/flughafen#readme)** - Full documentation
- 🔄 **[Reverse Engineering](https://github.com/jpwesselink/flughafen/blob/main/docs/reverse-engineering-quick-start.md)** - YAML conversion guide
- 💡 **[Examples](https://github.com/jpwesselink/flughafen/tree/main/packages/core/examples)** - Real-world examples
- ❓ **[FAQ](https://github.com/jpwesselink/flughafen/blob/main/docs/faq.md)** - Frequently asked questions

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/jpwesselink/flughafen/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jpwesselink/flughafen/discussions)
- 📖 **Documentation**: [GitHub](https://github.com/jpwesselink/flughafen#readme)

## License

MIT - See the [LICENSE](https://github.com/jpwesselink/flughafen/blob/main/LICENSE.md) file.
