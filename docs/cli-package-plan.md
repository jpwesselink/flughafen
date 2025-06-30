# CLI Package Implementation Plan

## Overview

Create a standalone CLI package `@flughafen/cli` that leverages the core `flughafen` library to provide a command-line interface for GitHub Actions workflow management.

## Package Structure

```
packages/cli/
├── package.json              # @flughafen/cli configuration
├── tsconfig.json             # TypeScript configuration
├── tsup.config.ts            # Build configuration
├── README.md                 # CLI-specific documentation
├── bin/
│   └── flughafen             # CLI entry point (executable)
├── src/
│   ├── index.ts              # Main CLI entry
│   ├── cli.ts                # CLI application setup
│   ├── commands/             # CLI command implementations
│   │   ├── index.ts          # Command exports
│   │   ├── synth.ts          # Synthesize workflows (migrated)
│   │   ├── generate.ts       # Generate action types (migrated)
│   │   ├── watch.ts          # Watch mode (new)
│   │   └── validate.ts       # Validate workflow configurations (new)
│   ├── utils/                # CLI utilities
│   │   ├── logger.ts         # Colorized logging
│   │   └── errors.ts         # Error handling
│   └── types/
│       └── cli.ts            # CLI-specific types
└── tests/
    ├── commands/             # Command tests
    ├── utils/               # Utility tests
    └── integration/         # Integration tests
```

### Future Structure (Phase 4+)
Additional files that will be added in later phases:
```
├── src/
│   ├── commands/
│   │   ├── init.ts           # Initialize new workflow project
│   │   └── scaffold.ts       # Scaffold new workflows/actions
│   ├── utils/
│   │   ├── spinner.ts        # Loading spinners
│   │   ├── prompts.ts        # Interactive prompts
│   │   └── config.ts         # CLI configuration management
│   └── templates/            # Workflow templates
│       ├── basic-ci.ts       # Basic CI workflow template
│       ├── npm-publish.ts    # NPM publishing workflow
│       ├── docker-build.ts   # Docker build workflow
│       └── release.ts        # Release workflow template
```

## Package Configuration

### package.json
```json
{
  "name": "@flughafen/cli",
  "version": "1.0.0",
  "description": "Command-line interface for Flughafen GitHub Actions workflow builder",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "flughafen": "./bin/flughafen"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "flughafen": "workspace:*",
    "yargs": "^18.0.0",
    "chalk": "^5.4.1",
    "chokidar": "^4.0.3"
  },
  "devDependencies": {
    "@types/yargs": "^17.0.33",
    "typescript": "^5.0.3",
    "tsup": "^6.7.0",
    "vitest": "^3.2.3"
  },
  "keywords": [
    "github-actions",
    "cli",
    "workflow",
    "ci-cd",
    "typescript"
  ]
}
```

## CLI Commands

### Core Commands (Phase 1-2)

### 1. `flughafen synth [files...]` (Migrated)
Synthesize TypeScript workflow files to YAML.

**Features:**
- Process workflow builder files
- Generate GitHub Actions YAML files
- Validate workflow configuration
- Output to `.github/workflows/` directory

**Options:**
- `--output <dir>` - Specify output directory
- `--dry-run` - Show output without writing files
- `--silent` - Suppress output
- `--verbose` - Show detailed output

### 2. `flughafen generate types` (Migrated)
Generate TypeScript types from GitHub Actions schemas.

**Features:**
- Fetch latest GitHub Actions schemas
- Generate type definitions
- Create action input interfaces
- Update local type cache

**Options:**
- `--workflow-dir <dir>` - Workflow directory to scan
- `--output <file>` - Specify output file
- `--github-token <token>` - GitHub token for API access
- `--include-jsdoc` - Include JSDoc in generated types

### 3. `flughafen validate [files...]` (New)
Validate workflow configurations against GitHub Actions schema.

**Features:**
- Schema validation
- Type checking
- Best practice checks
- Security analysis (permissions, secrets)

**Options:**
- `--strict` - Enable strict validation mode
- `--format <json|table>` - Output format
- `--fix` - Auto-fix common issues

### 4. `flughafen watch` (New)
Watch mode for development with hot reloading.

**Features:**
- File system watching
- Automatic synthesis
- Real-time validation
- Development server with live reload

**Options:**
- `--port <number>` - Development server port
- `--open` - Open browser automatically

### Future Commands (Phase 4+)

### 5. `flughafen init` (Future)
Initialize a new Flughafen project in the current directory.

**Features:**
- Create `flughafen.config.ts` configuration file
- Generate initial workflow templates
- Set up project structure
- Interactive prompts for project configuration

**Options:**
- `--template <name>` - Use specific template (basic-ci, npm-publish, docker-build)
- `--typescript` - Generate TypeScript configuration
- `--force` - Override existing files

### 6. `flughafen scaffold` (Future)
Scaffold new workflows, jobs, or actions.

**Features:**
- Interactive workflow creation
- Pre-built templates
- Custom action scaffolding
- Local action generation

**Subcommands:**
- `scaffold workflow` - Create new workflow
- `scaffold action` - Create local action
- `scaffold job` - Create reusable job template

## Configuration

