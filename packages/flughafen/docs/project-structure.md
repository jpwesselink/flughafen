# Project Structure

The Flughafen project follows a clean, organized structure that separates generated files from hand-written source code.

## Directory Layout

```
flughafen/
├── src/                        # 📝 Hand-written source code
│   ├── index.ts               # Main entry point & exports
│   ├── cli.ts                 # CLI entry point
│   ├── constants.ts           # Project constants
│   ├── types/                 # 📝 Hand-written types only
│   │   ├── builder-types.ts   # Re-exports & aliases for generated types
│   │   └── builders.ts        # Builder pattern types
│   ├── lib/                   # 📝 Core library code
│   │   ├── actions.ts         # Action utilities
│   │   ├── validation.ts      # Schema validation
│   │   ├── workflow-processor.ts # Workflow processing
│   │   ├── builders/          # Builder pattern classes
│   │   │   ├── ActionBuilder.ts
│   │   │   ├── JobBuilder.ts
│   │   │   ├── LocalActionBuilder.ts
│   │   │   ├── StepBuilder.ts
│   │   │   └── WorkflowBuilder.ts
│   │   ├── commands/          # CLI commands
│   │   │   ├── index.ts
│   │   │   └── synth.ts
│   │   └── schema/            # Schema processing
│   │       ├── TypeGenerator.ts
│   │       └── WorkflowScanner.ts
│   ├── cli/                   # CLI implementation
│   │   ├── cli.ts
│   │   └── watch.ts
│   └── utils/                 # Utilities
│       ├── file-writer.ts
│       ├── module-extractor.ts
│       ├── toKebabCase.ts
│       ├── typescript-compiler.ts
│       ├── workflow-processor.ts
│       └── workflow-sandbox.ts
│
├── schemas/                    # 🤖 Generated JSON schemas
│   ├── github-action.schema.json
│   └── github-workflow.schema.json
│
├── generated/                  # 🤖 All generated TypeScript files
│   ├── README.md              # Explains these are auto-generated
│   └── types/                 # Generated TypeScript definitions
│       ├── github-action.d.ts
│       ├── github-actions.d.ts
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

### 🎯 **Clear Separation of Concerns**
- **Hand-written code** (`src/`) vs **Generated code** (`schemas/`, `generated/`)
- **Core logic** (`src/lib/`) vs **CLI** (`src/cli/`) vs **Types** (`src/types/`)
- **Examples** (`examples/`) vs **Documentation** (`docs/`)

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
