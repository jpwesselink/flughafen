import { createWorkflow, createJob } from '../src';

console.log('=== Job Overloads Demo ===\n');

// Create some reusable job components
const testJob = createJob()
  .runsOn('ubuntu-latest')
  .step(step => 
    step.name('Checkout')
      .uses('actions/checkout@v4')
  )
  .step(step => 
    step.name('Run tests')
      .run('npm test')
      .env({ CI: 'true' })
  );

const buildJob = createJob()
  .runsOn('ubuntu-latest')
  .needs('test')
  .step(step => 
    step.name('Build application')
      .run('npm run build')
  )
  .step(step => 
    step.name('Upload artifacts')
      .uses('actions/upload-artifact@v4', action =>
        action.with({
          name: 'build-artifacts',
          path: 'dist/'
        })
      )
  );

// Create workflow using both forms
const workflow = createWorkflow()
  .name('Job Overloads Demo')
  .onPush({ branches: ['main'] })
  
  // Direct form - using pre-built job objects
  .job('test', testJob)
  .job('build', buildJob)
  
  // Callback form - inline job definition
  .job('deploy', job => 
    job.runsOn('ubuntu-latest')
      .needs('build')
      .if('github.ref == \'refs/heads/main\'')
      .step(step => 
        step.name('Download artifacts')
          .uses('actions/download-artifact@v4', action =>
            action.with({
              name: 'build-artifacts',
              path: 'dist/'
            })
          )
      )
      .step(step => 
        step.name('Deploy to production')
          .run('npm run deploy')
          .env({
            DEPLOY_ENV: 'production'
          })
      )
  )
  
  // Mixed usage - combining both approaches
  .job('notify', createJob()
    .runsOn('ubuntu-latest')
    .needs('deploy')
    .step(step => 
      step.name('Send notification')
        .run('echo "Deployment completed!"')
    )
  );

console.log('Generated workflow with both job forms:');
console.log(workflow.toYAML());

console.log('\n=== Benefits of Job Overloads ===');
console.log('✅ Reusable Components: Create job templates and reuse them');
console.log('✅ Composable Workflows: Build workflows from pre-defined job building blocks');
console.log('✅ Separation of Concerns: Define complex jobs separately, compose in workflow');
console.log('✅ Flexible API: Choose direct form or callback form based on needs');
console.log('✅ Backward Compatible: Existing callback form continues to work');
console.log('✅ Type Safety: Both forms maintain full TypeScript type checking');

console.log('\n=== Usage Patterns ===');
console.log('Direct form: .job("test", preBuiltJobObject)');
console.log('Callback form: .job("test", job => job.runsOn("ubuntu-latest")...)');
console.log('Mixed: Combine both approaches in the same workflow');
