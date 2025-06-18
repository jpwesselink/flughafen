import { createWorkflow } from '../../dist/index.js';

// Live demo workflow - edit this file and watch the magic! ✨
export default createWorkflow()
  .name('Live Demo Workflow')
  .onPush({ branches: ['main'] })
  .env({
    DEMO: 'true',
    VERSION: '1.0.0'
  })
  .job('demo', job => job
    .runsOn('ubuntu-latest')
    .step(step => step
      .name('Hello World')
      .run('echo "Hello from the live demo!"')
    )
    .step(step => step
      .name('Show environment')
      .run('env | grep DEMO')
    )
  );
