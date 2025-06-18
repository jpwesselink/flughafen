import { createWorkflow } from '../../src/index';

// Simple CI workflow
export default createWorkflow()
  .name('Node.js CI')
  .onPush({ branches: ['main', 'develop'] })
  .onPullRequest()
  .env({
    NODE_ENV: 'test',
    CI: true
  })
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .strategy({
      matrix: {
        'node-version': ['16', '18', '20']
      }
    })
    .step(step => step
      .name('Checkout code')
      .uses('actions/checkout@v4')
    )
    .step(step => step
      .name('Setup Node.js ${{ matrix.node-version }}')
      .uses('actions/setup-node@v4', action => action
        .with({
          'node-version': '${{ matrix.node-version }}',
          cache: 'npm'
        })
      )
    )
    .step(step => step
      .name('Install dependencies')
      .run('npm ci')
    )
    .step(step => step
      .name('Run tests')
      .run('npm test')
      .env({
        FORCE_COLOR: '1'
      })
    )
    .step(step => step
      .name('Upload coverage')
      .uses('codecov/codecov-action@v4')
      .if('matrix.node-version == 18')
    )
  )
  .job('lint', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Checkout code')
      .uses('actions/checkout@v4')
    )
    .step(step => step
      .name('Setup Node.js')
      .uses('actions/setup-node@v4', action => action
        .with({
          'node-version': '18',
          cache: 'npm'
        })
      )
    )
    .step(step => step
      .name('Install dependencies')
      .run('npm ci')
    )
    .step(step => step
      .name('Run linter')
      .run('npm run lint')
    )
  );
