# Reverse Engineering

::: warning Experimental
The reverse engineering feature is experimental. Output may require manual adjustments.
:::

Convert existing YAML workflows to TypeScript.

## Install

```bash
npm install -D flughafen @flughafen/core
```

## CLI

```bash
# Convert single workflow → ./flughafen/workflows/ci.ts
npx flughafen reverse .github/workflows/ci.yml

# Convert entire .github directory (workflows + local actions)
npx flughafen reverse  # .github is default

# Preview without writing
npx flughafen reverse --preview

# Custom output directory
npx flughafen reverse --output ./my-project
```

Output structure:
```
flughafen/
├── workflows/      # Generated workflow TypeScript files
│   ├── ci.ts
│   └── publish.ts
└── actions/        # Generated local action TypeScript files
    └── my-action.ts
```

## Example

**Input:** `.github/workflows/ci.yml`
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm test
```

**Output:** `flughafen/workflows/ci.ts`
```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name("CI")
  .on(["push", "pull_request"])
  .job("test", (job) => job
    .runsOn("ubuntu-latest")
    .step((step) => step.uses("actions/checkout@v4"))
    .step((step) => step
      .uses("actions/setup-node@v4", { "node-version": "22" })
    )
    .step((step) => step.run("npm test"))
  );
```

## Local Actions

Local actions in `.github/actions/` are extracted and imported:

```typescript
import myAction from "./actions/my-action";

// ...
.step((step) => step.uses(myAction, { input: "value" }))
```

Use `--skip-local-actions` to skip extraction.

## Expressions

GitHub Actions expressions are converted to `expr()` helper calls:

```
${{ github.ref }}  →  expr("github.ref")
```

## Workflow

1. `npx flughafen reverse`
2. Review generated TypeScript in `./workflows/`
3. `npx flughafen build --dry-run` to preview YAML
4. `npx flughafen build` to write files

Use `--output ./other-dir` to write to a different directory.

## Next Steps

- [Home](./index) - Quick start guide
- [API Reference](./api) - Full API documentation
