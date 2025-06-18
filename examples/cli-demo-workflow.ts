import { createWorkflow, createJob } from '../src/index';

// Example workflow for CLI testing
export default createWorkflow()
  .name('CLI Watch Demo')
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .env({
    NODE_ENV: 'production',
    CI: true
  })
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Checkout code')
      .checkout()
    )
    .step(step => step
      .name('Setup Node.js')
      .setupNode({ with: { 'node-version': '18', cache: 'npm' } })
    )
    .step(step => step
      .name('Install dependencies')
      .run('npm ci')
    )
    .step(step => step
      .name('Run tests')
      .run('npm test')
      .env({ CI: 'true' })
    )
  )
  .job('build', job => job
    .runsOn('ubuntu-latest')
    .needs('test')
    .step(step => step
      .name('Checkout code')
      .checkout()
    )
    .step(step => step
      .name('Setup Node.js')
      .setupNode({ with: { 'node-version': '18', cache: 'npm' } })
    )
    .step(step => step
      .name('Install dependencies')
      .run('npm ci')
    )
    .step(step => step
      .name('Build project')
      .run('npm run build')
    )
    .step(step => step
      .name('Upload build artifacts')
      .uses('actions/upload-artifact@v4', action => action
        .with({
          name: 'build-artifacts',
          path: 'dist/'
        })
      )
    )
  );
