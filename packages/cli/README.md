# flughafen

CLI for type-safe GitHub Actions workflows.

**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".

## Install

```bash
npm install -D flughafen @flughafen/core
```

---

## Build

TypeScript in, YAML out.

```typescript
// flughafen/workflows/ci.ts
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
# → .github/workflows/ci.yml

# Watch mode
npx flughafen build --watch
```

---

## Validate

Security and schema checks.

```bash
npx flughafen validate
```

```
[ok] ci.ts
  Schema    Structure ✓  Syntax ✓  TypeScript ✓
  Security  Secrets ✓  Permissions ✓  Injection ✓  Vulnerabilities ✓
```

```bash
# Skip security checks
npx flughafen validate --ignore security

# Skip schema validation
npx flughafen validate --ignore schema

# JSON output
npx flughafen validate --format json
```

---

## Reverse

YAML in, TypeScript out.

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

```bash
npx flughafen reverse
# → flughafen/workflows/ci.ts
```

```typescript
// flughafen/workflows/ci.ts
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('CI')
  .on('push')
  .job('test', (job) =>
    job
      .runsOn('ubuntu-latest')
      .step((step) => step.uses('actions/checkout@v4'))
      .step((step) => step.run('npm test'))
  );
```

---

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
