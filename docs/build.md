# Build

Write workflows in TypeScript, compile to YAML.

## Basic Usage

```bash
npx flughafen build
```

Compiles all workflows from `flughafen/workflows/` to `.github/workflows/`.

## Simple Workflow

**Input:** `flughafen/workflows/ci.ts`

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
      .step((step) => step.run('npm test'))
  );
```

**Output:** `.github/workflows/ci.yml`

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
      - run: npm test
```

---

## Multiple Jobs

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('CI')
  .on('push')
  .job('lint', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm run lint'))
  )
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm test'))
  )
  .job('build', (job) =>
    job
      .runsOn('ubuntu-latest')
      .needs(['lint', 'test'])
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm run build'))
  );
```

---

## Matrix Builds

Test across multiple versions:

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('Test Matrix')
  .on('push')
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .strategy({
        matrix: {
          'node-version': ['18', '20', '22'],
        },
      })
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) =>
        step.uses('actions/setup-node@v4', {
          'node-version': '${{ matrix.node-version }}',
        })
      )
      .step((step) => step.run('npm test'))
  );
```

---

## Secrets and Environment Variables

```typescript
.step((step) =>
  step
    .name('Publish to npm')
    .run('npm publish')
    .env({ NPM_TOKEN: '${{ secrets.NPM_TOKEN }}' })
)
```

---

## Conditional Execution

```typescript
.job('deploy', (job) =>
  job
    .runsOn('ubuntu-latest')
    .if("github.ref == 'refs/heads/main'")
    .step((step) => step.run('npm run deploy'))
)
```

---

## Manual Trigger (workflow_dispatch)

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('Deploy')
  .on('workflow_dispatch', {
    inputs: {
      environment: {
        description: 'Target environment',
        required: true,
        type: 'choice',
        options: ['staging', 'production'],
      },
    },
  })
  .job('deploy', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.run('echo "Deploying to ${{ inputs.environment }}"'))
  );
```

---

## Scheduled Workflows (cron)

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('Nightly Build')
  .on('schedule', [{ cron: '0 0 * * *' }])
  .job('build', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm run build'))
  );
```

---

## Permissions

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('Release')
  .on('push', { tags: ['v*'] })
  .permissions({ contents: 'write' })
  .job('release', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm run release'))
  );
```

---

## CLI Options

```bash
# Build all workflows
npx flughafen build

# Build specific file
npx flughafen build flughafen/workflows/ci.ts

# Watch mode - rebuild on changes
npx flughafen build --watch

# Dry run (preview without writing)
npx flughafen build --dry-run

# Skip validation
npx flughafen build --skip-validation

# Custom output directory
npx flughafen build --output .github/workflows
```

---

## Git Workflow

Since `build` generates YAML files, you need a strategy to keep them in sync with your TypeScript sources.

### Option 1: Watch Mode (recommended)

Run watch mode during development:

```bash
npx flughafen build --watch
```

YAML stays in sync as you edit. Commit both TypeScript and YAML together.

### Option 2: Pre-commit with lint-staged

Auto-build and stage generated files on commit:

```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "flughafen/**/*.ts": [
      "flughafen build",
      "git add .github"
    ]
  }
}
```

```bash
echo "npx lint-staged" > .husky/pre-commit
```

### Option 3: Pre-commit check

Fail if YAML is out of sync, prompt to rebuild:

```bash
# .husky/pre-commit
npx flughafen build
git diff --exit-code .github/workflows/ || {
  echo "YAML out of sync. Add the changes and commit again."
  exit 1
}
```

---

## CI Integration

Run build in CI to verify YAML stays in sync:

```yaml
- name: Build workflows
  run: npx flughafen build

- name: Check for uncommitted changes
  run: git diff --exit-code .github/workflows/
```
