# Flughafen 🛫

> Type-Safe GitHub Actions Workflow Builder

A modern, type-safe TypeScript library for building GitHub Actions# Use in your workflow
createWorkflow()orkflows programmatically. Features a clean, fluent API with function-based configuration that prevents context switching errors and provides ex# Use in your workflow
.step(step => 
  step.uses('actions/checkout@v4')
    .with(checkoutInputs)
)nt TypeScript intellisense.

## ✨ Key Features

- 🎯 **Function-Based API**: Clean, scoped configuration with fluent interface
- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Context-Safe**: Prevents inappropriate method calls through proper scoping
- 📦 **Comprehensive**: Supports all GitHub Actions workflow features
- ✅ **Validated**: Built-in validation ensures valid workflow generation
- 🚀 **Modern**: Uses latest TypeScript features and best practices
- 🧪 **Tested**: Comprehensive test suite with extensive coverage
- 🏗️ **Action Builders**: Generate type-safe builders for any GitHub Action
- ⚡ **Action Callbacks**: Scoped action configuration with callback form
- 🎨 **Local Actions**: Create and manage custom local actions with automatic file generation
- 📖 **Well Documented**: Rich examples and clear API documentation

## Installation

```bash
pnpm add flughafen
# or
npm install flughafen
# or
yarn add flughafen
```

## Quick Start

```typescript
import { createWorkflow } from 'flughafen';

// Clean function-based API with strict scoping
const workflow = createWorkflow()
  .name('CI Pipeline')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job => 
    job.runsOn('ubuntu-latest')
      .step(step => 
        step.name('Checkout')
          .uses('actions/checkout@v4')
      )
      .step(step => 
        step.name('Setup Node.js')
          .uses('actions/setup-node@v4', action =>
            action.with({ 
              'node-version': '18',
              'cache': 'npm' 
            })
          )
      )
      .step(step => 
        step.name('Install dependencies')
          .run('npm ci')
      )
      .step(step => 
        step.name('Run tests')
          .run('npm test')
      )
  )
  .job('deploy', job => 
    job.runsOn('ubuntu-latest')
      .needs('test')
      .if('github.ref == \'refs/heads/main\'')
      .step(step => 
        step.name('Deploy')
          .run('npm run deploy')
      )
  );

// Generate YAML
console.log(workflow.toYAML());
```
## Key Benefits

### Function-Based Architecture

Clean, scoped structure that prevents method call confusion:

```typescript
import { createWorkflow } from 'flughafen';

// ✅ Clear, scoped structure - each context has only relevant methods
createWorkflow()
  .job('test', job => 
    // Only job methods available here
    job.runsOn('ubuntu-latest')
      .step(step => 
        // Only step methods available here
        step.uses('actions/checkout@v4')
      )
  )
  .job('build', job => 
    // Each job is properly scoped
    job.needs('test')
      .runsOn('ubuntu-latest')
  );
```

### Type-Safe Action Builders

Generate type-safe builders for any GitHub Action:

```bash
# Generate builders for common actions
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts aws-actions/configure-aws-credentials@v4
```

```typescript
// Use the generated builders
import { CheckoutInputsBuilder_v4 } from './generated/CheckoutInputsBuilder_v4';
import { SetupNodeInputsBuilder_v4 } from './generated/SetupNodeInputsBuilder_v4';

// ✅ Type-safe, with autocomplete and validation
const checkoutInputs = new CheckoutInputsBuilder_v4()
  .repository('owner/repo')
  .ref('main')
  .fetchDepth(1)                    // Correct type (number)
  .submodules('recursive')          // Enum validation
  .build();

const nodeInputs = new SetupNodeInputsBuilder_v4()
  .nodeVersion('18')
  .cache('npm')                     // Autocomplete available
  .registryUrl('https://registry.npmjs.org')
  .build();

// Use in your workflow
createWorkflow()
  .job('build', job =>
    job.step(step => 
      step.uses('actions/checkout@v4')
        .with(checkoutInputs)         // ✅ Fully typed
    )
    .step(step =>
      step.uses('actions/setup-node@v4')
        .with(nodeInputs)
    )
  );
```

