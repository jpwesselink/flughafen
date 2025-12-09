# @flughafen/core

Type-safe GitHub Actions workflow builder for TypeScript.

**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".

## Install

```bash
npm install @flughafen/core
```

## Quick Start

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

Build with the CLI:

```bash
npx flughafen build
```

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [API Reference](https://jpwesselink.github.io/flughafen/api)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
