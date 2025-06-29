# Generated Files

⚠️ **DO NOT EDIT FILES IN THIS DIRECTORY** ⚠️

This directory contains auto-generated TypeScript definitions and other generated assets.

## Contents

- `types/` - TypeScript definitions generated from JSON schemas
  - `github-action.d.ts` - GitHub Action schema types
  - `github-actions.d.ts` - GitHub Actions schema types  
  - `github-workflow.d.ts` - GitHub Workflow schema types

## Regeneration

To regenerate these files:

```bash
# Fetch latest schemas
pnpm run fetch-schemas

# Generate TypeScript types
pnpm run generate-types
```

## Source

These files are generated from JSON schemas in the `schemas/` directory using the scripts in `scripts/`.

Any manual changes to files in this directory will be lost when the generation scripts are run again.