Generated builders provide:
- ✅ **Full TypeScript type safety** with proper types (string, number, boolean)
- ✅ **IDE autocomplete** for all available inputs  
- ✅ **Compile-time validation** of parameters
- ✅ **CamelCase method names** for better developer experience
- ✅ **Versioned filenames** to prevent conflicts (`CheckoutInputsBuilder_v4.ts`)
- ✅ **Automatic output** to `generated/` directory

### Local Custom Actions

Create and use local custom actions directly in your workflows:

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
  .input('cache', {
    description: 'Package manager cache',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm'],
    default: 'npm'
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

// Use in workflow
const workflow = createWorkflow()
  .name('CI with Local Actions')
  .job('build', job =>
    job.step(step =>
      step.uses(setupAction)  // ✅ Type-safe local action reference
        .with({
          'node-version': '20',
          'cache': 'npm'
        })
    )
  );

// Automatically generates:
// .github/actions/setup-environment/action.yml
// Workflow references: ./actions/setup-environment
```

**Local Actions Features:**
- ✅ **Type-safe action definitions** with inputs/outputs
- ✅ **Automatic file generation** during synthesis  
- ✅ **Composite, Node.js, Docker** action support
- ✅ **Custom directory structure** with `filename()` override
- ✅ **Reusable across workflows** 
- ✅ **Full integration** with workflow builders

## API Reference

```typescript
import { createWorkflow } from 'flughafen';

const workflow = createWorkflow()
  // Basic configuration
  .name('My Workflow')
  .runName('Custom run name')
  
  // Triggers
  .onPush({ branches: ['main'] })
  .onPullRequest({ types: ['opened', 'synchronize'] })
  .onSchedule('0 2 * * *')
  .onWorkflowDispatch({
    environment: {
      description: 'Environment to deploy to',
      required: true,
      type: 'choice',
      options: ['dev', 'staging', 'prod']
    }
  })
  
  // Global configuration
  .env({ GLOBAL_VAR: 'value' })
  .permissions({ contents: 'read', issues: 'write' })
  .concurrency({ group: 'my-group', 'cancel-in-progress': true })
  .defaults({
    run: {
      shell: 'bash',
      'working-directory': './app'
    }
  });
```

### Job Configuration

```typescript
.job('my-job', job => 
  job
    // Basic job config
    .runsOn('ubuntu-latest')
    .needs('previous-job')
    .if('github.ref == \'refs/heads/main\'')
    
    // Environment and permissions
    .env({ JOB_VAR: 'value' })
    .permissions({ contents: 'read' })
    
    // Strategy and matrix
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest'],
        'node-version': ['16', '18', '20']
      },
      'fail-fast': false
    })
    
    // Container and services
    .container('node:18')
    .services({
      postgres: {
        image: 'postgres:13',
        env: { POSTGRES_PASSWORD: 'postgres' }
      }
    })
    
    // Timeout and error handling
    .timeoutMinutes(60)
    .continueOnError(true)
    
    // Steps with clean scoping
    .step(step => 
      step.name('Checkout')
        .uses('actions/checkout@v4')
    )
    .step(step => 
      step.name('Setup Node')
        .uses('actions/setup-node@v4')
        .with({ 'node-version': '18' })
    )
    .step(step => 
      step.name('Run tests')
        .run('npm test')
        .env({ CI: 'true' })
    )
)
```

### Step Configuration

```typescript
.step(step => 
  step
    // Basic step config
    .name('My Step')
    .id('my-step')
    .if('success()')
    
    // Actions - Direct form
    .uses('actions/checkout@v4')
    .with({
      repository: 'owner/repo',
      ref: 'main'
    })
    
    // Actions - Callback form (new!)
    .uses('actions/setup-node@v4', action =>
      action.with({
        'node-version': '18',
        'cache': 'npm'
      })
      .env({
        NODE_ENV: 'production'
      })
    )
    
    // Or run commands
    .run('npm ci')
    .shell('bash')
    .workingDirectory('./app')
    
    // Environment and error handling
    .env({ STEP_VAR: 'value' })
    .continueOnError(true)
    .timeoutMinutes(10)
)
```
## Examples

### Complete Examples

Check out the `examples/` directory for comprehensive examples:

- **`callback-api.ts`** - Advanced workflow examples with complex pipelines  
- **`callback-examples.ts`** - Additional workflow patterns and use cases
- **`action-input-builders.ts`** - Using generated type-safe action input builders
- **`uses-callback-demo.ts`** - Demonstrates new callback form for action configuration

### Running Examples

```bash
# Run examples to see the generated YAML
pnpm exec tsx examples/callback-api.ts
pnpm exec tsx examples/callback-examples.ts
pnpm exec tsx examples/action-input-builders.ts
pnpm exec tsx examples/uses-callback-demo.ts
pnpm exec tsx examples/local-actions-demo.ts
```

## Local Custom Actions

Create and manage local custom actions with automatic file generation:

```typescript
import { createWorkflow, createLocalAction } from 'flughafen';

