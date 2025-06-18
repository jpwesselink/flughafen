import { createWorkflow } from './src';

// Test the Quick Start example from README
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

console.log('Quick Start example from README:');
console.log(workflow.toYAML());
