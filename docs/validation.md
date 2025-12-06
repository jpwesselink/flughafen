# Validation

Flughafen validates your workflows for security issues and best practices.

## Install

```bash
npm install -D flughafen @flughafen/core
```

## CLI

```bash
# Validate TypeScript workflows
npx flughafen validate workflows/ci.ts

# Validate YAML files directly
npx flughafen validate .github/workflows/ci.yml

# Validate entire directory
npx flughafen validate .github/workflows/

# Strict mode (warnings become errors)
npx flughafen validate workflows/ --strict
```

## Security Checks

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

These can lead to code injection if the issue title contains malicious commands.

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

# Strict validation (fail on warnings)
npx flughafen build --strict
```

## CI Integration

Add to your CI pipeline:

```yaml
- name: Validate workflows
  run: npx flughafen validate workflows/
```

## Next Steps

- [Quick Start](./index) - Get started with Flughafen
- [Reverse Engineering](./reverse-engineering-quick-start) - Convert YAML to TypeScript