// Define a reusable local action
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment')
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
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'npm ci',
    'npm run build'
  ]);

// Use in workflow
const workflow = createWorkflow()
  .name('CI with Local Actions')
  .job('build', job =>
    job.step(step =>
      step.uses(setupAction)  // Reference local action
        .with({ 'node-version': '20', 'cache': 'npm' })
    )
  );

// Generates:
// - .github/workflows/ci.yml (references ./actions/setup-environment)
// - .github/actions/setup-environment/action.yml (the action definition)
```

**Benefits:**
- ✅ **Type-safe action definitions** with inputs/outputs validation
- ✅ **Automatic file generation** during synthesis
- ✅ **Reusable across workflows** in your repository
- ✅ **Custom directory structure** with `filename()` override
- ✅ **Support for composite, Node.js, and Docker actions**

See [Local Actions Documentation](./docs/local-actions.md) for complete guide.

## Action Builders

Generate type-safe builders for any GitHub Action:

```bash
# Generate a builder for any GitHub Action
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts aws-actions/configure-aws-credentials@v4
pnpm exec tsx scripts/generateActionInputBuilder.ts docker/setup-buildx-action@v3
```

This creates builders in the `generated/` directory:

```typescript
// Example: Using the generated checkout builder
import { CheckoutInputsBuilder_v4 } from './generated/CheckoutInputsBuilder_v4';

const checkoutInputs = new CheckoutInputsBuilder_v4()
  .repository('owner/repo')
  .ref('main')
  .fetchDepth('1')
  .token('${{ secrets.GITHUB_TOKEN }}')
  .build();

// Use in your workflow
.step(step => {
  step.uses('actions/checkout@v4')
    .with(checkoutInputs);
})
```

## Factory Functions

Use pre-built workflow templates:

```typescript
import { createCIWorkflow } from 'flughafen';

// Quick CI workflow setup
const nodeCI = createCIWorkflow('Node.js CI', {
  branches: ['main', 'develop'],
  nodeVersion: '18',
  runner: 'ubuntu-latest'
});

console.log(nodeCI.toYAML());
```

## Validation

Built-in validation ensures your workflows are valid:

```typescript
// Validate without throwing
const result = workflow.validate();
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}

// Generate YAML with validation options
const yaml = workflow.toYAML({ 
  validate: true,     // Enable validation (default: true)
  throwOnError: false // Don't throw, just warn (default: true)
});
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Generate action builders
pnpm exec tsx scripts/generateActionInputBuilder.ts <action-reference>
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all tests pass.

## License

MIT

### Action Configuration with Callback Form

The new callback form for `.uses()` provides scoped action configuration:

