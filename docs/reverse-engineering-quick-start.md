# Reverse Engineering Quick Start

## TL;DR

Convert GitHub Actions YAML workflows to type-safe TypeScript in 3 lines:

```typescript
import { CodeGenerator } from '@flughafen/core/operations/reverse';
import * as yaml from 'yaml';
import * as fs from 'fs';

const generator = new CodeGenerator();
const yamlContent = fs.readFileSync('.github/workflows/ci.yml', 'utf-8');
const workflowData = yaml.parse(yamlContent);
const result = generator.generateWorkflowFromData(workflowData, 'ci.ts');

console.log(result.content);
```

## Installation

```bash
npm install @flughafen/core yaml
```

## Basic Usage

### 1. Convert a Single Workflow

```typescript
import { CodeGenerator } from '@flughafen/core/operations/reverse';
import * as yaml from 'yaml';
import * as fs from 'fs';

const generator = new CodeGenerator();

// Read YAML
const yamlContent = fs.readFileSync('.github/workflows/ci.yml', 'utf-8');
const workflowData = yaml.parse(yamlContent);

// Generate TypeScript
const result = generator.generateWorkflowFromData(workflowData, 'ci.ts');

// Save output
fs.writeFileSync('./workflows/ci.ts', result.content);

console.log('✅ Converted ci.yml → ci.ts');
```

### 2. Convert All Workflows in a Directory

```typescript
import { CodeGenerator } from '@flughafen/core/operations/reverse';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

const generator = new CodeGenerator();
const workflowsDir = '.github/workflows';
const outputDir = './workflows';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all YAML files
const files = fs.readdirSync(workflowsDir)
  .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

for (const file of files) {
  const yamlPath = path.join(workflowsDir, file);
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const workflowData = yaml.parse(yamlContent);

  // Generate TypeScript filename
  const tsFile = file.replace(/\.ya?ml$/, '.ts');

  // Convert
  const result = generator.generateWorkflowFromData(workflowData, tsFile);

  // Save
  const outputPath = path.join(outputDir, tsFile);
  fs.writeFileSync(outputPath, result.content);

  console.log(`✅ ${file} → ${tsFile}`);
}

console.log(`\n🎉 Converted ${files.length} workflows!`);
```

### 3. CLI Usage

```bash
# Convert all workflows in .github directory
flughafen reverse .github/workflows

# Convert a single workflow
flughafen reverse .github/workflows/ci.yml

# Preview without writing files
flughafen reverse .github/workflows --preview

# Output to custom directory
flughafen reverse .github/workflows --output ./workflows
```

Output:
```
🔄 Reverse engineering workflows...

✅ ci.yml → workflows/ci.ts
✅ publish.yml → workflows/publish.ts

🎉 Converted 2 workflows!
```

## Common Patterns

### Pattern 1: Expression Conversion

**YAML Input:**
```yaml
if: ${{ github.event_name == 'push' }}
```

**TypeScript Output:**
```typescript
.if(expr("github.event_name == 'push'"))
```

### Pattern 2: Mixed Content

**YAML Input:**
```yaml
name: Deploy to ${{ matrix.environment }}
```

**TypeScript Output:**
```typescript
.name(`Deploy to ${expr("matrix.environment")}`)
```

### Pattern 3: Complex Objects

**YAML Input:**
```yaml
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

**TypeScript Output:**
```typescript
.concurrency({
  "group": `ci-${expr("github.event.pull_request.number || github.ref")}`,
  "cancel-in-progress": true
})
```

### Pattern 4: Matrix Strategies

**YAML Input:**
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
```

**TypeScript Output:**
```typescript
.strategy({
  "matrix": {
    "os": ["ubuntu-latest", "windows-latest"],
    "node": [18, 20]
  }
})
```

### Pattern 5: Action Steps with Configuration

**YAML Input:**
```yaml
steps:
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
      cache: pnpm
```

**TypeScript Output:**
```typescript
.step((step) => step
  .name("Setup Node.js")
  .uses("actions/setup-node@v4", (action) => action
    .with({
      "node-version": expr("matrix.node-version"),
      "cache": "pnpm"
    })
  )
)
```

## API Reference

### CodeGenerator

```typescript
class CodeGenerator {
  /**
   * Generate TypeScript from workflow data (RECOMMENDED)
   */
  generateWorkflowFromData(
    workflowData: any,
    fileName: string,
    options?: ReverseOptions
  ): GeneratedFile;

  /**
   * Generate TypeScript from analyzed workflow (LEGACY)
   */
  generateWorkflow(
    analysis: WorkflowAnalysis,
    options?: ReverseOptions
  ): GeneratedFile;
}
```

### GeneratedFile

```typescript
interface GeneratedFile {
  path: string;      // Output file path
  content: string;   // Generated TypeScript code
  type: 'workflow' | 'action' | 'local-action';
}
```

### ReverseOptions

```typescript
interface ReverseOptions {
  outputDir?: string;              // Output directory (default: './workflows')
  preserveComments?: boolean;      // Preserve YAML comments (default: false)
  extractLocalActions?: boolean;   // Extract local actions (default: false)
}
```

## Expression Helper

The `expr()` helper function converts TypeScript expressions back to GitHub Actions syntax:

```typescript
import { expr } from '@flughafen/core';

// At compile time
const condition = expr("github.event_name == 'push'");

// At runtime, expr() returns
// "${{ github.event_name == 'push' }}"
```

### When expr() is Imported

The code generator automatically imports `expr` only when needed:

```typescript
// Without expressions
import { createWorkflow } from '@flughafen/core';

// With expressions
import { createWorkflow, expr } from '@flughafen/core';
```

## Troubleshooting

### Issue: Module not found

```
Error: Cannot find module 'flughafen/operations/reverse'
```

