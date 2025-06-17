/**
 * Example usage of the flughafen GitHub Actions workflow builder
 * Showcasing both the original API (fixed) and the new callback-based API
 */

import { createWorkflow, createCallbackWorkflow, createCIWorkflow, presets } from '../src';

// Example 1: Original API (linear, fluent interface)
const simpleWorkflow = createWorkflow()
  .name('Simple CI')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test')
    .runsOn('ubuntu-latest')
    .step()
      .name('Checkout code')
      .checkout()
    .step()
      .name('Setup Node.js')
      .setupNode({ with: { 'node-version': '18' } })
    .step()
      .name('Install dependencies')
      .run('npm ci')
    .step()
      .name('Run tests')
      .run('npm test');

console.log('Original API - Simple Workflow YAML:');
console.log(simpleWorkflow.toYAML({ validate: false }));
console.log('\n' + '='.repeat(50) + '\n');

// Example 2: Callback API (explicit scoping, great for complex workflows)
const callbackWorkflow = createCallbackWorkflow()
  .name('Callback-Based Workflow')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => 
         step.name('Checkout code')
             .checkout()
       )
       .step(step =>
         step.name('Setup Node.js')
             .setupNode({ with: { 'node-version': '18' } })
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
       .step(step => step.checkout())
       .step(step =>
         step.name('Deploy to production')
             .run('npm run deploy')
       )
  );

console.log('Callback API - Multi-job Workflow YAML:');
console.log(callbackWorkflow.toYAML({ validate: false }));
console.log('\n' + '='.repeat(50) + '\n');

// Example 3: Original API - Complex workflow with matrix strategy
const matrixWorkflow = createWorkflow()
  .name('Matrix Tests')
  .onPush()
  .onPullRequest()
  .job('test')
    .strategy({
      matrix: {
        os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        'node-version': ['16', '18', '20']
      },
      'fail-fast': false
    })
    .runsOn('${{ matrix.os }}')
    .step()
      .checkout()
    .step()
      .setupNode()
      .with({ 'node-version': '${{ matrix.node-version }}' })
    .step()
      .run('npm ci')
    .step()
      .run('npm test');

console.log('Original API - Matrix Workflow YAML:');
console.log(matrixWorkflow.toYAML({ validate: false }));
console.log('\n' + '='.repeat(50) + '\n');

// Example 4: Callback API - Complex multi-job workflow
const complexCallbackWorkflow = createCallbackWorkflow()
  .name('Build and Deploy Pipeline')
  .onPush({ branches: ['main'] })
  .onWorkflowDispatch()
  .permissions({ contents: 'read', deployments: 'write' })
  .env({ NODE_ENV: 'production' })
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '18', cache: 'npm' } })
       )
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  )
  .job('build', job =>
    job.needs('test')
       .runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '18', cache: 'npm' } })
       )
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm run build'))
  )
  .job('deploy', job =>
    job.needs('build')
       .runsOn('ubuntu-latest')
       .if('github.ref == \'refs/heads/main\'')
       .step(step => step.checkout())
       .step(step => 
         step.setupNode({ with: { 'node-version': '18', cache: 'npm' } })
       )
       .step(step => step.run('npm ci'))
       .step(step =>
         step.name('Deploy to production')
             .run('npm run deploy')
             .env({ DEPLOY_KEY: '${{ secrets.DEPLOY_KEY }}' })
       )
  );

console.log('Callback API - Complex Pipeline YAML:');
console.log(complexCallbackWorkflow.toYAML({ validate: false }));
console.log('\n' + '='.repeat(50) + '\n');

// Example 5: Using preset workflows
const presetWorkflow = presets.nodeCI('My Node CI', {
  branches: ['main', 'develop'],
  nodeVersions: ['18', '20'],
  runners: ['ubuntu-latest']
});

console.log('Preset Workflow YAML:');
console.log(presetWorkflow.toYAML({ validate: false }));
console.log('\n' + '='.repeat(50) + '\n');

// Example 6: API Safety Demonstration
console.log('API Safety Demonstration:');
console.log('========================');

try {
  // This would be a TypeScript error and runtime error:
  // createWorkflow().job('test').step().job('another') // ❌ Doesn't exist
  console.log('✅ Original API prevents context switching');
} catch (error) {
  console.log('Error:', error.message);
}

try {
  // Callback API makes scope explicit:
  createCallbackWorkflow()
    .job('test', job => {
      // Within this callback, only job methods are available
      // job.onPush() // ❌ Would be TypeScript error
      return job.runsOn('ubuntu-latest')
                .step(step => {
                  // Within this callback, only step methods are available  
                  // step.job('another') // ❌ Would be TypeScript error
                  return step.checkout();
                });
    });
  console.log('✅ Callback API enforces proper scoping');
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\n=== Choose Your API Style ===');
console.log('Original API: Great for simple, linear workflows');
console.log('Callback API: Great for complex, multi-job workflows with clear structure');
