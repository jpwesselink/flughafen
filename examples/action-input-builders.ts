/**
 * Example using generated action input builders
 * This shows how to use the type-safe builders for GitHub Actions
 */

import { createWorkflow } from '../src/lib/builders/WorkflowBuilder';
import { createCallbackWorkflow } from '../src/lib/builders/CallbackWorkflowBuilder';

// First, generate the builders by running:
// pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4
// pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4
// pnpm exec tsx scripts/generateActionInputBuilder.ts aws-actions/configure-aws-credentials@v4

// Then you can import and use them:
// import { CheckoutInputsBuilder_v4 } from '../generated/CheckoutInputsBuilder_v4';
// import { SetupNodeInputsBuilder_v4 } from '../generated/SetupNodeInputsBuilder_v4';
// import { ConfigureAwsCredentialsInputsBuilder_v4 } from '../generated/ConfigureAwsCredentialsInputsBuilder_v4';

console.log('=== Generated Action Input Builders Example ===');

// Example workflow using generated input builders (commented out as builders may not exist)
const exampleWithBuilders = createWorkflow()
  .name('Type-Safe Action Inputs')
  .onPush({ branches: ['main'] })
  .job('deploy', job => {
    job.runsOn('ubuntu-latest')
      .step(step => {
        // Using generated CheckoutInputsBuilder_v4
        // const checkoutInputs = new CheckoutInputsBuilder_v4()
        //   .repository('owner/repo')
        //   .ref('main')
        //   .fetchDepth('1')
        //   .submodules('recursive')
        //   .build();
        
        step.name('Checkout with type-safe inputs')
          .uses('actions/checkout@v4');
          // .with(checkoutInputs);
      })
      .step(step => {
        // Using generated SetupNodeInputsBuilder_v4
        // const nodeInputs = new SetupNodeInputsBuilder_v4()
        //   .nodeVersion('18')
        //   .cache('npm')
        //   .registryUrl('https://registry.npmjs.org')
        //   .build();
        
        step.name('Setup Node.js with type-safe inputs')
          .uses('actions/setup-node@v4');
          // .with(nodeInputs);
      })
      .step(step => {
        // Using generated ConfigureAwsCredentialsInputsBuilder_v4
        // const awsInputs = new ConfigureAwsCredentialsInputsBuilder_v4()
        //   .awsAccessKeyId('${{ secrets.AWS_ACCESS_KEY_ID }}')
        //   .awsSecretAccessKey('${{ secrets.AWS_SECRET_ACCESS_KEY }}')
        //   .awsRegion('us-east-1')
        //   .roleDurationSeconds('3600')
        //   .build();
        
        step.name('Configure AWS credentials')
          .uses('aws-actions/configure-aws-credentials@v4');
          // .with(awsInputs);
      });
  });

console.log(exampleWithBuilders.toYAML());

// =================================================================
// PRACTICAL EXAMPLE: Manual input configuration vs Generated builders
// =================================================================

console.log('\n=== Manual vs Generated Input Comparison ===');

// Manual approach (error-prone, no type safety)
const manualWorkflow = createCallbackWorkflow()
  .name('Manual Input Configuration')
  .onPush()
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout')
          .uses('actions/checkout@v4')
          .with({
            'repository': 'owner/repo',
            'ref': 'main',
            'fetch-depth': '1', // Could accidentally use string instead of number
            'submodules': 'recursive',
            // Easy to misspell or use wrong parameter names
          })
      )
      .step(step =>
        step.name('Setup Node.js')
          .uses('actions/setup-node@v4')
          .with({
            'node-version': '18',
            'cache': 'npm',
            'registry-url': 'https://registry.npmjs.org',
            // No autocomplete or validation
          })
      )
  );

// Generated builder approach (type-safe, autocomplete)
const generatedWorkflow = createCallbackWorkflow()
  .name('Generated Builder Configuration')
  .onPush()
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .step(step => {
        // Example of what generated builders would look like:
        /*
        const checkoutInputs = new CheckoutInputsBuilder_v4()
          .repository('owner/repo')      // ✅ Type-safe
          .ref('main')                   // ✅ Autocomplete
          .fetchDepth(1)                 // ✅ Correct types (number, not string)
          .submodules('recursive')       // ✅ Enum validation
          .build();
        */
        
        return step.name('Checkout with generated builder')
          .uses('actions/checkout@v4');
          // .with(checkoutInputs);        // ✅ Fully typed
      })
      .step(step => {
        /*
        const nodeInputs = new SetupNodeInputsBuilder_v4()
          .nodeVersion('18')             // ✅ Type-safe
          .cache('npm')                  // ✅ Enum validation
          .registryUrl('https://registry.npmjs.org')
          .build();
        */
        
        return step.name('Setup Node.js with generated builder')
          .uses('actions/setup-node@v4');
          // .with(nodeInputs);
      })
  );

console.log('Manual approach:', manualWorkflow.toYAML({ validate: false }));
console.log('\nGenerated builder approach:', generatedWorkflow.toYAML({ validate: false }));

// =================================================================
// HOW TO GENERATE BUILDERS
// =================================================================

console.log('\n=== How to Generate Action Input Builders ===');
console.log(`
To generate type-safe input builders for any GitHub Action:

1. Generate a builder for actions/checkout@v4:
   pnpm exec tsx scripts/generateActionInputBuilder.ts actions/checkout@v4

2. Generate a builder for actions/setup-node@v4:
   pnpm exec tsx scripts/generateActionInputBuilder.ts actions/setup-node@v4

3. Generate a builder for any action:
   pnpm exec tsx scripts/generateActionInputBuilder.ts <owner>/<repo>@<version>

This creates versioned files in the generated/ directory:
- generated/CheckoutInputsBuilder_v4.ts
- generated/SetupNodeInputsBuilder_v4.ts
- etc.

Benefits:
✅ Full TypeScript type safety
✅ IDE autocomplete and IntelliSense
✅ Compile-time validation of input parameters
✅ CamelCase method names for better DX
✅ Versioned builders prevent conflicts
✅ Automatic input validation and transformation
`);

// =================================================================
// REAL WORLD EXAMPLE
// =================================================================

console.log('\n=== Real World Example ===');
const realWorld = createCallbackWorkflow()
  .name('Production Deployment')
  .onWorkflowDispatch({
    environment: {
      description: 'Environment to deploy to',
      required: true,
      type: 'choice',
      options: ['staging', 'production']
    }
  })
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .environment({
        name: '${{ github.event.inputs.environment }}',
        url: 'https://${{ github.event.inputs.environment }}.example.com'
      })
      .step(step =>
        step.name('Checkout')
          .checkout() // Uses convenience method from CallbackStepBuilder
      )
      .step(step =>
        step.name('Setup Node.js')
          .setupNode({ 
            with: { 
              'node-version': '18',
              'cache': 'npm'
            }
          })
      )
      .step(step =>
        step.name('Install dependencies')
          .run('npm ci')
      )
      .step(step =>
        step.name('Build application')
          .run('npm run build')
          .env({
            NODE_ENV: 'production',
            ENVIRONMENT: '${{ github.event.inputs.environment }}'
          })
      )
      .step(step =>
        step.name('Deploy to ${{ github.event.inputs.environment }}')
          .run('npm run deploy')
          .env({
            DEPLOY_TOKEN: '${{ secrets.DEPLOY_TOKEN }}',
            ENVIRONMENT: '${{ github.event.inputs.environment }}'
          })
      )
  );

console.log(realWorld.toYAML({ validate: false }));
