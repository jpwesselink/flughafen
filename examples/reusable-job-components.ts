import { createWorkflow, createJob } from '../src';

console.log('=== Reusable Job Components Demo ===\n');

// Define reusable job templates
const nodeTestJob = (nodeVersion: string) => createJob()
  .runsOn('ubuntu-latest')
  .step(step => 
    step.name('Checkout')
      .uses('actions/checkout@v4')
  )
  .step(step => 
    step.name(`Setup Node.js ${nodeVersion}`)
      .uses('actions/setup-node@v4', action =>
        action.with({
          'node-version': nodeVersion,
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
      .env({ CI: 'true' })
  );

const lintJob = createJob()
  .runsOn('ubuntu-latest')
  .step(step => 
    step.name('Checkout')
      .uses('actions/checkout@v4')
  )
  .step(step => 
    step.name('Setup Node.js')
      .uses('actions/setup-node@v4', action =>
        action.with({ 'node-version': '18' })
      )
  )
  .step(step => 
    step.name('Install dependencies')
      .run('npm ci')
  )
  .step(step => 
    step.name('Run linter')
      .run('npm run lint')
  );

const buildJob = createJob()
  .runsOn('ubuntu-latest')
  .step(step => 
    step.name('Checkout')
      .uses('actions/checkout@v4')
  )
  .step(step => 
    step.name('Setup Node.js')
      .uses('actions/setup-node@v4', action =>
        action.with({ 'node-version': '18' })
      )
  )
  .step(step => 
    step.name('Install dependencies')
      .run('npm ci')
  )
  .step(step => 
    step.name('Build')
      .run('npm run build')
  )
  .step(step => 
    step.name('Upload build artifacts')
      .uses('actions/upload-artifact@v4', action =>
        action.with({
          name: 'dist',
          path: 'dist/'
        })
      )
  );

// Create workflow using job components
const workflow = createWorkflow()
  .name('Reusable Job Components')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  
  // Use reusable job templates
  .job('lint', lintJob)
  .job('test-node-16', nodeTestJob('16'))
  .job('test-node-18', nodeTestJob('18'))
  .job('test-node-20', nodeTestJob('20'))
  .job('build', buildJob.needs('lint'))
  
  // Mix with inline job definitions
  .job('deploy', job => 
    job.runsOn('ubuntu-latest')
      .needs('build')
      .if('github.ref == \'refs/heads/main\'')
      .step(step => 
        step.name('Download build artifacts')
          .uses('actions/download-artifact@v4', action =>
            action.with({
              name: 'dist',
              path: 'dist/'
            })
          )
      )
      .step(step => 
        step.name('Deploy to production')
          .run('npm run deploy')
      )
  );

console.log('Generated workflow with reusable job components:');
console.log(workflow.toYAML());

console.log('\n=== Reusable Job Components Benefits ===');
console.log('✅ DRY Principle: Define once, use multiple times');
console.log('✅ Parameterized Jobs: Create job factories with parameters');
console.log('✅ Modular Design: Compose complex workflows from simple building blocks');
console.log('✅ Easy Testing: Test job components independently');
console.log('✅ Maintainability: Changes to job templates affect all usages');
console.log('✅ Consistency: Ensure consistent job configuration across workflows');
