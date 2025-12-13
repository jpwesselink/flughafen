# Frequently Asked Questions

## What is Flughafen?

**Flughafen** (German for "airport") is a TypeScript library that lets you build GitHub Actions workflows programmatically with full type safety, IntelliSense, and compile-time validation. Instead of writing error-prone YAML files, you write TypeScript code that generates workflows.

Think of it as "Infrastructure as Code" for GitHub Actions workflows, but with the safety and developer experience of TypeScript.

## Who needs Flughafen?

Flughafen is ideal for:

### 🎯 TypeScript Teams
If your team already uses TypeScript, Flughafen brings the same type safety and tooling to your CI/CD pipelines. No context switching between YAML and TypeScript.

### 🏢 Large Organizations
Organizations with many repositories and standardized workflows benefit from:
- Reusable workflow components
- Centralized workflow libraries
- Compile-time validation across all workflows
- Easier refactoring and updates

### 🔧 DevOps Engineers
If you maintain complex CI/CD pipelines, Flughafen provides:
- Better error detection at compile time
- IntelliSense for all GitHub Actions features
- Easier debugging with TypeScript stack traces
- Version control with meaningful diffs

### 📚 Developers with Existing YAML Workflows
Flughafen's reverse engineering tool converts your existing YAML workflows to TypeScript, making migration straightforward.

### ❌ Who Shouldn't Use Flughafen?

- **Simple projects with one workflow** - YAML is probably fine
- **Teams unfamiliar with TypeScript** - Learning curve may not be worth it
- **Quick prototypes** - YAML is faster for throwaway work

## Why not just use YAML?

YAML workflows have several limitations:

| Problem | Impact |
|---------|--------|
| No type checking | Errors only discovered at runtime |
| No autocomplete | Memorize syntax or constantly reference docs |
| Easy to mix contexts | Accidentally use job-level config in steps |
| Manual validation | No way to catch errors before pushing |
| No refactoring support | Hard to update action versions across workflows |
| Limited reusability | Copy-paste or complex template systems |

Flughafen solves all of these by leveraging TypeScript's type system and tooling.

## How does Flughafen work?

1. **Write TypeScript code** using Flughafen's fluent API
2. **Get instant feedback** from TypeScript compiler and IntelliSense
3. **Build workflows** with the CLI: `flughafen build`
4. **Generate YAML files** in `.github/workflows/`
5. **Commit both** TypeScript source and generated YAML

The TypeScript code becomes the source of truth, and YAML is generated automatically.

## Can I use my existing YAML workflows?

Yes! Flughafen includes a reverse engineering tool:

```bash
# Convert single workflow
flughafen reverse .github/workflows/ci.yml

# Convert entire .github directory
flughafen reverse --output ./workflows
```

This generates TypeScript code from your YAML workflows, including:
- All workflow structure
- Expression conversion (`${{ }}` → `expr()`)
- Local actions
- Reusable workflows

See [Reverse Engineering Guide](./reverse-engineering-quick-start.md) for details.

## What GitHub Actions features are supported?

**Fully Supported (Stable)**:
- ✅ All trigger types (`on:`)
- ✅ Jobs and steps
- ✅ Matrix strategies
- ✅ Conditional execution (`if:`)
- ✅ Environment variables
- ✅ Secrets
- ✅ Permissions
- ✅ Concurrency control
- ✅ Reusable workflows
- ✅ Local custom actions
- ✅ Action inputs and outputs
- ✅ GitHub Actions expressions

## Is Flughafen production-ready?

**Core features are stable** and ready for production use:
- Workflow building API
- Type-safe action builders
- Local action support
- Schema-driven type generation

**Reverse engineering** (experimental) converts most workflow patterns successfully.

**Validation** provides structure, security, and best practices checks.

We recommend:
- ✅ Use for new workflows
- ✅ Use for complex multi-repo setups
- ⚠️ Test reverse engineering on non-critical workflows first
- ⚠️ Keep YAML workflows during transition period

## How do I migrate from YAML?

Recommended migration path:

