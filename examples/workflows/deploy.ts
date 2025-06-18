import { createWorkflow, createJob } from '../../src/index';

// Deploy workflow with reusable job patterns
export function createDeployWorkflow() {
  // Reusable job components
  const buildJob = createJob()
    .runsOn('ubuntu-latest')
    .step(step => step.name('Checkout').uses('actions/checkout@v4'))
    .step(step => step.name('Setup Node').uses('actions/setup-node@v4')
      .with({ 'node-version': '18', cache: 'npm' }))
    .step(step => step.name('Install').run('npm ci'))
    .step(step => step.name('Build').run('npm run build'))
    .step(step => step.name('Upload artifacts').uses('actions/upload-artifact@v4')
      .with({ name: 'dist', path: 'dist/' }));

  return createWorkflow()
    .name('Deploy to Production')
    .onPush({ branches: ['main'] })
    .onWorkflowDispatch()
    .concurrency({
      group: 'deploy-prod',
      'cancel-in-progress': false
    })
    .permissions({
      contents: 'read',
      deployments: 'write',
      'id-token': 'write'
    })
    .env({
      NODE_ENV: 'production',
      DEPLOY_ENV: 'prod'
    })
    .job('build', buildJob)
    .job('deploy', job => job
      .runsOn('ubuntu-latest')
      .needs('build')
      .step(step => step
        .name('Download artifacts')
        .uses('actions/download-artifact@v4')
        .with({ name: 'dist', path: 'dist/' })
      )
      .step(step => step
        .name('Deploy to AWS')
        .uses('aws-actions/configure-aws-credentials@v4', action => action
          .with({
            'role-to-assume': '${{ secrets.AWS_DEPLOY_ROLE }}',
            'aws-region': 'us-east-1'
          })
        )
      )
      .step(step => step
        .name('Sync to S3')
        .run('aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }}/ --delete')
      )
      .step(step => step
        .name('Invalidate CloudFront')
        .run('aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"')
      )
    )
    .job('notify', job => job
      .runsOn('ubuntu-latest')
      .needs('deploy')
      .if('always()')
      .step(step => step
        .name('Notify team')
        .uses('8398a7/action-slack@v3')
        .with({
          status: '${{ job.status }}',
          channel: '#deployments',
          webhook_url: '${{ secrets.SLACK_WEBHOOK }}'
        })
        .env({
          SLACK_WEBHOOK_URL: '${{ secrets.SLACK_WEBHOOK }}'
        })
      )
    );
}

// Export the workflow
export default createDeployWorkflow();
