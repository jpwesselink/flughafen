import { createWorkflow } from 'flughafen';

// Simple workflow that uses external GitHub Actions directly
const workflow = createWorkflow()
  .name('Simple CI')
  .onPush({ branches: ['main'] })
  .job('test', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Checkout')
      .uses('actions/checkout@v4', uses => uses.with({
        repository: 'test/repo',
        ref: 'main'
      }))
    )
    .step(step => step
      .name('Setup Node')
      .uses('actions/setup-node@v4', uses => uses.with({
        'node-version': '18',
        cache: 'npm'
      }))
    )
    .step(step => step
      .name('Upload coverage')
      .uses('codecov/codecov-action@v3', uses => uses.with({
        token: '${{ secrets.CODECOV_TOKEN }}'
      }))
      
    )
  );

export default workflow;
