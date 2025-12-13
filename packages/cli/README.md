# flughafen

CLI for type-safe GitHub Actions workflows and funding configurations.

**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".

## Install

```bash
npm install -D flughafen @flughafen/core
```

---

## Build

TypeScript in, YAML out. Works for both workflows and funding configurations.

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

**Funding Example:**

```typescript
// flughafen/funding.ts
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github(['sponsor1', 'sponsor2'])
  .patreon('creator')
  .openCollective('project');
```

```bash
npx flughafen build
# → .github/FUNDING.yml
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

## Funding Commands

Analyze, validate, and convert FUNDING.yml files.

```bash
# Analyze existing funding configuration
npx flughafen analyze .github/FUNDING.yml

# Generate TypeScript from FUNDING.yml
npx flughafen funding:generate .github/FUNDING.yml

# Validate funding configuration
npx flughafen funding:validate .github/FUNDING.yml
```

**Example Analysis Output:**
```
FUNDING.yml Analysis:
✓ Valid configuration
✓ 2 platforms configured: github, open_collective
✓ GitHub Sponsors: ["user1", "user2"]
✓ Open Collective: "project-name"
✓ Total funding options: 2
```

---

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
