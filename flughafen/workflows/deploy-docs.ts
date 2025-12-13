import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
	.name('Deploy Documentation')
	.on('push', {
		branches: ['main']
	})
	.job('deploy-docs', (job) => job
		.runsOn('ubuntu-latest')
		.permissions({
			contents: 'read',
			pages: 'write',
			'id-token': 'write'
		})
		.step((step) => step
			.name('Checkout code')
			.uses('actions/checkout@v4')
		)
		.step((step) => step
			.name('Setup Node.js')
			.uses('actions/setup-node@v4', (uses) => uses
				.with({
					nodeVersion: '20',
					cache: 'pnpm'
				})
			)
		)
		.step((step) => step
			.name('Install dependencies')
			.run('pnpm install')
		)
		.step((step) => step
			.name('Build docs')
			.run('pnpm docs:build')
		)
		.step((step) => step
			.name('Deploy to Pages')
			.uses('actions/deploy-pages@v4')
		)
	);