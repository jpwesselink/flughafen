/**
 * Simple test to verify the chainable API works
 */

import { createWorkflow } from '../src/lib/builders/WorkflowBuilder';

try {
  const workflow = createWorkflow()
    .name('Test Workflow')
    .onPush({ branches: ['main'] })
    .job('test')
      .runsOn('ubuntu-latest')
      .step()
        .name('Test step')
        .run('echo "Hello World"')
        .workflow();

  console.log('✅ Workflow created successfully!');
  console.log('\nGenerated YAML:');
  console.log(workflow.toYaml());
  
  const validation = workflow.validate();
  console.log('\nValidation result:', validation.valid ? '✅ Valid' : '❌ Invalid');
  if (!validation.valid && validation.errors) {
    console.log('Errors:', validation.errors);
  }
  
} catch (error) {
  console.error('❌ Error creating workflow:', error);
  process.exit(1);
}