### Phase 1: Parallel Operation
1. Convert YAML to TypeScript with `flughafen reverse`
2. Keep both TypeScript and YAML
3. Build and compare outputs
4. Verify workflows work identically

### Phase 2: TypeScript as Source
1. Make changes in TypeScript only
2. Generate YAML with `flughafen build`
3. Commit both TypeScript and YAML
4. Continue monitoring for issues

### Phase 3: Full Migration
1. Remove old YAML files
2. Use TypeScript as single source of truth
3. Set up pre-commit hooks for validation
4. Update team documentation

See [Reverse Engineering Guide](./reverse-engineering-quick-start.md) for detailed migration steps.

## Do I need to commit the generated YAML?

**Yes, commit both TypeScript and generated YAML.**

GitHub Actions only understands YAML, so the generated `.github/workflows/*.yml` files must be committed. The TypeScript source should also be committed for:
- Version control
- Code review
- Future maintenance
- Team collaboration

Think of it like TypeScript → JavaScript compilation for web projects.

## How do I keep TypeScript and YAML in sync?

Use the CLI build command:

```bash
# Build all workflows
flughafen build

# Build specific file
flughafen build flughafen/workflows/ci.ts

# Validate without building
flughafen validate flughafen/workflows/ci.ts
```

Recommended workflow:
1. Edit TypeScript source
2. Run `flughafen build`
3. Review generated YAML diff
4. Commit both files

Consider adding a pre-commit hook:

```bash
# .git/hooks/pre-commit
#!/bin/bash
pnpm flughafen build
git add .github/workflows/
```

## Can I use third-party GitHub Actions?

Yes! Flughafen supports all GitHub Actions from the marketplace:

```typescript
.step((step) =>
  step.uses('actions/setup-node@v4', (action) =>
    action.with({
      'node-version': '20',
      'cache': 'pnpm'
    })
  )
)
```

Flughafen can generate type definitions for actions automatically:

```bash
flughafen generate types
```

This creates type-safe builders with autocomplete for all action inputs.

## What about local custom actions?

Flughafen has first-class support for local actions:

```typescript
import { createLocalAction } from '@flughafen/core';

const myAction = createLocalAction()
  .name('My Action')
  .description('Does something useful')
  .input('config', {
    description: 'Config file path',
    required: true
  })
  .runs('node', { main: 'dist/index.js' });

// Use in workflow
.step((step) =>
  step.uses('./actions/my-action', (action) =>
    action.with({ config: './config.yml' })
  )
)
```

The reverse engineering tool can also extract local actions from `.github/actions/`.

## How does type safety work with expressions?

GitHub Actions expressions (`${{ }}`) are handled with the `expr()` helper:

```typescript
import { expr } from '@flughafen/core';

// Simple expression
.if(expr('success()'))

// Complex expression
.env({
  BRANCH: expr('github.ref_name'),
  IS_MAIN: expr("github.ref == 'refs/heads/main'")
})

// Template literals with expressions
.name(`Build ${expr('matrix.os')}`)
```

The `expr()` function is type-safe and generates correct `${{ }}` syntax in the output YAML.

## What's the performance impact?

Flughafen adds minimal overhead:

**Build time**:
- Fast - typically under a second for most workflows
- Scales well with multiple workflow files

**Runtime**:
- Zero - generated YAML is identical to hand-written YAML
- No performance difference in GitHub Actions

**Development**:
- Faster iteration with compile-time errors
- Less debugging of workflow issues
- Easier refactoring with TypeScript tools

## How do I handle secrets?

Secrets work exactly like in YAML:

```typescript
.step((step) =>
  step
    .name('Deploy')
    .env({
      API_KEY: expr('secrets.API_KEY'),
      DB_PASSWORD: expr('secrets.DB_PASSWORD')
    })
    .run('npm run deploy')
)
```

Secrets are still managed in GitHub repository settings. Flughafen just provides type-safe access to them.

## Can I use Flughafen with monorepos?

Yes! Flughafen works great with monorepos:

