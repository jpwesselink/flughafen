const { createWorkflow } = require('../../dist/index.js');

// Test workflow for watching
module.exports = createWorkflow()
  .name('Test Workflow')
  .onPush({ branches: ['main'] })
  .job('hello', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Say Hello')
      .run('echo "Hello, World!"')
    )
  );
