import { createWorkflow, createLocalAction } from '../src';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

console.log('=== Generating Local Actions to .temp-gh Directory ===\n');

// Define local actions (same as before)
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
  .filename('shared/actions/notify')
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
          .uses(setupAction)
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
          .uses(deployAction)
          .with({
            'environment': '${{ github.event.inputs.environment || "staging" }}',
            'dry-run': false
          })
      )
      .step(step =>
        step.name('Notify team')
          .uses(notificationAction)
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

// Helper function to ensure directory exists
function ensureDir(filePath: string) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

// Helper function to write file with directory creation
function writeFile(filePath: string, content: string) {
  ensureDir(filePath);
  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Generated: ${filePath}`);
}

// Generate all files in .temp-gh directory
const baseDir = '.temp-gh';

// 1. Generate workflow file
const workflowPath = join(baseDir, 'workflows', 'local-actions-demo.yml');
writeFile(workflowPath, workflow.toYAML());

// 2. Generate local action files
const actions = [
  {
    action: setupAction,
    path: join(baseDir, 'actions', 'setup-environment', 'action.yml')
  },
  {
    action: deployAction,
    path: join(baseDir, 'actions', 'deploy-to-staging', 'action.yml')
  },
  {
    action: notificationAction,
    path: join(baseDir, 'shared', 'actions', 'notify', 'action.yml')
  }
];

actions.forEach(({ action, path }) => {
  writeFile(path, action.toYAML());
});

console.log('\n' + '='.repeat(80));
console.log('🎉 All files generated successfully in .temp-gh directory!');
console.log('='.repeat(80));

console.log('\n📁 Generated file structure:');
console.log(`${baseDir}/
├── workflows/
│   └── local-actions-demo.yml
├── actions/
│   ├── setup-environment/
│   │   └── action.yml
│   └── deploy-to-staging/
│       └── action.yml
└── shared/
    └── actions/
        └── notify/
            └── action.yml`);

console.log('\n🚀 To use these files:');
console.log(`1. Copy ${baseDir}/ contents to your repository's .github/ directory`);
console.log('2. Commit and push to trigger the workflow');
console.log('3. Local actions will be available for use in other workflows');

console.log('\n📋 Workflow summary:');
console.log('• Triggers on push to main branch and manual dispatch');
console.log('• Uses 3 custom local actions with type-safe inputs');
console.log('• Demonstrates composite actions with environment variables');
console.log('• Shows conditional step execution and custom directory paths');

console.log('\n✨ Benefits demonstrated:');
console.log('✅ Type-safe local action definitions');
console.log('✅ Automatic file generation and organization');
console.log('✅ Reusable actions across workflow jobs');
console.log('✅ Custom directory structures');
console.log('✅ Rich input/output configuration');
console.log('✅ Integration with external marketplace actions');
