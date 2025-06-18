import { createWorkflow } from '../../dist/index.js';

// Workflow that specifies its own filename
export default createWorkflow()
  .name('Smart Filename Demo')
  .filename('smart-demo.yml')  // This workflow will be saved as smart-demo.yml
  .onPush({ branches: ['main'] })
  .onPullRequest()
  .job('demo', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Show smart filename feature')
      .run('echo "This workflow saves itself as smart-demo.yml!"')
    )
    .step(step => step
      .name('Another step')
      .run('echo "No need to specify output filename in CLI!"')
    )
  );