```typescript
// Shared workflow library
// packages/workflows/src/common.ts
export function nodeSetup(version: string) {
  return (step: StepBuilder) =>
    step.uses('actions/setup-node@v4', (action) =>
      action.with({ 'node-version': version })
    );
}

// Use in multiple workflows
import { nodeSetup } from '@myorg/workflows';

.step(nodeSetup('20'))
```

You can create shared workflow libraries across your organization.

## How do I debug workflows?

Flughafen provides several debugging tools:

### 1. TypeScript Errors
Catch most issues at compile time:
```bash
pnpm tsc --noEmit
```

### 2. Validation
Validate before building:
```bash
flughafen validate flughafen/workflows/ci.ts
```

### 3. Dry Run
Preview generated YAML:
```bash
flughafen build --dry-run flughafen/workflows/ci.ts
```

### 4. Comparison
Compare generated vs existing:
```bash
flughafen build flughafen/workflows/ci.ts --dry-run
```

## What's the learning curve?

**If you know TypeScript**: ~1 hour
- Fluent API is intuitive
- IntelliSense guides you
- Similar to other builder patterns

**If you know GitHub Actions**: ~2 hours
- Concepts map 1:1 to YAML
- Reverse engineering helps understanding
- Documentation includes YAML comparisons

**If you're new to both**: ~1 day
- Start with the [quick start guide](./index)
- Use reverse engineering on existing workflows
- Follow [examples](./examples.md)

## How do I contribute?

We welcome contributions! We're prioritizing:

**Bug Reports**:
- GitHub Issues with workflow examples
- Include TypeScript code and error messages
- Mention Flughafen version

**Feature Requests**:
- GitHub Issues for proposals
- Explain use case and benefits
- Check if already planned in roadmap

**Code Contributions**:
- Focus on bug fixes for now
- Open an issue first to discuss

## What's the roadmap?

**Current Focus**: Stability and documentation

**Stable**:
- ✅ Core workflow building
- ✅ Reverse engineering
- ✅ Validation system

**In Progress**:
- 🚧 Bug fixes and edge cases
- 📚 Documentation improvements

**Future**:
- Additional features based on user feedback

## What's the business model?

Flughafen is **open source (MIT license)** and free to use.

Future plans may include:
- **SaaS Platform** - Cloud-based workflow management
- **Enterprise Support** - Dedicated support and consulting
- **Training** - Workshops and certification

## How is Flughafen different from alternatives?

### vs ActionLint
- **ActionLint**: Lints YAML workflows
- **Flughafen**: Builds workflows in TypeScript with full type safety

### vs GitHub Actions Toolkit
- **Toolkit**: Build actions in JavaScript/TypeScript
- **Flughafen**: Build entire workflows in TypeScript

### vs Pulumi/Terraform
- **Pulumi/Terraform**: Infrastructure as Code
- **Flughafen**: Workflow as Code (specifically GitHub Actions)

### vs projen
- **projen**: Project scaffolding with workflows
- **Flughafen**: Dedicated workflow building with type safety

Flughafen is the only tool focused specifically on type-safe GitHub Actions workflow building.

## Can I use Flughafen with GitHub Enterprise?

Yes, Flughafen works with:
- ✅ GitHub.com
- ✅ GitHub Enterprise Server
- ✅ GitHub Enterprise Cloud

Generated YAML is standard GitHub Actions syntax and works everywhere GitHub Actions is supported.

## What if Flughafen stops being maintained?

Because Flughafen generates standard YAML:
1. Generated workflows continue working
2. You can maintain YAML directly
3. No vendor lock-in
4. TypeScript source remains useful documentation

The MIT license allows forking and community maintenance if needed.

## How do I get help?

- 📖 **Documentation**: You're reading it!
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/jpwesselink/flughafen/issues)

## Where does the name come from?

**Flughafen** is German for "airport". The project is about managing "flights" (workflows) that take your code from development to deployment, just like an airport manages flights.

Plus, it starts with "Flu-" which sounds like "Fluent" - a reference to the fluent API design.

---

**Have more questions?** [Open an issue](https://github.com/jpwesselink/flughafen/issues).