```typescript
// Enhanced action configuration with callback form
.step(step => 
  step.name('Complex Action Setup')
    .uses('aws-actions/configure-aws-credentials@v4', action =>
      action
        .with({
          'role-to-assume': 'arn:aws:iam::123456789012:role/DeployRole',
          'aws-region': 'us-east-1',
          'role-duration-seconds': '3600'
        })
        .env({
          AWS_DEFAULT_REGION: 'us-east-1',
          DEPLOYMENT_ENV: 'production'
        })
    )
)

// Benefits of callback form:
// ✅ Scoped configuration - action inputs and env separate from step config
// ✅ Fluent API - chain action.with().env() for cleaner code
// ✅ Better readability - clear separation of concerns
// ✅ Type safety - ActionBuilder provides consistent interface
// ✅ Backward compatible - original direct form still works
```

## 🖥️ CLI Tool

Flughafen includes a powerful CLI tool for watching and generating workflows in real-time during development.

### Installation & Usage

After installing the package, the CLI is available as `flughafen`:

```bash
# Watch a workflow file and regenerate YAML on changes
flughafen watch my-workflow.js

# Generate YAML once from a workflow file
flughafen generate my-workflow.js

# Save output to a file
flughafen generate my-workflow.js -o .github/workflows/ci.yml

# Watch and save to file on changes
flughafen watch my-workflow.js -o .github/workflows/ci.yml
```

### CLI Features

- 🔍 **File Watching**: Automatically regenerates YAML when workflow files change
- 📁 **Multiple Formats**: Supports both TypeScript and JavaScript workflow files
- 💾 **File Output**: Save generated YAML directly to workflow files
- 🎨 **Pretty Output**: Colored, formatted output for better readability
- 🚀 **Fast Rebuilds**: Efficient file watching with instant regeneration
- 🛡️ **Error Handling**: Clear error messages and graceful failure handling

### Workflow File Patterns

Create workflow files that export a WorkflowBuilder:

```javascript
// my-workflow.js
const { createWorkflow } = require('flughafen');

module.exports = createWorkflow()
  .name('My Workflow')
  .onPush({ branches: ['main'] })
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Hello World')
      .run('echo "Hello from CLI!"')
    )
  );
```

```typescript
// my-workflow.ts
import { createWorkflow } from 'flughafen';

export default createWorkflow()
  .name('TypeScript Workflow')
  .onPush({ branches: ['main'] })
  .job('build', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Build project')
      .run('npm run build')
    )
  );
```

### CLI Commands

#### `watch <file>`
Watch a workflow file and regenerate YAML whenever it changes.

**Options:**
- `-o, --output <file>` - Output file path for generated YAML
- `-s, --silent` - Silent mode with minimal output
- `-h, --help` - Show help

**Examples:**
```bash
# Watch and output to console
flughafen watch workflow.js

# Watch and save to file
flughafen watch workflow.js -o .github/workflows/ci.yml

# Silent watching (minimal output)
flughafen watch workflow.js --silent
```

#### `generate <file>`
Generate YAML from a workflow file once.

**Options:**
- `-o, --output <file>` - Output file path for generated YAML
- `-s, --silent` - Only output YAML without decorations
- `-h, --help` - Show help

**Examples:**
```bash
# Generate and output to console
flughafen generate workflow.js

# Generate and save to file
flughafen generate workflow.js -o ci.yml

# Generate with minimal output
flughafen generate workflow.js --silent
```

### Development Workflow

The CLI tool is perfect for iterative workflow development:

1. **Create** a workflow file (`.js` or `.ts`)
2. **Run** `flughafen watch my-workflow.js -o .github/workflows/ci.yml`
3. **Edit** your workflow file in your favorite editor
4. **See** instant YAML updates in your terminal and output file
5. **Commit** the generated YAML to your repository

### Package.json Scripts

You can add CLI commands to your package.json for easy access:

```json
{
  "scripts": {
    "workflow:watch": "flughafen watch workflows/ci.js -o .github/workflows/ci.yml",
    "workflow:build": "flughafen generate workflows/ci.js -o .github/workflows/ci.yml",
    "workflow:dev": "flughafen watch workflows/ci.js"
  }
}
```

Then run with:
```bash
npm run workflow:watch
pnpm workflow:build
yarn workflow:dev
```

