# @flughafen/core

Type-safe GitHub Actions workflow and funding configuration builder for TypeScript.

**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".

## Install

```bash
npm install @flughafen/core
```

## Quick Start

### Workflows

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

### Funding

```typescript
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github(['sponsor1', 'sponsor2'])
  .patreon('creator')
  .openCollective('project')
  .kofi('supporter')
  .custom(['https://donate.example.com', 'https://support.example.org']);
```

Build with the CLI:

```bash
npx flughafen build
```

## Features

### 🔧 Workflow Builder
- **Type-safe API** - Full TypeScript support with autocomplete and validation
- **Fluent interface** - Chain methods for readable workflow definitions
- **Expression support** - GitHub expressions with type checking
- **Reusable workflows** - Support for `workflow_call` and reusable components
- **Local actions** - Import and use local action definitions

### 💰 Funding Builder
- **All platforms** - Support for 13+ funding platforms
- **Multiple sponsors** - Arrays for GitHub sponsors and custom URLs
- **Validation** - JSON Schema validation with detailed error reporting
- **TypeScript generation** - Convert FUNDING.yml to TypeScript builders
- **Roundtrip testing** - Verify YAML ↔ TypeScript conversion accuracy

### 🔍 Analysis Tools
- **YAML parsing** - Parse and analyze existing configurations
- **Schema validation** - Comprehensive validation with helpful error messages
- **Real-world testing** - Tested with actual open-source project configurations

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [API Reference](https://jpwesselink.github.io/flughafen/api)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