**Solution**: Ensure you're importing from the correct path:

```typescript
// ✅ Correct
import { CodeGenerator } from '@flughafen/core/operations/reverse';

// ❌ Wrong
import { CodeGenerator } from '@flughafen/core';
```

### Issue: Invalid YAML

```
Error: YAML parse error at line 15
```

**Solution**: Validate your YAML first:

```typescript
try {
  const workflowData = yaml.parse(yamlContent);
} catch (error) {
  console.error('Invalid YAML:', error.message);
  process.exit(1);
}
```

### Issue: Missing Properties

Generated code missing some workflow properties.

**Solution**: Check the schema coverage. Some properties might not be in the schema yet. File an issue with:
- YAML workflow
- Expected TypeScript output
- Actual TypeScript output

### Issue: Incorrect Expression Conversion

Expressions not converted properly.

**Solution**: Check for edge cases:

```typescript
// If expressions aren't being detected
console.log(exprConverter.hasExpression("${{ github.ref }}"));
// Should print: true

// If conversion is wrong
console.log(exprConverter.convertToExpr("${{ github.ref }}"));
// Should print: expr("github.ref")
```

## Testing Your Conversion

### 1. Validate Syntax

```typescript
import { CodeGenerator } from '@flughafen/core/operations/reverse';
import * as ts from 'typescript';

const result = generator.generateWorkflowFromData(workflowData, 'ci.ts');

// Parse TypeScript
const sourceFile = ts.createSourceFile(
  'ci.ts',
  result.content,
  ts.ScriptTarget.Latest,
  true
);

// Check for errors
if (sourceFile.parseDiagnostics?.length) {
  console.error('TypeScript parse errors:', sourceFile.parseDiagnostics);
}
```

### 2. Validate Structure

```typescript
const result = generator.generateWorkflowFromData(workflowData, 'ci.ts');

// Check for required elements
const checks = {
  hasImport: result.content.includes('import {'),
  hasCreateWorkflow: result.content.includes('createWorkflow()'),
  hasExport: result.content.includes('export default'),
  hasExpr: result.content.includes('expr('),
};

console.log('Validation:', checks);
```

### 3. Validate Expressions

```typescript
import { ExpressionConverter } from '@flughafen/core/operations/reverse';

const converter = new ExpressionConverter();

const tests = [
  { input: "${{ github.ref }}", expected: 'expr("github.ref")' },
  { input: "Deploy to ${{ matrix.env }}", expected: '`Deploy to ${expr("matrix.env")}`' },
];

for (const test of tests) {
  const output = converter.convertToExpr(test.input);
  console.log(output === test.expected ? '✅' : '❌', test.input);
}
```

## Best Practices

### 1. Version Control

Always commit generated TypeScript alongside YAML:

```bash
git add .github/workflows/*.yml
git add workflows/*.ts
git commit -m "feat: add TypeScript workflows"
```

### 2. CI/CD Integration

Validate conversion in CI:

```yaml
# .github/workflows/validate-workflows.yml
name: Validate Workflows

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run convert-workflows
      - run: npm run typecheck
```

### 3. Incremental Migration

Migrate workflows one at a time:

1. Convert workflow: `ci.yml` → `ci.ts`
2. Test in TypeScript
3. Validate YAML output matches
4. Keep both until confident
5. Remove YAML when ready

### 4. Documentation

Document custom patterns:

```typescript
/**
 * CI Workflow
 *
 * Runs tests on:
 * - Push to main
 * - Pull requests
 * - Manual dispatch
 *
 * Matrix strategy:
 * - Node: 18, 20
 * - OS: ubuntu, windows
 */
export default createWorkflow()
  .name("CI")
  // ...
```

## Examples

### Example 1: Simple CI

**YAML:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm test
```

**TypeScript:**
```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name("CI")
  .on(["push", "pull_request"])
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step
      .uses("actions/checkout@v4")
    )
    .step((step) => step
      .uses("actions/setup-node@v4")
    )
    .step((step) => step
      .run("npm test")
    )
  );
```

### Example 2: Matrix Build

**YAML:**
```yaml
name: Test Matrix
on: push
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

**TypeScript:**
```typescript
import { createWorkflow, expr } from '@flughafen/core';

export default createWorkflow()
  .name("Test Matrix")
  .on("push")
  .job("test", (job) => job
    .strategy({
      "matrix": {
        "node": [18, 20],
        "os": ["ubuntu-latest", "windows-latest"]
      }
    })
    .runsOn(expr("matrix.os"))
    .step((step) => step
      .uses("actions/setup-node@v4", (action) => action
        .with({
          "node-version": expr("matrix.node")
        })
      )
    )
  );
```

### Example 3: Conditional Execution

**YAML:**
```yaml
name: Deploy
on: push
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
        if: success()
```

**TypeScript:**
```typescript
import { createWorkflow, expr } from '@flughafen/core';

export default createWorkflow()
  .name("Deploy")
  .on("push")
  .job("deploy", (job) => job
    .if(expr("github.ref == 'refs/heads/main'"))
    .runsOn("ubuntu-latest")
    .step((step) => step
      .run("npm run deploy")
      .if(expr("success()"))
    )
  );
```

## Next Steps

- Check [API Documentation](./api.md) for complete API reference
- See [Examples](./examples.md) for more conversion examples
- Review [Roundtrip Validation](./roundtrip-validation-gaps.md) for testing status

## Getting Help

- **Issues**: https://github.com/jpwesselink/flughafen/issues
- **Examples**: `examples/real-world-examples/`

## Contributing

Found a workflow that doesn't convert properly? Please contribute!

1. Add the workflow to `examples/real-world-examples/`
2. Create a test in `src/operations/reverse/__tests__/`
3. Submit a PR with fix
