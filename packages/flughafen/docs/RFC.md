# RFC: Flughafen - Type-Safe GitHub Actions Workflow Builder

## Status and Implementation

**Status:** Implemented *(Active Development)*  
**Author:** JP Wesselink  
**Created:** December 2025  
**Last Updated:** December 2025  

This RFC documents the implemented Flughafen project. All core features described in this document are currently working, including:

✅ **Type-safe workflow building** - Fully implemented with schema-derived types  
✅ **CLI workflow synthesis** - `flughafen synth` command working  
✅ **Type generation** - `flughafen generate-types` command working  
✅ **Local actions support** - Complete with `createLocalAction()` function  
✅ **Fluent builder API** - WorkflowBuilder, JobBuilder, StepBuilder all working  
✅ **Trigger types** - Generic `on()` method supports all GitHub events; legacy methods `onPush()`, `onPullRequest()`, `onSchedule()` deprecated but supported for backward compatibility  
✅ **YAML generation** - Property-ordered output matching GitHub Actions conventions

The project is in active development with comprehensive test coverage (91 tests passing) and detailed documentation.

## Abstract

Flughafen is a TypeScript-first workflow builder for GitHub Actions that provides a fluent, type-safe API for creating CI/CD pipelines. It addresses the limitations of YAML-based workflow definitions by offering compile-time validation, IntelliSense support, and programmatic workflow generation.

## Problem Statement

GitHub Actions workflows are typically defined in YAML files, which have several limitations:

1. **No Type Safety** - YAML provides no compile-time validation for action inputs, job dependencies, or syntax errors
2. **Limited Reusability** - Difficult to share common patterns and logic between workflows
3. **Poor Developer Experience** - No IntelliSense, autocomplete, or refactoring support
4. **Runtime Errors** - Syntax and configuration errors only discovered when workflows run
5. **Complex Composition** - Hard to build workflows programmatically or conditionally

## Solution Overview

Flughafen provides a TypeScript-based DSL (Domain Specific Language) that:

- **Generates valid GitHub Actions YAML** from TypeScript code
- **Provides compile-time type safety** for all action inputs and workflow configuration
- **Offers a fluent, chainable API** that's intuitive and discoverable
- **Supports local action generation** with automatic file management
- **Enables programmatic workflow construction** with conditions, loops, and reusable components

## Design Principles

### 1. **Type Safety First**
Every action input, output, and configuration option should be type-checked at compile time.

```typescript
// ✅ Type-safe - IntelliSense knows valid inputs
.uses('actions/setup-node@v4', uses => uses.with({
  'node-version': '18',     // ✅ Valid
  cache: 'npm'              // ✅ Valid
  // invalidInput: 'test'   // ❌ Compile error
}))
```

### 2. **Fluent API Design**
Method chaining should feel natural and read like English.

```typescript
createWorkflow()
  .name('CI Pipeline')
  .onPush({ branches: ['main'] })
  .job('test', job => 
    job.runsOn('ubuntu-latest')
       .step(step => step.name('Run tests').run('npm test'))
  )
```

### 3. **Local Action Support**
Creating and using local actions should be seamless.

```typescript
const myAction = createLocalAction()
  .name('custom-deploy')
  .input('environment', { required: true })
  .run('echo "Deploying to ${{ inputs.environment }}"');

// Use it in workflows
.step(step => step.uses(myAction, uses => uses.with({
  environment: 'production'
})))
```

### 4. **Zero Configuration**
Should work out of the box with sensible defaults.

```typescript
// Minimal workflow
export default createWorkflow()
  .name('Simple CI')
  .onPush()
  .job('build', job => job.step(step => step.run('npm run build')));
```

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Workflow      │    │      Job         │    │      Step       │
│   Builder       │───▶│    Builder       │───▶│    Builder      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Local Action  │    │    Action        │    │   Step Config   │
│   Builder       │    │   Builder        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Builder Pattern Implementation

Each component follows the Builder pattern:

1. **Mutable internal state** - Methods modify the current instance rather than returning new instances for performance
2. **Fluent interface** - Methods can be chained
3. **Type safety** - Generic types ensure compile-time validation
4. **Lazy evaluation** - YAML generation happens at synthesis time

### CLI Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│      CLI        │    │    Workflow      │    │      File       │
│    Commands     │───▶│   Processor      │───▶│    Writer       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Type Generator │    │  Schema Manager  │    │  GitHub Actions │
│                 │    │                  │    │       YAML      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## CLI Commands

The Flughafen CLI provides two main commands:

### Workflow Synthesis
```bash
# Basic synthesis to console
flughafen synth my-workflow.ts

# Save to GitHub Actions directories
flughafen synth my-workflow.ts -d .github

# Dry run to preview output
flughafen synth my-workflow.ts --dry-run

# Verbose output for debugging
flughafen synth my-workflow.ts -v
```

