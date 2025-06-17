/**
 * Example usage of the flughafen API
 * Perfect for clean, scoped workflows with no context switching confusion
 */

import { createWorkflow } from '../src';

// Example 1: Simple CI Pipeline
console.log('=== Simple CI Pipeline (flughafen API) ===');
const simple = createWorkflow()
  .name('Simple CI')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job =>
    job.runsOn('ubuntu-latest')
      .step(step => 
        step.name('Checkout')
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
  );

console.log(simple.toYAML());
console.log('\n' + '='.repeat(60) + '\n');

// Example 2: Multi-job pipeline with dependencies
console.log('=== Multi-Job Pipeline (flughafen API) ===');
const pipeline = createWorkflow()
  .name('CI/CD Pipeline')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .permissions({ contents: 'read', deployments: 'write' })
  .env({ NODE_ENV: 'production' })
  .job('lint', job =>
    job.runsOn('ubuntu-latest')
      .step(step => step.checkout())
      .step(step => step.setupNode({ with: { 'node-version': '18' } }))
      .step(step => step.run('npm ci'))
      .step(step => step.run('npm run lint'))
  )
  .job('test', job =>
    job.runsOn('ubuntu-latest')
      .strategy({
        matrix: {
          'node-version': ['16', '18', '20']
        }
      })
      .step(step => step.checkout())
      .step(step => 
        step.setupNode({ 
          with: { 'node-version': '${{ matrix.node-version }}' } 
        })
      )
      .step(step => step.run('npm ci'))
      .step(step => 
        step.name('Run tests')
          .run('npm test')
          .env({ CI: 'true' })
      )
  )
  .job('build', job =>
    job.runsOn('ubuntu-latest')
      .needs('test')
      .step(step => step.checkout())
      .step(step => step.setupNode({ with: { 'node-version': '18' } }))
      .step(step => step.run('npm ci'))
      .step(step => 
        step.name('Build application')
          .run('npm run build')
      )
      .step(step => 
        step.name('Upload build artifacts')
          .uses('actions/upload-artifact@v4')
          .with({
            name: 'build-artifacts',
            path: 'dist/'
          })
      )
  )
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .needs('build')
      .if('github.ref == \'refs/heads/main\'')
      .env({ DEPLOYMENT_ENV: 'production' })
      .step(step => step.checkout())
      .step(step => 
        step.name('Download build artifacts')
          .uses('actions/download-artifact@v4')
          .with({
            name: 'build-artifacts',
            path: 'dist/'
          })
      )
      .step(step => 
        step.name('Deploy to production')
          .run('npm run deploy')
          .env({ 
            AWS_ACCESS_KEY_ID: '${{ secrets.AWS_ACCESS_KEY_ID }}',
            AWS_SECRET_ACCESS_KEY: '${{ secrets.AWS_SECRET_ACCESS_KEY }}'
          })
      )
  );

console.log(pipeline.toYAML());
console.log('\n' + '='.repeat(60) + '\n');

// Example 3: Matrix build with conditional deployment
console.log('=== Matrix Build with Conditional Deployment ===');
const matrix = createWorkflow()
  .name('Cross-Platform Build')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('build', job =>
    job.strategy({
        matrix: {
          os: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
          'node-version': ['16', '18', '20']
        },
        'fail-fast': false
      })
      .runsOn('${{ matrix.os }}')
      .step(step => step.checkout())
      .step(step => 
        step.setupNode({ 
          with: { 'node-version': '${{ matrix.node-version }}' } 
        })
      )
      .step(step => step.run('npm ci'))
      .step(step => 
        step.name('Run tests')
          .run('npm test')
      )
      .step(step => 
        step.name('Build for ${{ matrix.os }}')
          .run('npm run build')
      )
  );

console.log(matrix.toYAML({ validate: true }));
