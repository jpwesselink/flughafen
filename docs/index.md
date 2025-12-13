---
layout: home

hero:
  name: Flughafen
  text: Type-Safe GitHub Actions
  tagline: Write workflows and funding configurations in TypeScript. Autocomplete, validation, and security checks built in. Works with existing YAML.
  actions:
    - theme: brand
      text: Get Started
      link: /quick-start
    - theme: alt
      text: API Reference
      link: /api
    - theme: alt
      text: GitHub
      link: https://github.com/jpwesselink/flughafen

features:
  - title: Build Workflows
    details: Write workflows in TypeScript with a fluent API. Compiles to YAML with full autocomplete and type checking.
    link: /build

  - title: Build Funding
    details: Create type-safe FUNDING.yml configurations. Supports all 13+ platforms with validation and TypeScript generation.
    link: /funding

  - title: Validate & Secure
    details: Security checks for secrets, vulnerable actions, script injection, and permissions. Schema validation included.
    link: /validation

  - title: Reverse Engineer
    details: Convert existing YAML workflows and funding configs to TypeScript. Migrate your .github/ in one command.
    link: /reverse-engineering-quick-start
---

::: tip Why "Flughafen"?
**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".
:::

## Install

```bash
npm install -D flughafen @flughafen/core
```

---

## Build

TypeScript in, YAML out. [More examples](./build)

```typescript
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('CI')
  .on('push', { branches: ['main'] })
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm test'))
  );
```

```bash
npx flughafen build
# or watch mode
npx flughafen build --watch
```

::: tip Git Workflow
Use watch mode during development, or set up [pre-commit hooks](./build#git-workflow) to auto-build.
:::

---

## Validate

Security and schema checks. [More examples](./validation)

```bash
npx flughafen validate
```

```
[ok] ci.ts
  Schema    Structure ✓  Syntax ✓  TypeScript ✓
  Security  Secrets ✓  Permissions ✓  Injection ✓  Vulnerabilities ✓
```

### Git Hooks

Validate before pushing with [Husky](https://typicode.github.io/husky/):

```bash
npm install -D husky && npx husky init
echo "npx flughafen validate" > .husky/pre-push
```

---

## Reverse

YAML in, TypeScript out. [More examples](./reverse-engineering-quick-start)

```bash
npx flughafen reverse
```

```yaml
# .github/workflows/ci.yml
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

```typescript
// flughafen/workflows/ci.ts
import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
  .name("CI")
  .on("push")
  .job("test", (job) =>
    job
      .runsOn("ubuntu-latest")
      .step((step) => step.uses("actions/checkout@v4"))
      .step((step) => step.run("npm test"))
  );
```

---

## Funding

Type-safe FUNDING.yml configurations. [More examples](./funding)

```typescript
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github(['sponsor1', 'sponsor2'])
  .patreon('creator')
  .openCollective('project')
  .kofi('supporter')
  .custom(['https://donate.example.com']);
```

```bash
npx flughafen build
# → .github/FUNDING.yml
```

### Analyze Existing Configurations

```bash
npx flughafen analyze .github/FUNDING.yml
npx flughafen funding:generate .github/FUNDING.yml
```