### Type Generation
```bash
# Generate types from current directory workflows
flughafen generate-types

# Generate types from specific files
flughafen generate-types workflow1.ts workflow2.ts

# Generate types from specific directory
flughafen generate-types -w ./workflows

# Custom output file
flughafen generate-types -o ./types/actions.d.ts

# Use GitHub token for private repos
flughafen generate-types --github-token $TOKEN
```

## Key Features

### 1. **Workflow Synthesis**

Convert TypeScript workflow definitions to GitHub Actions YAML:

```bash
flughafen synth my-workflow.ts -d .github
```

**Generated Output:**
- `.github/workflows/my-workflow.yml` - GitHub Actions workflow
- `.github/actions/*/action.yml` - Local action definitions (if any)

### 2. **Type Generation**

Generate TypeScript interfaces for GitHub Actions:

```bash
flughafen generate-types [files...]
```

**Generated Output:**
- `flughafen-actions.d.ts` - Type definitions for all detected actions (default filename)

### 3. **Local Action Management**

Automatically generate and reference local actions:

```typescript
const setupAction = createLocalAction()
  .name('setup-environment')
  .input('nodeVersion', { required: true })
  .steps([
    {
      name: 'Setup Node.js',
      run: 'echo "Setting up Node.js ${{ inputs.nodeVersion }}"',
      shell: 'bash'
    },
    { 
      uses: 'actions/setup-node@v4', 
      with: { 'node-version': '${{ inputs.nodeVersion }}' }
    }
  ]);

// Automatically generates .github/actions/setup-environment/action.yml
// and references it correctly in workflows
```

### 4. **Type-Safe Action Inputs**

Compile-time validation for action parameters:

```typescript
// Generated types provide IntelliSense and validation
.uses('actions/checkout@v4', uses => uses.with({
  repository: 'owner/repo',    // ✅ string
  'fetch-depth': 1,            // ✅ number  
  clean: true,                 // ✅ boolean
  // invalid: 'test'           // ❌ TypeScript error
}))
```

## Implementation Details

### Builder Pattern with Generics

```typescript
export class WorkflowBuilder implements Builder<WorkflowConfig> {
  private config: Partial<WorkflowConfig> = { jobs: {} };
  private outputFilename?: string;
  private jobBuilders: Map<string, JobBuilder> = new Map();
  
  name(name: string): WorkflowBuilder {
    this.config.name = name;
    return this;
  }
  
  // NEW: Generic method for any GitHub event
  on(event: Event | 'schedule', config?: any): WorkflowBuilder {
    this.addToOnConfig(event, config || {});
    return this;
  }
  
  // Legacy methods (deprecated but supported)
  onPush(config?: PushConfig): WorkflowBuilder {
    return this.on("push", config);
  }
  
  job(id: string, callback: (job: JobBuilder) => JobBuilder): WorkflowBuilder {
    // Implementation details...
  }
}
```

### Type-Safe Local Actions

```typescript
interface ActionInputs {
  environment: 'staging' | 'production';
  appName: string;
  dryRun: boolean;
}

const typedAction = createLocalAction<ActionInputs>()
  .name('deploy-app')
  .input('environment', { required: true, type: 'choice', options: ['staging', 'production'] })
  .input('appName', { required: true })
  .input('dryRun', { required: false, default: false });

// Usage provides full type safety
.uses(typedAction, uses => uses.with({
  environment: 'staging',  // ✅ Only 'staging' | 'production' allowed
  appName: 'my-app',       // ✅ Required string
  dryRun: false            // ✅ Optional boolean
  // invalid: 'test'       // ❌ TypeScript error
}))
```

### CLI Workflow Processing

1. **File Discovery** - Scan for `.ts`/`.js` files with workflow exports
2. **Compilation** - Use esbuild to compile TypeScript in a sandbox
3. **Execution** - Run compiled code to get workflow objects
4. **Synthesis** - Convert workflow objects to YAML
5. **File Writing** - Output workflow and action files to specified directories

## Usage Examples

### Basic CI Workflow

```typescript
// Generate workflow YAML
export default createWorkflow()
  .name('CI')
  .onPush({ branches: ['main'] })
  .onPullRequest({ branches: ['main'] })
  
  .job('test', job => 
    job
      .runsOn('ubuntu-latest')
      .step(step => step.uses('actions/checkout@v4'))
      .step(step => step.uses('actions/setup-node@v4', uses => 
        uses.with({ 'node-version': '18', cache: 'npm' })
      ))
      .step(step => step.run('npm ci'))
      .step(step => step.run('npm test'))
  );
```

### Advanced Workflow with Local Actions

