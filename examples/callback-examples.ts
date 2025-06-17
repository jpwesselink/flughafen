/**
 * Example usage of the flughafen API
 * Perfect for complex workflows with multiple jobs and clear structure
 */

import { createWorkflow } from '../src';

// Example 1: Simple callback workflow
const simple = createWorkflow()
  .name('Simple Callback Workflow')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('test', job =>
    job.runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => step.setupNode({ with: { 'node-version': '18' } }))
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm test'))
  );

console.log('Simple Callback Workflow:');
console.log(simple.toYAML());
console.log('\n' + '='.repeat(60) + '\n');

// Example 2: Multi-job pipeline with dependencies
const pipeline = createWorkflow()
  .name('CI/CD Pipeline')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .permissions({ contents: 'read', deployments: 'write' })
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
       .step(step => step.run('npm test'))
  )
  .job('build', job =>
    job.needs('test')
       .runsOn('ubuntu-latest')
       .step(step => step.checkout())
       .step(step => step.setupNode({ with: { 'node-version': '18' } }))
       .step(step => step.run('npm ci'))
       .step(step => step.run('npm run build'))
       .step(step =>
         step.name('Upload build artifacts')
             .uses('actions/upload-artifact@v4')
             .with({
               name: 'build-files',
               path: 'dist/'
             })
       )
  )
  .job('deploy', job =>
    job.needs('build')
       .runsOn('ubuntu-latest')
       .if('github.ref == \'refs/heads/main\'')
       .step(step => step.checkout())
       .step(step =>
         step.name('Download build artifacts')
             .uses('actions/download-artifact@v4')
             .with({
               name: 'build-files',
               path: 'dist/'
             })
       )
       .step(step =>
         step.name('Deploy to production')
             .run('npm run deploy')
             .env({
               DEPLOY_TOKEN: '${{ secrets.DEPLOY_TOKEN }}',
               ENVIRONMENT: 'production'
             })
       )
  );

console.log('Complex Pipeline Workflow:');
console.log(pipeline.toYAML());
console.log('\n' + '='.repeat(60) + '\n');

// Example 3: Demonstrating API safety
console.log('API Safety Benefits:');
console.log('===================');

createWorkflow()
  .name('Safe Workflow')
  .onPush()
  .job('example', job => {
    console.log('✅ Inside job callback - only job methods available');
    console.log('✅ job.runsOn(), job.step(), job.strategy(), etc.');
    console.log('❌ Cannot call workflow methods like job.onPush()');
    
    return job.runsOn('ubuntu-latest')
              .step(step => {
                console.log('✅ Inside step callback - only step methods available');
                console.log('✅ step.run(), step.uses(), step.name(), etc.');
                console.log('❌ Cannot call job methods like step.runsOn()');
                console.log('❌ Cannot call workflow methods like step.job()');
                
                return step.checkout();
              });
  }).toYAML();

console.log('\nCallback API Benefits:');
console.log('• Explicit scope boundaries');
console.log('• TypeScript prevents method misuse');
console.log('• Clear visual structure');
console.log('• Perfect for complex workflows');
console.log('• Impossible to accidentally call wrong methods');