### flughafen.config.ts
```typescript
export interface FlughafenConfig {
  /** Input directory for workflow source files */
  input: string;
  
  /** Output directory for generated workflows */
  output: string;
  
  /** GitHub token for API access */
  githubToken?: string;
  
  /** Templates configuration */
  templates?: {
    /** Custom template directories */
    directories?: string[];
    /** Default template to use */
    default?: string;
  };
  
  /** Validation settings */
  validation?: {
    /** Enable strict mode */
    strict?: boolean;
    /** Custom validation rules */
    rules?: ValidationRule[];
  };
  
  /** Type generation settings */
  types?: {
    /** Actions to generate types for */
    actions?: string[];
    /** Output file for generated types */
    output?: string;
    /** Include JSDoc in generated types */
    includeJSDoc?: boolean;
  };
}

export default {
  input: './workflows',
  output: './.github/workflows',
  templates: {
    default: 'basic-ci'
  },
  validation: {
    strict: true
  },
  types: {
    output: './flughafen-actions.d.ts',
    includeJSDoc: true
  }
} satisfies FlughafenConfig;
```

## Implementation Phases

### Phase 1: Migration of Existing CLI (Week 1)
- [x] Set up package structure and build configuration
- [ ] Extract existing CLI code from `packages/flughafen/src/cli/`
- [ ] Migrate `synth` command functionality
- [ ] Migrate `generate types` command functionality
- [ ] Set up yargs CLI application framework
- [x] Preserve existing CLI behavior and compatibility

### Phase 2: Core CLI Infrastructure (Week 2)
- [ ] Add logging and error handling utilities
- [ ] Set up testing framework for migrated commands
- [ ] Implement configuration file support
- [ ] Add `validate` command
- [ ] Add `watch` command (new functionality)
- [ ] Clean up and remove CLI code from core package

### Phase 3: Enhanced Features (Week 3)
- [ ] Improve CLI user experience (better help, colors, spinners)
- [ ] Add comprehensive error handling
- [ ] Performance optimization
- [ ] Integration testing with core package
- [ ] Update documentation and migration guide

### Phase 4: Future Features (Backlog)
- [ ] Implement `init` command with interactive prompts
- [ ] Create `scaffold` command with templates
- [ ] Add basic templates and scaffolding
- [ ] Web-based workflow designer integration

## Dependencies

### Core Dependencies
- `flughafen` - Core library (workspace dependency)
- `yargs` - Command-line argument parsing
- `chalk` - Terminal string styling
- `chokidar` - File system watching

### Future Dependencies (Phase 4+)
- `ora` - Elegant terminal spinners (for interactive features)
- `prompts` - Lightweight, beautiful prompts (for init/scaffold commands)

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsup` - Build tool
- `vitest` - Testing framework
- `@types/*` - Type definitions

## Testing Strategy

### Unit Tests
- Command logic testing
- Utility function testing
- Template generation testing
- Configuration validation testing

### Integration Tests
- End-to-end CLI command testing
- File system interaction testing
- GitHub API integration testing
- Template rendering testing

### Manual Testing
- CLI user experience testing
- Cross-platform compatibility
- Performance testing with large projects

## Distribution

### NPM Publishing
- Publish as `@flughafen/cli` to NPM registry
- Include binary entry point
- Provide installation instructions
- Set up automated publishing pipeline

### Installation Methods
```bash
# NPM
npm install -g @flughafen/cli

# Yarn
yarn global add @flughafen/cli

# PNPM
pnpm add -g @flughafen/cli

# From workspace (development)
pnpm install
pnpm build
npm link packages/cli
```

## Future Enhancements

### v2.0 Features
- [ ] Web-based workflow designer
- [ ] GitHub integration (direct repository access)
- [ ] Workflow analytics and optimization suggestions
- [ ] Plugin system for custom commands
- [ ] IDE extensions (VS Code, IntelliJ)

### Advanced Templates
- [ ] Multi-environment deployment workflows
- [ ] Security scanning workflows
- [ ] Performance testing workflows
- [ ] Documentation generation workflows

## Success Metrics

- **Developer Experience**: Easy installation and intuitive commands
- **Performance**: Fast synthesis and validation (<1s for typical workflows)
- **Reliability**: 100% test coverage for core functionality
- **Adoption**: Community templates and plugins
- **Compatibility**: Works across all major platforms (Windows, macOS, Linux)

## Migration Plan

### From Current CLI (in core package)
1. **Extract existing CLI code** - Move CLI functionality from `packages/flughafen/src/cli/` to new `packages/cli/`
2. **Preserve command compatibility** - Ensure existing `synth` and `watch` commands work identically
3. **Update workspace configuration** - Update package.json bin entries and workspace configs
4. **Maintain backward compatibility** - Keep old CLI working temporarily with deprecation warnings
5. **Update documentation** - Update all references from old CLI to new CLI package
6. **Remove legacy CLI** - Clean up old CLI code once new package is stable

### Migration Priority
- **Phase 1**: Core commands (`synth`, `generate types`) - existing functionality users rely on
- **Phase 2**: Enhanced commands (`validate`, `watch`) - improved developer experience  
- **Phase 3**: Future commands (`init`, `scaffold`) - new user onboarding and productivity

This CLI package will provide a powerful, user-friendly interface to the Flughafen ecosystem while maintaining clean separation of concerns and enabling independent development and deployment.
