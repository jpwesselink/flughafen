# @flughafen/cli

Command-line interface for Flughafen GitHub Actions workflow builder.

## Status

🚧 **Work in Progress** - This package is currently under development as part of Phase 1 migration.

## Installation

```bash
# Install from workspace (development)
pnpm install
pnpm build

# Or install globally (when published)
npm install -g @flughafen/cli
```

## Current State

This package currently provides a placeholder CLI that directs users to the existing CLI functionality in the core `flughafen` package.

### Available Commands

For now, use the existing CLI from the flughafen package:

```bash
# Synthesize workflows
npx flughafen synth <file>

# Generate types
npx flughafen generate-types
```

## Migration Plan

This CLI package is being developed in phases:

### ✅ Phase 1: Package Setup (Current)
- [x] Package structure and build configuration
- [x] Basic CLI entry point and placeholder functionality
- [x] Workspace integration

### 🔄 Phase 2: Core Migration (Next)
- [ ] Migrate `synth` command from core package
- [ ] Migrate `generate-types` command from core package
- [ ] Preserve existing CLI behavior and compatibility

### 🔄 Phase 3: Enhanced Features (Future)
- [ ] Add `validate` command
- [ ] Add `watch` command
- [ ] Improve CLI user experience

### 🔄 Phase 4: Advanced Features (Future)
- [ ] Add `init` command with interactive prompts
- [ ] Add `scaffold` command with templates
- [ ] Add workflow templates and scaffolding

## Development

```bash
# Build the package
pnpm build

# Test the CLI
./bin/flughafen

# Watch for changes
pnpm dev
```

## Architecture

The CLI package is designed to be a lightweight wrapper around the core `flughafen` library, providing a clean command-line interface while keeping the heavy lifting in the core package.

```
@flughafen/cli/
├── src/
│   ├── cli.ts           # Main CLI application
│   ├── commands/        # Command implementations (future)
│   ├── utils/           # CLI utilities (future)
│   └── types/           # CLI-specific types (future)
├── bin/
│   └── flughafen        # Executable entry point
└── dist/                # Built output
```

## Contributing

This package is part of the Flughafen monorepo. See the main project documentation for contribution guidelines.

## License

MIT - See the main project LICENSE file.
