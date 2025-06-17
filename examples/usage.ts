/**
 * Example usage of the flughafen GitHub Actions workflow builder
 */

import { createWorkflow, createCIWorkflow, presets } from '../src';

// Example 1: Simple workflow
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
      .run('npm test')
    .workflow();

console.log('Simple Workflow YAML:');
console.log(simpleWorkflow.toYaml());
console.log('\n' + '='.repeat(50) + '\n');

// Example 2: Complex workflow with matrix strategy
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
      .run('npm test')
    .workflow();

console.log('Matrix Workflow YAML:');
console.log(matrixWorkflow.toYaml());
console.log('\n' + '='.repeat(50) + '\n');

// Example 3: Using preset
const presetWorkflow = presets.nodeCI('My Node CI', {
  branches: ['main', 'develop'],
  nodeVersions: ['18', '20'],
  runners: ['ubuntu-latest']
});

console.log('Preset Workflow YAML:');
console.log(presetWorkflow.toYaml());
console.log('\n' + '='.repeat(50) + '\n');

// Example 4: Complex workflow with multiple jobs
const deployWorkflow = createWorkflow()
  .name('Build and Deploy')
  .onPush({ branches: ['main'] })
  .onWorkflowDispatch()
  .permissions({ contents: 'read', deployments: 'write' })
  .env({ NODE_ENV: 'production' })
  .job('test')
    .runsOn('ubuntu-latest')
    .step()
      .checkout()
    .step()
      .setupNode()
      .with({ 'node-version': '18', cache: 'npm' })
    .step()
      .run('npm ci')
    .step()
      .run('npm test')
    .workflow()
  .job('build')
    .needs('test')
    .runsOn('ubuntu-latest')
    .step()
      .checkout()
    .step()
      .setupNode()
      .with({ 'node-version': '18', cache: 'npm' })
    .step()
      .run('npm ci')
    .step()
      .run('npm run build')
    .step()
      .name('Upload build artifacts')
      .uses('actions/upload-artifact@v3')
      .with({ name: 'dist', path: 'dist/' })
    .workflow()
  .job('deploy')
    .needs(['test', 'build'])
    .runsOn('ubuntu-latest')
    .environment({ name: 'production', url: 'https://example.com' })
    .step()
      .name('Download build artifacts')
      .uses('actions/download-artifact@v3')
      .with({ name: 'dist', path: 'dist/' })
    .step()
      .name('Deploy to production')
      .run('echo "Deploying to production..."')
      .env({ DEPLOY_TOKEN: '${{ secrets.DEPLOY_TOKEN }}' })
    .workflow();

console.log('Deploy Workflow YAML:');
console.log(deployWorkflow.toYaml());
console.log('\n' + '='.repeat(50) + '\n');

// Example 5: Validation
console.log('Validation Results:');
console.log('Simple workflow:', simpleWorkflow.validate());
console.log('Matrix workflow:', matrixWorkflow.validate());
console.log('Deploy workflow:', deployWorkflow.validate());
