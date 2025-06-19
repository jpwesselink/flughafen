# Schema Analysis and Type Generation

This directory contains Flughafen's schema analysis and type generation system, which provides type-safe `.with()` calls for GitHub Actions.

## Overview

The schema analysis system automatically:

1. **Scans workflows** for GitHub Action usage
2. **Fetches action schemas** from GitHub repositories
3. **Generates TypeScript interfaces** for action inputs
4. **Creates type definitions** for type-safe usage

## Components

### WorkflowScanner

Scans workflow configurations (both built objects and YAML files) to extract GitHub Action references.

```typescript
import { WorkflowScanner } from 'flughafen';

const scanner = new WorkflowScanner();
const actionRefs = scanner.scanWorkflow(workflow);
// Returns: [{ action: 'actions/checkout@v4', owner: 'actions', name: 'checkout', version: 'v4' }]
```

### ActionSchemaFetcher

Fetches `action.yml` files from GitHub repositories and parses them into structured schemas.

```typescript
import { ActionSchemaFetcher } from 'flughafen';

const fetcher = new ActionSchemaFetcher({
  githubToken: process.env.GITHUB_TOKEN, // Optional for public repos
  cacheDir: '.flughafen-cache'
});

const schemas = await fetcher.fetchSchemas(actionRefs);
```

### TypeGenerator

Generates TypeScript interfaces from action schemas.

```typescript
import { TypeGenerator } from 'flughafen';

const generator = new TypeGenerator({
  includeJSDoc: true,
  optionalDefaults: true
});

const interfaces = generator.generateInterfaces(schemas);
// Generates: ActionsCheckoutV4Inputs, ActionsSetupNodeV4Inputs, etc.
```

### SchemaManager

Orchestrates the complete workflow from scanning to generating the final types file.

```typescript
import { SchemaManager } from 'flughafen';

const manager = new SchemaManager({
  typesFilePath: './flughafen-uses.d.ts',
  includeJSDoc: true
});

// Generate from in-memory workflows
const result = await manager.generateTypesFromWorkflows([workflow1, workflow2]);

// Or scan and generate from workflow files
const result = await manager.generateTypesFromWorkflowFiles();
```

## Usage

### 1. Basic Type Generation

```typescript
import { createWorkflow, SchemaManager } from 'flughafen';

// Create your workflows
const workflow = createWorkflow()
  .name('CI')
  .onPush()
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .uses('actions/checkout@v4')
      .with({ repository: 'owner/repo' })
    )
  );

// Generate types
const manager = new SchemaManager();
await manager.generateTypesFromWorkflows([workflow]);
```

This creates a `flughafen-uses.d.ts` file with:

```typescript
// Generated interfaces
export interface ActionsCheckoutV4Inputs {
  repository?: string;
  ref?: string;
  token?: string;
  // ... all other inputs with JSDoc
}

// Module augmentation for type safety
declare module 'flughafen' {
  interface StepBuilder {
    with(inputs: ActionsCheckoutV4Inputs): this;
  }
}
```

### 2. Using Generated Types

```typescript
import './flughafen-uses'; // Import the generated types

const workflow = createWorkflow()
  .job('build', job => job
    .step(step => step
      .uses('actions/checkout@v4')
      .with({
        repository: 'owner/repo',  // ✅ Type-safe!
        ref: 'main',               // ✅ Type-safe!
        // invalidProp: 'test',    // ❌ TypeScript error!
      })
    )
  );
```

### 3. CLI Integration (Future)

```bash
# Scan current directory and generate types
flughafen generate-types

# Scan specific directory
flughafen generate-types --workflow-dir ./workflows

# Watch for changes
flughafen generate-types --watch
```

## Configuration

### SchemaManagerConfig

```typescript
interface SchemaManagerConfig {
  /** Directory to scan for workflow files */
  workflowDir?: string;
  
  /** Output path for the generated types file */
  typesFilePath?: string;
  
  /** GitHub token for API access (for rate limiting) */
  githubToken?: string;
  
  /** Whether to include JSDoc comments */
  includeJSDoc?: boolean;
  
  /** Cache directory for schemas */
  cacheDir?: string;
}
```

### TypeGeneratorConfig

```typescript
interface TypeGeneratorConfig {
  /** Whether to generate optional properties for inputs with defaults */
  optionalDefaults?: boolean;
  
  /** Whether to include JSDoc comments in generated types */
  includeJSDoc?: boolean;
  
  /** Custom type mappings for specific actions */
  typeOverrides?: Record<string, Record<string, string>>;
}
```

## Generated Output

The system generates TypeScript interfaces with:

- **Proper naming**: `actions/checkout@v4` → `ActionsCheckoutV4Inputs`
- **JSDoc comments**: Descriptions, default values, and usage hints
- **Correct optionality**: Required vs optional inputs based on schema
- **Type inference**: String, boolean, number, and choice types
- **Module augmentation**: Type-safe `.with()` method overloads

## Caching

The system caches fetched schemas to avoid repeated API calls:

- **Memory cache**: During a single generation run
- **File cache**: Across runs (future enhancement)
- **TTL support**: Configurable cache expiration

## Error Handling

The system gracefully handles:

- **Network failures**: Continues with other actions
- **Invalid schemas**: Creates fallback minimal schemas
- **Rate limiting**: Uses GitHub tokens when provided
- **Parse errors**: Logs warnings and continues

## Integration with Build Tools

### Development Workflow

1. **Write workflows** using Flughafen builders
2. **Generate types** using SchemaManager
3. **Import types** in your workflow files
4. **Get type safety** for `.with()` calls

### CI/CD Integration

```yaml
- name: Generate Flughafen Types
  run: flughafen generate-types
  
- name: Check Types
  run: tsc --noEmit
```

## Advanced Usage

### Custom Type Overrides

```typescript
const generator = new TypeGenerator({
  typeOverrides: {
    'actions/checkout@v4': {
      'fetch-depth': 'number', // Override default string type
    }
  }
});
```

### Filtering Actions

```typescript
const scanner = new WorkflowScanner();
const allActions = scanner.scanWorkflow(workflow);
const checkoutActions = scanner.filterByOwner(allActions, 'actions');
```

### Multiple Workflow Sources

```typescript
const manager = new SchemaManager();

// Combine multiple sources
const workflows = [...inMemoryWorkflows];
const yamlActions = scanner.scanWorkflowYaml(fs.readFileSync('ci.yml', 'utf-8'));
const allActions = [...workflows.flatMap(w => scanner.scanWorkflow(w)), ...yamlActions];

await manager.generateTypesFromActions(allActions);
```

## Performance

- **Parallel fetching**: Multiple schemas fetched concurrently
- **Deduplication**: Same actions only fetched once
- **Incremental updates**: Only changed schemas are re-fetched (future)
- **Minimal parsing**: Only extracts necessary schema information

## Future Enhancements

- **File watching**: Auto-regenerate on workflow changes
- **Incremental builds**: Only update changed schemas
- **Custom registries**: Support for private action registries
- **Schema validation**: Validate action usage against schemas
- **IDE integration**: VS Code extension for real-time validation
