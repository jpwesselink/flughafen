# @flughafen/schema-tools

Internal maintainer tooling for the Flughafen project. This package provides tools to fetch GitHub Actions schemas from SchemaStore and generate TypeScript type definitions.

## ⚠️ Internal Package

This package is **not intended for public use**. It's a private, internal tool used by Flughafen maintainers to keep the type system synchronized with GitHub's official schemas.

## What This Package Does

1. **Fetches Schemas** - Downloads the latest GitHub Actions and Workflow schemas from SchemaStore
2. **Generates Types** - Converts JSON schemas to TypeScript type definitions
3. **Extracts Defaults** - Auto-generates schema-based constants (Node.js runtimes, shell types, permissions, etc.)

## Usage (For Maintainers)

This package is used by the core `flughafen` package via workspace dependencies.

### From the Core Package

```bash
# Fetch latest schemas from SchemaStore
pnpm fetch-schemas

# Generate TypeScript types from schemas
pnpm generate-types

# Do both (fetch + generate)
pnpm schemas

# Clean and regenerate everything
pnpm regen:schemas
```

### Direct Usage (Advanced)

```bash
# Fetch schemas to a specific directory
flughafen-fetch-schemas ./path/to/schemas

# Generate types from schemas
flughafen-generate-types ./path/to/schemas ./path/to/output
```

## What Gets Generated

From the schemas, this tool generates:

1. **`github-workflow.d.ts`** - TypeScript types for workflow YAML files
2. **`github-action.d.ts`** - TypeScript types for action YAML files
3. **`schema-defaults.ts`** - Auto-extracted constants including:
   - Node.js runtime versions (e.g., `DEFAULT_NODE_RUNTIME = "node24"`)
   - Shell types (`ShellType`, `ALL_SHELL_TYPES`)
   - Permission levels (`PermissionLevel`, `PermissionScope`)
   - Branding colors (`BrandingColor`)
   - Machine/architecture types (`MachineType`, `ArchitectureType`)

## When to Run

Maintainers should regenerate schemas when:

- GitHub adds new Node.js runtime versions
- GitHub adds new workflow/action features
- Before major releases
- After SchemaStore updates

## Architecture

```
packages/schema-tools/
├── src/
│   ├── fetch-schemas.ts       # Fetches schemas from SchemaStore
│   ├── generate-types.ts      # Generates TS types from schemas
│   ├── cli-fetch-schemas.ts   # CLI wrapper for fetch
│   ├── cli-generate-types.ts  # CLI wrapper for generate
│   └── index.ts               # Programmatic API
├── package.json
└── tsup.config.ts
```

## Development

```bash
# Build the package
pnpm build

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## Dependencies

- `json-schema-to-typescript` - Converts JSON schemas to TypeScript definitions
- Node.js built-ins (`https`, `fs`, `path`)

## Related Packages

- `flughafen` - Main package that uses the generated types
- `@flughafen/cli` - CLI tool for workflow operations

## License

MIT
