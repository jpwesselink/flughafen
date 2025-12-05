# flughafen

**FLU**ent **G**itHub **A**ctions (+ "fen" because it sounds cool). Also German for "airport".

CLI for building type-safe GitHub Actions workflows.

## Install

```bash
npm install -D flughafen @flughafen/core
```

## Commands

```bash
# Build TypeScript workflows to YAML
flughafen build workflows/ci.ts

# Build all workflows in ./workflows
flughafen build

# Validate workflows
flughafen validate workflows/ci.ts

# Convert YAML to TypeScript (experimental)
flughafen reverse .github/workflows/ci.yml
```

## Documentation

- [Full Documentation](https://jpwesselink.github.io/flughafen/)
- [GitHub](https://github.com/jpwesselink/flughafen)

## License

MIT
