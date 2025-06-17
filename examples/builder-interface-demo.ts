import { createWorkflow } from '../src';

// Demonstration of the Builder<T> interface pattern
// This shows how the interface provides consistency and type safety

console.log('=== Builder Interface Pattern Demo ===\n');

const workflow = createWorkflow()
  .name('Builder Interface Demo')
  .onPush({ branches: ['main'] })
  .job('demo', job => 
    job.runsOn('ubuntu-latest')
      .step(step => 
        step.name('Step 1')
          .run('echo "All builders implement Builder<T>"')
      )
      .step(step => 
        step.name('Step 2')  
          .run('echo "Internal build() calls are abstracted"')
      )
      .step(step => 
        step.name('Step 3')
          .run('echo "Type safety maintained throughout"')
      )
  );

// The Builder interface allows for:
// 1. Type-safe generic building: Builder<JobConfig>, Builder<WorkflowConfig>, etc.
// 2. Consistent API across all builder classes
// 3. Internal abstraction of .build() calls via buildValue() utility
// 4. Future extensibility for more sophisticated building patterns

console.log('Generated workflow:');
console.log(workflow.toYAML());

console.log('\n=== Benefits of Builder<T> Interface ===');
console.log('✅ Type Safety: All builders guarantee a build() method returning T');
console.log('✅ Consistency: Uniform interface across JobBuilder, StepBuilder, WorkflowBuilder');
console.log('✅ Clean Internals: buildValue() utility eliminates explicit .build() calls');
console.log('✅ Extensibility: Easy to add new builder types following the same pattern');
console.log('✅ Maintainability: Clear contract for what constitutes a "builder"');