```typescript
// Define a reusable deployment action
const deployAction = createLocalAction()
  .name('deploy-to-environment')
  .input('environment', { required: true, type: 'choice', options: ['staging', 'prod'] })
  .input('version', { required: false, default: 'latest' })
  .steps([
    {
      name: 'Deploy application',
      run: 'echo "Deploying version ${{ inputs.version }} to ${{ inputs.environment }}"',
      shell: 'bash'
    },
    {
      name: 'Deploy application',
      uses: 'some/deploy-action@v1',
      with: {
        environment: '${{ inputs.environment }}',
        version: '${{ inputs.version }}'
      }
    }
  ]);

// Use in workflow
export default createWorkflow()
  .name('Deploy')
  .onPush({ tags: ['v*'] })
  
  .job('deploy-staging', job =>
    job
      .runsOn('ubuntu-latest')
      .step(step => step.uses(deployAction, uses => 
        uses.with({ environment: 'staging' })
      ))
  )
  
  .job('deploy-production', job =>
    job
      .runsOn('ubuntu-latest')
      .needs(['deploy-staging'])
      .step(step => step.uses(deployAction, uses => 
        uses.with({ environment: 'prod', version: '${{ github.ref_name }}' })
      ))
  );
```

### Matrix Strategy

```typescript
export default createWorkflow()
  .name('Cross-Platform Tests')
  .onPush()
  
  .job('test', job =>
    job
      .strategy({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['16', '18', '20']
        }
      })
      .runsOn('${{ matrix.os }}')
      .step(step => step.uses('actions/setup-node@v4', uses =>
        uses.with({ 'node-version': '${{ matrix.node-version }}' })
      ))
      .step(step => step.run('npm test'))
  );
```

## Benefits

### For Developers
- **Faster Development** - IntelliSense and autocomplete
- **Fewer Errors** - Compile-time validation catches issues early  
- **Better Refactoring** - IDE support for renaming, finding references
- **Code Reuse** - Share common patterns as TypeScript modules

### For Teams
- **Consistency** - Standardized workflow patterns across projects
- **Review Quality** - Code reviews for workflows, not just YAML diffs
- **Testing** - Unit test workflow logic before deployment
- **Documentation** - Self-documenting code with TypeScript types

### For Operations
- **Reliability** - Reduced runtime errors from configuration mistakes
- **Maintenance** - Easier to update and evolve complex workflows
- **Debugging** - Better error messages and stack traces
- **Compliance** - Enforce organizational standards through types

## Comparison to Alternatives

| Feature | Flughafen | Raw YAML | GitHub CLI | Actions Toolkit |
|---------|-----------|----------|------------|----------------|
| Type Safety | ✅ Full | ❌ None | ❌ None | ⚠️ Partial |
| IntelliSense | ✅ Yes | ❌ No | ❌ No | ⚠️ Limited |
| Local Actions | ✅ Integrated | ⚠️ Manual | ❌ No | ⚠️ Separate |
| Validation | ✅ Compile-time | ❌ Runtime | ❌ Runtime | ⚠️ Runtime |
| Reusability | ✅ High | ⚠️ Limited | ⚠️ Limited | ✅ High |
| Learning Curve | ⚠️ Medium | ✅ Low | ✅ Low | ❌ High |

## Future Directions

### Recently Completed ✅
- **Generic Trigger Method** - Added `on()` method supporting any GitHub event type with appropriate configuration
- **Flexible Event Handling** - Deprecated specific trigger methods in favor of the generic approach for maximum flexibility

### Short Term
- **Workflow Templates** - Common patterns (CI, CD, release) *(Not yet implemented)*
- **Better Error Messages** - More helpful CLI error reporting

### Medium Term  
- **VS Code Extension** - Rich editing experience with snippets
- **Workflow Composition** - Import and extend workflows
- **Testing Framework** - Unit test workflow logic
- **Plugin System** - Community extensibility

### Long Term
- **GUI Builder** - Visual workflow designer
- **Cloud Integration** - Direct deployment to GitHub
- **Multi-Platform** - Support for other CI systems (GitLab, etc.)
- **Enterprise Features** - Organization-wide templates and policies

## Migration Strategy

### From Existing YAML Workflows

1. **Gradual Migration** - Convert workflows one at a time
2. **Side-by-Side** - Run both YAML and Flughafen workflows during transition
3. **Tooling Support** - Consider building YAML → TypeScript converter
4. **Training** - Team education on TypeScript and builder patterns

### Best Practices

1. **Start Small** - Begin with simple workflows
2. **Create Libraries** - Build reusable action and job components  
3. **Use Types** - Leverage TypeScript's type system fully
4. **Test Early** - Use dry-run mode during development
5. **Document Patterns** - Share common workflows as examples

## Conclusion

Flughafen addresses the fundamental limitations of YAML-based GitHub Actions workflows by providing a type-safe, programmatic approach to CI/CD pipeline definition. It combines the power of TypeScript's type system with an intuitive fluent API to create a superior developer experience while maintaining full compatibility with GitHub Actions.

The solution enables teams to:
- **Catch errors at compile time** rather than runtime
- **Reuse workflow components** across projects
- **Maintain complex pipelines** with confidence
- **Onboard new developers** with better tooling support

By following established design patterns and providing comprehensive tooling, Flughafen represents a significant improvement in how teams can build and maintain their CI/CD infrastructure.

---

*This RFC serves as both documentation and a guide for future development of the Flughafen project.*
