import { createWorkflow } from 'flughafen';

/**
 * Demo workflow showcasing type-aware expression validation
 * This workflow demonstrates:
 * 1. Expression validation with context awareness
 * 2. Type-safe action usage with generated interfaces
 * 3. Security and performance suggestions
 */
export default createWorkflow()
	.name('Demo Type-Aware Validation')
	.on('push', { branches: ['main'] })
	.on('pull_request', { types: ['opened', 'synchronize'] })
	
	.job('validate-expressions', job => 
		job.runsOn('ubuntu-latest')
			.step(step =>
				step.name('Checkout code')
					.id('checkout')
					.uses('actions/checkout@v4', action =>
						action.with({
							repository: '${{ github.repository }}', // Valid context
							ref: '${{ github.event.pull_request.head.sha }}', // Valid for PR events
							'fetch-depth': 2, // Type-safe number input
							token: '${{ secrets.GITHUB_TOKEN }}' // Valid secret reference
						})
					)
			)
			
			.step(step =>
				step.name('Setup Node.js')
					.id('setup-node')
					.uses('actions/setup-node@v4', action =>
						action.with({
							'node-version': '${{ matrix.node-version }}', // References matrix context
							'cache': 'npm',
							'registry-url': 'https://registry.npmjs.org/'
						})
					)
			)
			
			.step(step =>
				step.name('Install dependencies')
					.run('npm ci')
					.env({
						NODE_ENV: 'production',
						// This will trigger validation suggestions:
						API_KEY: '${{ github.event.issue.body }}' // Security risk: untrusted input
					})
			)
			
			.step(step =>
				step.name('Run tests with coverage')
					.id('test')
					.run('npm run test:coverage')
					.env({
						// Type-aware validation will check these expressions:
						NODE_VERSION: '${{ steps.setup-node.outputs.node-version }}', // Valid step output reference
						COMMIT_SHA: '${{ github.sha }}', // Valid context
						BRANCH_NAME: '${{ github.ref_name }}' // Valid context
					})
			)
			
			.step(step =>
				step.name('Upload coverage')
					.uses('codecov/codecov-action@v3', action =>
						action.with({
							files: './coverage/lcov.info',
							flags: 'unittests',
							name: 'codecov-umbrella',
							// This will be validated against codecov action schema:
							fail_ci_if_error: true, // Boolean type validation
							verbose: '${{ runner.debug }}' // Valid runner context
						})
					)
			)
			
			.step(step =>
				step.name('Comment on PR')
					.if('${{ github.event_name == "pull_request" }}') // Event context validation
					.uses('actions/github-script@v7', action =>
						action.with({
							script: `
								const coverage = '${{ steps.test.outputs.coverage }}';
								// Expression validation will check step output exists
								console.log('Coverage: ' + coverage + '%');
							`
						})
					)
			)
	)
	
	.job('matrix-demo', job =>
		job.runsOn('ubuntu-latest')
			.strategy({
				matrix: {
					'node-version': [18, 20, 22],
					os: ['ubuntu-latest', 'windows-latest', 'macos-latest']
				}
			})
			.step(step =>
				step.name('Matrix validation demo')
					.run('echo "Node: ${{ matrix.node-version }}, OS: ${{ matrix.os }}"')
					.env({
						// These will be validated for matrix context availability:
						NODE_VER: '${{ matrix.node-version }}', // Valid matrix reference
						RUNNER_OS: '${{ matrix.os }}', // Valid matrix reference
						// This will trigger a warning (unknown matrix key):
						UNKNOWN: '${{ matrix.unknown-key }}' // Invalid matrix reference
					})
			)
	);