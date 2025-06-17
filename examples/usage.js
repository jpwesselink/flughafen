"use strict";
/**
 * Example usage of the flughafen GitHub Actions workflow builder
 * Demonstrating the new auto-completion API - no more build() calls!
 */
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
// Example 1: Simple workflow with auto-completion
var simpleWorkflow = (0, src_1.createWorkflow)()
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
console.log('Simple Workflow YAML:');
console.log(simpleWorkflow.toYAML());
console.log('\n' + '='.repeat(50) + '\n');
// Example 2: Complex workflow with matrix strategy
var matrixWorkflow = (0, src_1.createWorkflow)()
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
console.log('Matrix Workflow YAML:');
console.log(matrixWorkflow.toYAML());
console.log('\n' + '='.repeat(50) + '\n');
// Example 3: Using preset
var presetWorkflow = src_1.presets.nodeCI('My Node CI', {
    branches: ['main', 'develop'],
    nodeVersions: ['18', '20'],
    runners: ['ubuntu-latest']
});
console.log('Preset Workflow YAML:');
console.log(presetWorkflow.toYAML());
console.log('\n' + '='.repeat(50) + '\n');
// Example 4: Complex workflow with multiple jobs
var deployWorkflow = (0, src_1.createWorkflow)()
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
    .job('deploy')
    .needs(['test', 'build'])
    .runsOn('ubuntu-latest')
    .environment('production')
    .step()
    .checkout()
    .step()
    .setupNode()
    .with({ 'node-version': '18', cache: 'npm' })
    .step()
    .run('npm ci')
    .step()
    .name('Deploy to production')
    .run('npm run deploy')
    .env({ DEPLOY_KEY: '${{ secrets.DEPLOY_KEY }}' });
console.log('Deploy Workflow YAML:');
console.log(deployWorkflow.toYAML());
console.log('\n' + '='.repeat(50) + '\n');
// Example 5: Validation  
var workflow = (0, src_1.createWorkflow)()
    .name('Test Workflow')
    .onPush({ branches: ['main'] })
    .job('test')
    .runsOn('ubuntu-latest')
    .step()
    .name('Test')
    .run('npm test');
console.log('Validation Results:');
console.log('Workflow validation:', workflow.workflow().validate());
