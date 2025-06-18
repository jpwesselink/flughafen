import { createWorkflow } from '../src';

console.log('=== Uses Callback Form Demo ===\n');

// Demonstrate both the original direct form and new callback form
const workflow = createWorkflow()
  .name('Uses Callback Demo')
  .onPush({ branches: ['main'] })
  .job('demo', job => 
    job.runsOn('ubuntu-latest')
      // Original direct form (still works)
      .step(step => 
        step.name('Direct uses form')
          .uses('actions/checkout@v4')
          .with({
            repository: 'owner/repo',
            ref: 'main'
          })
      )
      
      // New callback form - more fluent and scoped
      .step(step => 
        step.name('Callback uses form')
          .uses('actions/setup-node@v4', action =>
            action.with({
              'node-version': '18',
              'cache': 'npm',
              'registry-url': 'https://registry.npmjs.org'
            })
            .env({
              NODE_ENV: 'production'
            })
          )
      )
      
      // Complex action configuration with callback
      .step(step => 
        step.name('Complex action with callback')
          .uses('aws-actions/configure-aws-credentials@v4', action =>
            action.with({
              'role-to-assume': 'arn:aws:iam::123456789012:role/DeployRole',
              'aws-region': 'us-east-1',
              'role-duration-seconds': '3600'
            })
            .env({
              AWS_DEFAULT_REGION: 'us-east-1'
            })
          )
      )
      
      // Mixed usage in same workflow
      .step(step => 
        step.name('Traditional with method')
          .uses('actions/upload-artifact@v4')
          .with({
            name: 'build-artifacts',
            path: 'dist/'
          })
      )
  );

console.log('Generated workflow with both uses forms:');
console.log(workflow.toYAML());

console.log('\n=== Benefits of Uses Callback Form ===');
console.log('✅ Scoped Configuration: Action inputs and env vars are scoped to the action');
console.log('✅ Fluent API: Chain action.with().env() for cleaner code');
console.log('✅ Better Readability: Clear separation between action config and step config');
console.log('✅ Type Safety: ActionBuilder provides consistent interface');
console.log('✅ Backward Compatible: Original direct form still works');
console.log('✅ Consistent Pattern: Follows same callback pattern as job() and step()');
