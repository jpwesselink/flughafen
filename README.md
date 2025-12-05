# Flughafen 🛫

[![CI](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml/badge.svg)](https://github.com/jpwesselink/flughafen/actions/workflows/ci.yml)

**FLU**ent **G**itHub **A**ctions (+ "fen" because it sounds cool). Also German for "airport".

Type-safe GitHub Actions workflows in TypeScript.

## Install

```bash
npm install -D flughafen @flughafen/core
```

## Quick Start

Create `workflows/ci.ts`:

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
npx flughafen build workflows/ci.ts
```

Output: `.github/workflows/ci.yml`

## Packages

- **[@flughafen/core](https://www.npmjs.com/package/@flughafen/core)** - Core workflow builder
- **[flughafen](https://www.npmjs.com/package/flughafen)** - CLI

## Documentation

📖 **[jpwesselink.github.io/flughafen](https://jpwesselink.github.io/flughafen/)**

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
