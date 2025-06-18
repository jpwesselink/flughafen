import { createWorkflow, createJob } from '../src/index';

// Function-based workflow export
export function createDeployWorkflow() {
  return createWorkflow()
    .name('Deploy Application')
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
    .env({
      DEPLOY_ENV: '${{ github.event.inputs.environment || "staging" }}'
    })
    .job('deploy', job => job
      .runsOn('ubuntu-latest')
      .if('github.ref == "refs/heads/main"')
      .step(step => step
        .name('Checkout code')
        .checkout()
      )
      .step(step => step
        .name('Setup Node.js')
        .setupNode({ with: { 'node-version': '20', cache: 'yarn' } })
      )
      .step(step => step
        .name('Install dependencies')
        .run('yarn install --frozen-lockfile')
      )
      .step(step => step
        .name('Build for production')
        .run('yarn build')
        .env({ NODE_ENV: 'production' })
      )
      .step(step => step
        .name('Deploy to ${{ env.DEPLOY_ENV }}')
        .run('yarn deploy')
        .env({
          DEPLOY_TARGET: '${{ env.DEPLOY_ENV }}',
          API_KEY: '${{ secrets.DEPLOY_API_KEY }}'
        })
      )
      .step(step => step
        .name('Notify deployment')
        .run('echo "Deployed to $DEPLOY_ENV successfully!"')
      )
    );
}

// Export as default (the CLI will find this)
export default createDeployWorkflow();
