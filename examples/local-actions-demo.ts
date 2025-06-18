import { createWorkflow, createLocalAction } from '../src';

console.log('=== Local Custom Actions Demo ===\n');

// Define local actions
const setupAction = createLocalAction()
  .name('setup-environment')
  .description('Setup development environment with Node.js and dependencies')
  .input('node-version', {
    description: 'Node.js version to install',
    required: true,
    default: '18'
  })
  .input('cache', {
    description: 'Package manager cache to use',
    required: false,
    default: 'npm',
    type: 'choice',
    options: ['npm', 'yarn', 'pnpm']
  })
  .output('node-version', {
    description: 'Installed Node.js version',
    value: '${{ steps.setup-node.outputs.node-version }}'
  })
  .run([
    'echo "Setting up Node.js ${{ inputs.node-version }}"',
    'echo "Using cache: ${{ inputs.cache }}"',
    'npm ci',
    'npm run build'
  ]);

const deployAction = createLocalAction()
  .name('deploy-to-staging')
  .description('Deploy application to staging environment')
  .input('environment', {
    description: 'Target environment',
    required: true,
    default: 'staging'
  })
  .input('dry-run', {
    description: 'Perform a dry run without actual deployment',
    required: false,
    default: false,
    type: 'boolean'
  })
  .output('deployment-url', {
    description: 'URL of the deployed application',
    value: '${{ steps.deploy.outputs.url }}'
  })
  .steps([
    {
      name: 'Deploy application',
      run: 'echo "Deploying to ${{ inputs.environment }}"',
      shell: 'bash',
      env: {
        ENVIRONMENT: '${{ inputs.environment }}',
        DRY_RUN: '${{ inputs.dry-run }}'
      }
    },
    {
      name: 'Set deployment URL',
      run: 'echo "url=https://app-${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT',
      shell: 'bash'
    }
  ]);

const notificationAction = createLocalAction()
  .filename('shared/actions/notify')  // Custom path
  .description('Send deployment notifications')
  .input('status', {
    description: 'Deployment status',
    required: true,
    type: 'choice',
    options: ['success', 'failure', 'pending']
  })
  .input('webhook-url', {
    description: 'Slack webhook URL',
    required: true
  })
  .run([
    'echo "Sending notification: ${{ inputs.status }}"',
    'curl -X POST -H "Content-type: application/json" --data "{\\"text\\":\\"Deployment ${{ inputs.status }}\\"}" ${{ inputs.webhook-url }}'
  ]);

// Create workflow using local actions
const workflow = createWorkflow()
  .name('Local Actions Demo')
  .onPush({ branches: ['main'] })
  .onWorkflowDispatch({
    environment: {
      description: 'Environment to deploy to',
      required: true,
      default: 'staging',
      type: 'choice',
      options: ['staging', 'production']
    }
  })
  
  .job('setup', job =>
    job.runsOn('ubuntu-latest')
      .step(step =>
        step.name('Checkout code')
          .uses('actions/checkout@v4')
      )
      .step(step =>
        step.name('Setup environment')
          .uses(setupAction)  // Use local action
          .with({
            'node-version': '20',
            'cache': 'npm'
          })
      )
  )
  
  .job('deploy', job =>
    job.runsOn('ubuntu-latest')
      .needs('setup')
      .step(step =>
        step.name('Deploy application')
          .uses(deployAction)  // Use another local action
          .with({
            'environment': '${{ github.event.inputs.environment || "staging" }}',
            'dry-run': false
          })
      )
      .step(step =>
        step.name('Notify team')
          .uses(notificationAction)  // Use local action with custom path
          .with({
            'status': 'success',
            'webhook-url': '${{ secrets.SLACK_WEBHOOK }}'
          })
          .if('success()')
      )
      .step(step =>
        step.name('Notify failure')
          .uses(notificationAction)
          .with({
            'status': 'failure',
            'webhook-url': '${{ secrets.SLACK_WEBHOOK }}'
          })
          .if('failure()')
      )
  );

console.log('Generated workflow:');
console.log(workflow.toYAML());

console.log('\n' + '='.repeat(80));
console.log('Generated local action files:');
console.log('='.repeat(80));

console.log('\n--- .github/actions/setup-environment/action.yml ---');
console.log(setupAction.toYAML());

console.log('\n--- .github/actions/deploy-to-staging/action.yml ---');
console.log(deployAction.toYAML());

console.log('\n--- .github/shared/actions/notify/action.yml ---');
console.log(notificationAction.toYAML());

console.log('\n=== Benefits of Local Actions ===');
console.log('✅ Type-safe action definitions');
console.log('✅ Reusable across multiple workflows');
console.log('✅ Automatic file generation during synthesis');
console.log('✅ Custom inputs/outputs with validation');
console.log('✅ Support for composite, Node.js, and Docker actions');
console.log('✅ Custom directory structure with filename() override');
