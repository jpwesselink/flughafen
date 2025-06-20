import { createWorkflow } from 'flughafen';

/**
 * CI workflow that builds, tests, and publishes the Flughafen package to npm
 */
const publishWorkflow = createWorkflow()
  .name('Publish to NPM')
  .filename('publish.yml')
  
  // Trigger on version tags
  .onPush({
    tags: ['v*']
  })
  
  .permissions({
    contents: 'read',
    'id-token': 'write' // Required for npm provenance
  })
  .env({
    NODE_ENV: 'production'
  })
  
  // Build and test job
  .job('build-and-test', job => 
    job
      .runsOn('ubuntu-latest')
      
      .step(step => 
        step
          .name('Checkout repository')
          .uses('actions/checkout@v4', uses => uses.with({
            'fetch-depth': 0
          }))
      )
      
      .step(step => 
        step
          .name('Setup Node.js')
          .uses('actions/setup-node@v4', uses => uses.with({
            'node-version': '20',
            cache: 'pnpm',
            'registry-url': 'https://registry.npmjs.org'
          }))
      )
      
      .step(step => 
        step
          .name('Install pnpm')
          .uses('pnpm/action-setup@v4', uses => uses.with({
            version: 'latest'
          }))
      )
      
      .step(step => 
        step
          .name('Install dependencies')
          .run('pnpm install --frozen-lockfile')
      )
      
      .step(step => 
        step
          .name('Run linter')
          .run('pnpm run lint')
      )
      
      .step(step => 
        step
          .name('Run tests')
          .run('pnpm test')
      )
      
      .step(step => 
        step
          .name('Build package')
          .run('pnpm run build')
      )
      
      .step(step => 
        step
          .name('Check package contents')
          .run('pnpm pack --dry-run')
      )
  )
  
  // Publish job
  .job('publish', job => 
    job
      .runsOn('ubuntu-latest')
      .needs(['build-and-test'])
      .if('startsWith(github.ref, \'refs/tags/v\')')
      
      .step(step => 
        step
          .name('Checkout repository')
          .uses('actions/checkout@v4')
      )
      
      .step(step => 
        step
          .name('Setup Node.js')
          .uses('actions/setup-node@v4', uses => uses.with({
            'node-version': '20',
            cache: 'pnpm',
            'registry-url': 'https://registry.npmjs.org'
          }))
      )
      
      .step(step => 
        step
          .name('Install pnpm')
          .uses('pnpm/action-setup@v4', uses => uses.with({
            version: 'latest'
          }))
      )
      
      .step(step => 
        step
          .name('Install dependencies')
          .run('pnpm install --frozen-lockfile')
      )
      
      .step(step => 
        step
          .name('Build package')
          .run('pnpm run build')
      )
      
      .step(step => 
        step
          .name('Publish to NPM')
          .run('pnpm publish --access public --provenance')
          .env({
            NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}'
          })
      )
  );

// Export the workflow for synthesis
export default publishWorkflow;
