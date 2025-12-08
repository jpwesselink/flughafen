# Quick Start

Get up and running in 2 minutes.

## 1. Install

::: code-group
```bash [npm]
npm install -D flughafen @flughafen/core
```
```bash [pnpm]
pnpm add -D flughafen @flughafen/core
```
```bash [yarn]
yarn add -D flughafen @flughafen/core
```
:::

## 2. Create a workflow

Create `flughafen/workflows/ci.ts`:

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('CI')
  .on('push', { branches: ['main'] })
  .on('pull_request')
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.uses('actions/setup-node@v4', { 'node-version': '22' }))
      .step((step) => step.run('npm ci'))
      .step((step) => step.run('npm test'))
  );
```

## 3. Build

```bash
npx flughafen build
```

::: tip Watch Mode
Use `--watch` to automatically rebuild when files change:
```bash
npx flughafen build --watch
```
:::

This compiles to `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches:
      - main
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
```

## 4. Commit and push

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push
```

Done.

---

## Validate in CI

Add validation to your CI pipeline to catch issues on pull requests.

### GitHub Actions

Add a validate step to your workflow:

```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npx flughafen validate
```

### With Husky (pre-push)

Validate before pushing to remote:

```bash
# Install husky
npm install -D husky
npx husky init

# Add pre-push hook
echo "npx flughafen validate" > .husky/pre-push
```

::: tip
Use `pre-push` instead of `pre-commit` - validation can be slow with many workflows.
:::

---

## Next Steps

- [Build](./build) - More workflow patterns and examples
- [Validate](./validation) - Security and schema validation
- [Reverse](./reverse-engineering-quick-start) - Convert existing YAML to TypeScript
- [API Reference](./api) - Full API documentation
