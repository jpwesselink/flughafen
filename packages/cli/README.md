# flughafen

CLI for type-safe GitHub Actions workflows.

**Flu**ent **G**it**H**ub **A**ctions + "fen" (not many words start with "flugha"). German for "airport".

## Install

```bash
npm install -D flughafen @flughafen/core
```

## Commands

```bash
# Build all workflows (flughafen/workflows/ → .github/workflows/)
flughafen build

# Build specific workflow
flughafen build flughafen/workflows/ci.ts

# Watch mode - rebuild on file changes
flughafen build --watch

# Validate all workflows
flughafen validate

# Validate with verbose output (shows validators and timing)
flughafen validate --verbose

# Convert YAML to TypeScript (→ flughafen/workflows/ and flughafen/actions/)
flughafen reverse .github
```

## Validation

The `validate` command runs multiple validators organized into categories:

### Schema Category

Validates workflow structure and syntax:

| Validator | Description | File Types |
|-----------|-------------|------------|
| **Syntax** | Bracket matching, import patterns | TS/JS only |
| **TypeScript** | Type checking via tsc compilation | TS only |
| **Structure** | JSON Schema validation (AJV) - synths TS to YAML first | All |

### Security Category

Checks for security issues:

| Validator | Description | File Types |
|-----------|-------------|------------|
| **Security** | Hardcoded secrets, write-all perms, script injection via user input | All |
| **Vulnerability** | GitHub Security Advisory Database (GHSA) lookup | All |

### Examples

```bash
# Skip security checks
flughafen validate --ignore security

# Skip schema validation
flughafen validate --ignore schema

# Output as JSON
flughafen validate --format json

# Show validators and per-file timing
flughafen validate --verbose
```

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
