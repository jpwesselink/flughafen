/**
 * Simple Local Action Example
 * 
 * This example shows how to create and use a simple local action with Flughafen.
 * Local actions let you create reusable, custom actions that can be shared across
 * multiple workflows or steps.
 * 
 * What this example demonstrates:
 * 1. Creating a simple local action for Node.js setup
 * 2. Using the local action in a workflow
 * 3. Type-safe configuration with .with() callback
 * 
 * To generate the workflow and action files:
 *   flughafen synth examples/simple-local-action.ts -d .github
 */

import { createWorkflow, createLocalAction } from 'flughafen';

// Create a simple local action for Node.js setup with caching
const nodeSetupAction = createLocalAction()
  .name('setup-node-with-cache')
  .description('Setup Node.js with dependency caching')
  .input('node-version', {
    description: 'Node.js version to install',
    required: false,
    default: '18'
  })
  .input('package-manager', {
    description: 'Package manager to use (npm, yarn, or pnpm)',
    required: false,
    default: 'npm'
  })
  .output('cache-hit', {
    description: 'Whether dependencies were restored from cache'
  })
  .using('composite')
  .steps([
    {
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v4',
      with: {
        'node-version': '${{ inputs.node-version }}',
        cache: '${{ inputs.package-manager }}'
      }
    },
    {
      name: 'Install dependencies',
      run: '${{ inputs.package-manager }} install',
      shell: 'bash'
    },
    {
      name: 'Output cache status',
      run: 'echo "cache-hit=${{ steps.setup.outputs.cache-hit }}" >> $GITHUB_OUTPUT',
      shell: 'bash'
    }
  ]);

// Create a workflow that uses the local action
const workflow = createWorkflow()
  .name('Simple Local Action Demo')
  .onPush({ branches: ['main'] })
  .onPullRequest({ branches: ['main'] })
  
  .job('test', job => job
    .runsOn('ubuntu-latest')
    
    .step(step => step
      .name('Checkout repository')
      .uses('actions/checkout@v4')
    )
    
    .step(step => step
      .name('Setup Node.js with our custom action')
      .uses(nodeSetupAction, uses => uses.with({
        'node-version': '20',
        'package-manager': 'npm'
      }))
    )
    
    .step(step => step
      .name('Run linting')
      .run('npm run lint')
    )
    
    .step(step => step
      .name('Run tests')
      .run('npm test')
    )
  )
  
  .job('build', job => job
    .runsOn('ubuntu-latest')
    .needs(['test'])
    
    .step(step => step
      .name('Checkout repository')
      .uses('actions/checkout@v4')
    )
    
    .step(step => step
      .name('Setup Node.js with different version')
      .uses(nodeSetupAction, uses => uses.with({
        'node-version': '18',
        'package-manager': 'npm'
      }))
    )
    
    .step(step => step
      .name('Build project')
      .run('npm run build')
    )
  );

export default workflow;
