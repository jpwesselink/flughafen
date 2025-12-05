---
layout: home

hero:
  name: 🛫 Flughafen
  text: Type-Safe GitHub Actions
  tagline: Build workflows with full TypeScript type safety and IntelliSense support
  actions:
    - theme: brand
      text: Get Started
      link: /tutorial
    - theme: alt
      text: API Reference
      link: /api
    - theme: alt
      text: View on GitHub
      link: https://github.com/jpwesselink/flughafen

features:
  - icon: 🎯
    title: Function-Based API
    details: Clean, scoped configuration with fluent interface that prevents context switching errors

  - icon: 🔒
    title: Type-Safe
    details: Full TypeScript support with type definitions derived from GitHub Actions schemas

  - icon: 🛡️
    title: Context-Safe
    details: Prevents inappropriate method calls through proper function scoping

  - icon: 📦
    title: Comprehensive
    details: Supports all GitHub Actions features - triggers, jobs, steps, matrix builds, and more

  - icon: ✅
    title: Validated
    details: Built-in validation ensures valid workflow generation with helpful error messages

  - icon: 🧪
    title: Well-Tested
    details: Comprehensive test suite with 400+ tests ensuring reliability

  - icon: 🏗️
    title: Type-Safe Actions
    details: Generate and use type-safe builders for any GitHub Action with full autocomplete

  - icon: 🎨
    title: Local Custom Actions
    details: Create and manage custom local actions with automatic file generation

  - icon: 🔄
    title: Reverse Engineering
    details: Convert existing YAML workflows to type-safe TypeScript with automatic expression handling

  - icon: ⚡
    title: Modern Tooling
    details: Built with latest TypeScript features, Vitest for testing, and tsup for fast builds
---

## Quick Example

::: code-group

```typescript [TypeScript (Input)]
import { createWorkflow } from '@flughafen/core';

const workflow = createWorkflow()
  .name('CI Pipeline')
  .on('push', { branches: ['main'] })
  .on('pull_request')
  .job('test', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout code')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Setup Node.js')
          .uses('actions/setup-node@v4', action =>
            action.with({
              'node-version': '20',
              'cache': 'npm'
            })
          )
      )
      .step(step =>
        step.name('Run tests')
          .run('npm test')
      )
  );
```

```yaml [YAML (Output)]
name: CI Pipeline
on:
  push:
    branches:
      - main
  pull_request: {}
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - name: Run tests
        run: npm test
```

:::

## Installation

::: code-group

```bash [npm]
npm install @flughafen/core
```

```bash [pnpm]
pnpm add @flughafen/core
```

```bash [yarn]
yarn add @flughafen/core
```

:::

## Why Flughafen?

| Problem | Flughafen Solution |
|---------|-------------------|
| ❌ No type safety in YAML | ✅ Full TypeScript type checking |
| ❌ No autocomplete/IntelliSense | ✅ Complete IDE support |
| ❌ Runtime errors only | ✅ Compile-time validation |
| ❌ Easy to mix up contexts | ✅ Function-based scoping |
| ❌ Manual input validation | ✅ Type-safe action configuration |
| ❌ Copy-paste for reusability | ✅ Local custom actions |

## Next Steps

- **[Tutorial](./tutorial)** - Learn with step-by-step examples
- **[API Reference](./api)** - Explore the complete API
- **[Examples](./examples)** - See real-world patterns
- **[Reverse Engineering](./reverse-engineering-quick-start)** - Convert YAML workflows to TypeScript
