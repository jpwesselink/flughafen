# Local Custom Actions Support

Flughafen now supports creating and using local custom actions directly in your workflow definitions. This allows you to:

- Define reusable actions inline with your workflows
- Generate action files automatically during synthesis 
- Use type-safe action definitions with inputs/outputs
- Support for composite, Node.js, and Docker actions

## Quick Start

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define a local action
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '18'
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

// Use in workflow
const workflow = createWorkflow()
  .name('CI Pipeline')
  .job('build', job =>
    job.step(step =>
      step.uses(setupAction)  // Reference local action
        .with({ 'node-version': '20' })
    )
  );
```

## LocalActionBuilder API

### Basic Methods

```typescript
createLocalAction()
  .name('my-action')                    // Action name (used for directory)
  .filename('custom/path')              // Optional: custom file path
  .description('Action description')    // Action description
```

### Input/Output Configuration

```typescript
// Add inputs
.input('parameter-name', {
  description: 'Parameter description',
  required: true,
  default: 'default-value',
  type: 'choice',                       // 'string' | 'number' | 'boolean' | 'choice'
  options: ['option1', 'option2']       // For choice type
})

// Add outputs  
.output('output-name', {
  description: 'Output description',
  value: '${{ steps.step-id.outputs.value }}'
})
```

### Action Types

#### Composite Actions (Default)
```typescript
createLocalAction()
  .name('composite-action')
  .using('composite')                   // Optional, default
  .steps([
    'echo "Step 1"',
    {
      name: 'Complex step',
      run: 'echo "Step 2"',
      shell: 'bash',
      env: { VAR: 'value' }
    }
  ]);

// Or use .run() shorthand
.run(['command1', 'command2']);
```

#### Node.js Actions
```typescript
createLocalAction()
  .name('node-action')
  .using('node20')
  .main('dist/index.js');
```

#### Docker Actions
```typescript
createLocalAction()
  .name('docker-action')
  .using('docker')
  .image('alpine:latest');
```

### File Path Configuration

```typescript
// Default: uses name for path
createLocalAction().name('my-action')
// Generates: ./actions/my-action

// Custom path
createLocalAction().filename('shared/actions/utility')
// Generates: ./shared/actions/utility

// Absolute path (adds ./ if needed)
createLocalAction().filename('custom/path')
// Generates: ./custom/path
```

## Generated File Structure

When you synthesize workflows containing local actions, the following files are generated:

```
.github/
  actions/
    setup-environment/
      action.yml
    deploy-app/
      action.yml
  shared/                     # Custom paths supported
    actions/
      notify/
        action.yml
  workflows/
    ci.yml                    # References ./actions/setup-environment
```

## Example: Complete Workflow with Local Actions

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define reusable actions
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment with Node.js and dependencies')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '18'
  })
  .input('cache', {
    description: 'Package manager cache to use',
    required: false,
    default: 'npm',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm']
  })
  .output('node-version', {
    description: 'Installed Node.js version',
    value: '${{ steps.setup-node.outputs.node-version }}'
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

const deployAction = createLocalAction()
  .name('deploy-to-staging')
  .description('Deploy application to staging environment')
  .input('environment', {
    description: 'Target environment',
    required: true,
    default: 'staging'
  })
  .steps([
    {
      name: 'Deploy application',
      run: 'echo "Deploying to ${{ inputs.environment }}"',
      shell: 'bash',
      env: {
        ENVIRONMENT: '${{ inputs.environment }}'
      }
    },
    {
      name: 'Set deployment URL',
      run: 'echo "url=https://app-${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT',
      shell: 'bash'
    }
  ]);

// Create workflow
const workflow = createWorkflow()
  .name('Local Actions Demo')
  .onPush({ branches: ['main'] })
  
  .job('setup', job =>
    job.runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout code')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Setup environment')
          .uses(setupAction)  // Use local action
          .with({
            'node-version': '20',
            'cache': 'npm'
          })
      )
  )
  
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .needs('setup')
      .step(step =>
        step.name('Deploy application')
          .uses(deployAction)  // Use another local action
          .with({
            'environment': 'staging'
          })
      )
  );

// Output workflow YAML
console.log(workflow.toYAML());

// Output action files
console.log('--- .github/actions/setup-environment/action.yml ---');
console.log(setupAction.toYAML());

console.log('--- .github/actions/deploy-to-staging/action.yml ---');
console.log(deployAction.toYAML());
```

## CLI Integration

The flughafen CLI automatically detects local actions in workflows and can generate the corresponding action files alongside the workflow YAML.

**Future Enhancement**: The CLI will be extended to automatically write local action files to the appropriate directories during the `watch` and `generate` commands.

## Benefits

✅ **Type-Safe**: Full TypeScript support for action definitions  
✅ **Reusable**: Actions can be used across multiple workflows  
✅ **Automatic Generation**: Action files created during synthesis  
✅ **Custom Inputs/Outputs**: Full support for action interface definitions  
✅ **Multiple Types**: Support for composite, Node.js, and Docker actions  
✅ **Custom Paths**: Flexible directory structure with `filename()` override  
✅ **Integration**: Seamless integration with existing workflow builders  

## Type Definitions

```typescript
interface ActionInputConfig {
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: 'string' | 'number' | 'boolean' | 'choice';
  options?: string[]; // for choice type
}

interface ActionOutputConfig {
  description?: string;
  value?: string;
}

interface ActionStep {
  name?: string;
  run?: string;
  shell?: string;
  env?: Record<string, string>;
  if?: string;
  workingDirectory?: string;
}
```

This feature makes flughafen a comprehensive solution for GitHub Actions workflow management, supporting both external marketplace actions and custom local actions in a unified, type-safe API.
