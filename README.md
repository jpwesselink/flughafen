# Flughafen

[![CI](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml/badge.svg)](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml)

Type-safe GitHub Actions workflows and funding configurations in TypeScript. Autocomplete, validation, and security checks built in.

## Why "Flughafen"?

**Flu**ent **G**it**H**ub **A**ctions. The "fen" is there because not many words start with "flugha". Happens to be German for "airport".

## Features

### 🔧 Workflows
- **Build** — Write workflows in TypeScript with a fluent API. Full autocomplete and type checking.
- **Validate** — Security checks for secrets, vulnerable actions, script injection, and permissions.
- **Reverse** — Convert existing YAML workflows to TypeScript in one command.

### 💰 Funding
- **Analyze** — Parse and validate GitHub FUNDING.yml files with comprehensive error reporting.
- **Generate** — Create TypeScript builders from existing funding configurations.
- **Support** — All 13+ funding platforms (GitHub Sponsors, Patreon, Open Collective, etc.).

## Install

```bash
npm install -D flughafen @flughafen/core
```

## Quick Start

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
      .step((step) => step.run('npm test'))
  );
```

Build:

```bash
npx flughafen build
```

Watch mode for continuous rebuilding:

```bash
npx flughafen build --watch
```

Output: `.github/workflows/ci.yml`

## Funding Configuration

Create `flughafen/funding.ts`:

```typescript
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github(['user1', 'user2'])
  .patreon('creator')
  .openCollective('project')
  .custom('https://donate.example.com');
```

Build:

```bash
npx flughafen build
```

Output: `.github/FUNDING.yml`

## Reverse Engineering

Convert existing files to TypeScript:

```bash
# Convert workflow files
npx flughafen reverse .github/workflows/ci.yml

# Analyze funding configurations
npx flughafen analyze .github/FUNDING.yml

# Generate TypeScript from funding
npx flughafen funding:generate .github/FUNDING.yml
```

## Packages

- **[@flughafen/core](https://www.npmjs.com/package/@flughafen/core)** - Core workflow and funding builders
- **[flughafen](https://www.npmjs.com/package/flughafen)** - CLI

## Documentation

**[jpwesselink.github.io/flughafen](https://jpwesselink.github.io/flughafen/)**

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
