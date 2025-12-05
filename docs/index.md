---
layout: home

hero:
  name: Flughafen
  text: Type-Safe GitHub Actions
  tagline: FLUent GitHub Actions (+ "fen" because it sounds cool). Also German for "airport".
  actions:
    - theme: brand
      text: Get Started
      link: '#quick-start'
    - theme: alt
      text: API Reference
      link: /api
    - theme: alt
      text: GitHub
      link: https://github.com/jpwesselink/flughafen

features:
  - icon: 🎯
    title: Fluent API
    details: Clean builder pattern with full autocomplete

  - icon: 🔒
    title: Type-Safe
    details: TypeScript types from GitHub schemas

  - icon: 🔄
    title: Reverse Engineering
    details: Convert YAML workflows to TypeScript
---

## Quick Start

### 1. Install

```bash
npm install -D flughafen @flughafen/core
```

### 2. Create `workflows/ci.ts`

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

### 3. Build

```bash
npx flughafen build workflows/ci.ts
```

Output: `.github/workflows/ci.yml`

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

Done. Commit and push.

---

## Common Patterns

### Multiple Jobs

```typescript
createWorkflow()
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
      .needs(['lint', 'test']) // Wait for lint and test
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm run build'))
  );
```

### Matrix Builds

```typescript
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
)
```

### Secrets and Environment Variables

```typescript
.step((step) =>
  step
    .run('npm publish')
    .env({ NPM_TOKEN: '${{ secrets.NPM_TOKEN }}' })
)
```

### Conditional Execution

```typescript
.job('deploy', (job) =>
  job
    .runsOn('ubuntu-latest')
    .if("github.ref == 'refs/heads/main'")
    .step((step) => step.run('npm run deploy'))
)
```

### Manual Trigger

```typescript
createWorkflow()
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

## CLI Commands

```bash
# Build all workflows in ./workflows
npx flughafen build

# Build specific file
npx flughafen build workflows/ci.ts

# Build to custom output directory
npx flughafen build workflows/ci.ts --output .github/workflows

# Validate without building
npx flughafen validate workflows/ci.ts

# Convert existing YAML to TypeScript
npx flughafen reverse .github/workflows/ci.yml
```

---

## Next Steps

- [API Reference](./api) - Full API documentation
- [Examples](./examples) - More workflow patterns
- [Reverse Engineering](./reverse-engineering-quick-start) - Convert YAML to TypeScript
