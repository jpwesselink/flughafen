# @flughafen/core

**FLU**ent **G**itHub **A**ctions (+ "fen" because it sounds cool). Also German for "airport".

Type-safe GitHub Actions workflow builder for TypeScript.

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
npx flughafen build workflows/ci.ts
```

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [API Reference](https://jpwesselink.github.io/flughafen/api)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
