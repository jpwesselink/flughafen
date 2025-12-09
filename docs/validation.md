# Validation

Flughafen validates your workflows for security issues and best practices.

## Install

```bash
npm install -D flughafen @flughafen/core
```

## CLI

```bash
# Validate all workflows (default: flughafen/workflows/)
npx flughafen validate

# Validate specific TypeScript workflow
npx flughafen validate flughafen/workflows/ci.ts

# Validate YAML files directly
npx flughafen validate .github/workflows/ci.yml

# Validate entire directory
npx flughafen validate .github/workflows/
```

## Security Checks

### Vulnerable Actions

Checks actions against [GitHub Advisory Database](https://github.com/advisories?query=ecosystem%3Aactions):

```
❌ tj-actions/changed-files@v45: Potential Actions command injection
   (patched in 41) [GHSA-mcph-m25j-8j63]
```

Skip with `--ignore security` if needed (e.g., for offline use).

### Hardcoded Secrets

Detects patterns like:
- `password: "secret123"`
- `api_key: "abc123"`
- `token: "xyz"`

### Overly Permissive Permissions

Warns about:
```yaml
permissions: write-all  # Too broad
```

### Script Injection

Detects untrusted input in `run:` blocks:
```yaml
# Dangerous - user input directly in script
run: echo "${{ github.event.issue.title }}"
```

### Expression Validation

Validates `${{ }}` expression syntax and context access.

## Best Practices

- Workflow structure validation
- TypeScript syntax checking
- GitHub Actions schema compliance
- Step/job naming conventions

## Integration with Build

Validation runs automatically during `flughafen build`:

```bash
# Build with validation (default)
npx flughafen build

# Skip validation
npx flughafen build --skip-validation

# Skip specific validation categories
npx flughafen build --ignore security
```

## CI Integration

Add to your CI pipeline:

```yaml
- name: Validate workflows
  run: npx flughafen validate
```

## Git Hooks

Validate before pushing with [Husky](https://typicode.github.io/husky/):

```bash
npm install -D husky && npx husky init
echo "npx flughafen validate" > .husky/pre-push
```

## Next Steps

- [Quick Start](./index) - Get started with Flughafen
- [Reverse Engineering](./reverse-engineering-quick-start) - Convert YAML to TypeScript
