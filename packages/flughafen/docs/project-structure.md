# Project Structure

The Flughafen project follows a clean, domain-driven architecture that separates concerns and ensures maintainability.

## Directory Layout

```
flughafen/
├── src/                        # 📝 Hand-written source code
│   ├── index.ts               # Main entry point & exports
│   ├── constants.ts           # Project constants
│   │
│   ├── core/                  # 🏗️ Core workflow building functionality
│   │   ├── builders/          # Builder pattern classes
│   │   │   ├── ActionBuilder.ts
│   │   │   ├── JobBuilder.ts
│   │   │   ├── LocalActionBuilder.ts
│   │   │   ├── StepBuilder.ts
│   │   │   ├── WorkflowBuilder.ts
│   │   │   ├── Builder.ts     # Base builder interface
│   │   │   ├── index.ts       # Barrel exports
│   │   │   └── types.ts       # Builder types
│   │   ├── validation/        # Schema validation
│   │   │   ├── workflow.ts    # Workflow validation
│   │   │   ├── index.ts       # Barrel exports
│   │   │   └── types.ts       # Validation types
│   │   ├── index.ts           # Core domain exports
│   │   └── types.ts           # Shared core types
│   │
│   ├── cli/                   # 🖥️ Command-line interface
│   │   ├── commands/          # CLI commands
│   │   │   ├── synth.ts       # Synth command
│   │   │   ├── index.ts       # Command exports
│   │   │   └── types.ts       # Command types
│   │   ├── cli.ts             # Main CLI implementation
│   │   ├── watch.ts           # Watch mode
│   │   ├── index.ts           # CLI domain exports
│   │   └── types.ts           # CLI types
│   │
│   ├── processing/            # ⚙️ File processing and compilation
│   │   ├── compiler/          # TypeScript compilation
│   │   │   ├── typescript-compiler.ts
│   │   │   ├── index.ts       # Compiler exports
│   │   │   └── types.ts       # Compiler types
│   │   ├── workflow/          # Workflow processing
│   │   │   ├── workflow-processor.ts
│   │   │   ├── workflow-sandbox.ts
│   │   │   ├── processor-types.ts
│   │   │   ├── index.ts       # Workflow exports
│   │   │   └── types.ts       # Workflow types
│   │   ├── file/              # File operations
│   │   │   ├── file-writer.ts
│   │   │   ├── module-extractor.ts
│   │   │   ├── index.ts       # File exports
│   │   │   └── types.ts       # File types
│   │   ├── index.ts           # Processing domain exports
│   │   └── types.ts           # Shared processing types
│   │
├── schemas/                    # 🤖 Generated JSON schemas
│   ├── schema/                 # 📋 Schema management and type generation
│   │   ├── fetchers/          # Schema fetching
│   │   │   ├── ActionSchemaFetcher.ts
│   │   │   ├── index.ts       # Fetcher exports
│   │   │   └── types.ts       # Fetcher types
│   │   ├── managers/          # Schema management
│   │   │   ├── SchemaManager.ts
│   │   │   ├── WorkflowScanner.ts
│   │   │   ├── index.ts       # Manager exports
│   │   │   └── types.ts       # Manager types
│   │   ├── generators/        # Type generation
│   │   │   ├── TypeGenerator.ts
│   │   │   ├── index.ts       # Generator exports
│   │   │   └── types.ts       # Generator types
│   │   ├── index.ts           # Schema domain exports
│   │   └── types.ts           # Schema-specific types (legacy)
│   │
│   ├── utils/                 # 🛠️ General utilities
│   │   ├── string/            # String utilities
│   │   │   ├── toKebabCase.ts
│   │   │   ├── index.ts       # String exports
│   │   │   └── types.ts       # String types
│   │   ├── index.ts           # Utils domain exports
│   │   └── types.ts           # Utility types
│   │
│   └── types/                 # 📝 Centralized type exports
│       ├── builder-types.ts   # Comprehensive type definitions
│       ├── builders.ts        # Legacy builder types
│       ├── github.ts          # GitHub-specific types
│       └── index.ts           # Main type exports
│
├── schemas/                    # 🤖 Generated JSON schemas
│   ├── github-action.schema.json
│   └── github-workflow.schema.json
│
├── generated/                  # 🤖 All generated TypeScript files
│   ├── README.md              # Explains these are auto-generated
│   └── types/                 # Generated TypeScript definitions
│       ├── github-action.d.ts
│       └── github-workflow.d.ts
│
├── scripts/                    # 🛠️ Build & generation scripts
│   ├── fetch-schemas.ts       # Downloads latest GitHub schemas
│   └── generate-types.ts      # Generates TypeScript from schemas
│
├── examples/                   # 📘 Example workflows
├── docs/                      # 📚 Documentation
├── dist/                      # 📦 Built output (ignored)
└── coverage/                  # 📊 Test coverage reports (ignored)
```

## Key Benefits of This Structure

### 🎯 **Domain-Driven Architecture**
- **Core domain** (`src/core/`) - Workflow building and validation
- **CLI domain** (`src/cli/`) - Command-line interface
- **Processing domain** (`src/processing/`) - File compilation and processing
- **Schema domain** (`src/schema/`) - Schema management and type generation
- **Utils domain** (`src/utils/`) - General-purpose utilities

### 🔒 **Type Safety & Testing**
- In-source type tests using Vitest's `expectTypeOf`
- Comprehensive type validation for all domain interfaces
- Clear separation between domain types and legacy types

### 🤖 **Generated Files Organization**
- `schemas/` - JSON schemas fetched from GitHub's official schema store
- `generated/types/` - TypeScript definitions auto-generated from schemas
- Clear README in `generated/` warns against manual editing

### 🔄 **Development Workflow**
1. `pnpm run fetch-schemas` - Downloads latest GitHub Action/Workflow schemas
2. `pnpm run generate-types` - Generates TypeScript definitions from schemas  
3. `pnpm run build` - Builds the library (auto-runs generate-types first)
4. `pnpm run clean:generated` - Removes all downloaded schemas and generated types
5. `pnpm run regen` - Complete regeneration (clean + fetch + generate)

### 📁 **Import Patterns**
```typescript
// Generated types (from schemas)
import type { Event, NormalJob } from "../../generated/types/github-workflow";

// Hand-written types & utilities
import type { JobConfig } from "../types/builder-types";
import { createJob } from "../lib/builders/JobBuilder";
```

### 🎭 **Type Strategy: Hybrid Approach**
- **Generated types**: In `generated/types/` (from JSON schemas)
- **Builder types**: In `src/types/` (re-exports + convenience aliases)
- **Utility types**: Co-located with source code that uses them

This approach provides the best of both worlds: clear separation of generated vs. hand-written code, while keeping related types close to their usage.
