import { createLocalAction, createWorkflow } from "@flughafen/core";

/**
 * Basic Usage Example - Getting Started with Flughafen
 *
 * This example demonstrates the core features of flughafen:
 * 1. Creating workflows with the fluent API
 * 2. Using local custom actions
 * 3. Type-safe local actions with generics (NEW!) ⭐
 * 4. Generating complete GitHub Actions workflows and actions
 *
 * ✨ NEW: Type-safe local actions provide:
 * - IntelliSense/autocomplete for action inputs in .with()
 * - Compile-time validation of input types
 * - Better developer experience and fewer runtime errors
 * - Clear documentation of expected input/output types
 *
 * To run this example:
 *
 * Preview the generated files:
 *   flughafen synth examples/basic-usage.ts --dry-run
 *
 * Generate files to .github directory:
 *   flughafen synth examples/basic-usage.ts -d .github
 *
 * Generate files to custom directory:
 *   flughafen synth examples/basic-usage.ts -d ci
 */

// Create a local action for setting up Node.js environment
const setupNodeAction = createLocalAction()
	.name("setup-node-env")
	.description("Setup Node.js environment with dependency caching")
	.input("node-version", {
		description: "Node.js version to install",
		required: false,
		default: "18",
	})
	.input("package-manager", {
		description: "Package manager to use",
		type: "choice",
		options: ["npm", "yarn", "pnpm"],
		required: false,
		default: "npm",
	})
	.output("cache-hit", {
		description: "Whether dependencies were restored from cache",
		value: "${{ steps.setup.outputs.cache-hit }}",
	})
	.using("composite")
	.steps([
		{
			name: "Setup Node.js",
			id: "setup",
			uses: "actions/setup-node@v4",
			with: {
				"node-version": "${{ inputs.node-version }}",
				cache: "${{ inputs.package-manager }}",
			},
		},
		{
			name: "Install dependencies",
			run: "${{ inputs.package-manager }} install",
			shell: "bash",
		},
	]);

// Create a local action for running tests with coverage
const testAction = createLocalAction()
	.name("run-tests")
	.description("Run tests and upload coverage reports")
	.input("test-command", {
		description: "Command to run tests",
		required: false,
		default: "npm test",
	})
	.input("coverage-provider", {
		description: "Coverage service to use",
		type: "choice",
		options: ["codecov", "coveralls"],
		required: false,
		default: "codecov",
	})
	.output("test-result", {
		description: "Test execution result",
		value: "${{ steps.test.outputs.result }}",
	})
	.using("composite")
	.steps([
		{
			name: "Run tests",
			id: "test",
			run: "${{ inputs.test-command }}",
			shell: "bash",
		},
		{
			name: "Upload coverage to Codecov",
			if: "${{ inputs.coverage-provider == 'codecov' && always() }}",
			uses: "codecov/codecov-action@v3",
			with: {
				token: "${{ github.token }}",
			},
		},
		{
			name: "Upload coverage to Coveralls",
			if: "${{ inputs.coverage-provider == 'coveralls' && always() }}",
			uses: "coverallsapp/github-action@v2",
			with: {
				"github-token": "${{ github.token }}",
				pewp: "true",
			},
		},
	]);

// ===========================================
// 🎯 TYPED LOCAL ACTION EXAMPLE
// ===========================================

// Define interfaces for type safety
interface DeployInputs {
	environment: "staging" | "production";
	appName: string;
	version: string;
	dryRun: boolean;
}

interface DeployOutputs {
	deploymentUrl: string;
	version: string;
	status: "success" | "failed";
}

// Create a fully type-safe local action
const typedDeployAction = createLocalAction<DeployInputs, DeployOutputs>()
	.name("typed-deploy")
	.description("Type-safe deployment action with IntelliSense support")
	.input("environment", {
		description: "Target environment",
		required: true,
		type: "choice",
		options: ["staging", "production"],
	})
	.input("appName", {
		description: "Application name",
		required: true,
	})
	.input("version", {
		description: "Version to deploy",
		required: true,
		default: "latest",
	})
	.input("dryRun", {
		description: "Run deployment in dry-run mode",
		required: false,
		default: false,
	})
	.output("deploymentUrl", {
		description: "URL of the deployed application",
	})
	.output("version", {
		description: "Deployed version",
	})
	.output("status", {
		description: "Deployment status",
	})
	.steps([
		'echo "🚀 Starting deployment..."',
		{
			name: "Deploy application",
			run: 'echo "Deploying ${{ inputs.appName }} v${{ inputs.version }} to ${{ inputs.environment }}"',
			shell: "bash",
		},
		{
			name: "Set deployment outputs",
			run: `echo "deploymentUrl=https://\${{ inputs.appName }}-\${{ inputs.environment }}.example.com" >> \$GITHUB_OUTPUT
echo "version=\${{ inputs.version }}" >> \$GITHUB_OUTPUT
echo "status=success" >> \$GITHUB_OUTPUT`,
			shell: "bash",
		},
	]);

// Create the main CI workflow using both local actions
const workflow = createWorkflow()
	.name("Continuous Integration")
	.filename("ci.yml")

	// Trigger on push and pull requests
	.on("create") // No config allowed for create event
	.on("pull_request", {
		branches: ["main"],
	})
	// Additional triggers:
	.on("schedule", [{ cron: "0 2 * * 1" }]) // Run weekly on Mondays at 2 AM
	.on("workflow_dispatch", {}) // Allow manual triggering

	// Global environment variables
	.env({
		NODE_ENV: "test",
		CI: true,
	})

	// Test job
	.job("test", (job) =>
		job
			.runsOn("ubuntu-latest")
			.strategy({
				matrix: {
					"node-version": ["16", "18", "20"],
				},
			})

			.step((step) => step.name("Checkout repository").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js environment").uses(setupNodeAction, (uses) =>
					uses.with({
						"node-version": "${{ matrix.node-version }}",
						"package-manager": "npm",
					})
				)
			)

			.step((step) => step.name("Lint code").run("npm run lint"))

			.step((step) =>
				step.name("Run tests with coverage").uses(testAction, (uses) =>
					uses.with({
						"test-command": "npm run test:coverage",
						"coverage-provider": "codecov",
					})
				)
			)
	)

	// Build job (runs after tests pass)
	.job("build", (job) =>
		job
			.runsOn("ubuntu-latest")
			.needs(["test"])
			.if("${{ github.event_name == 'push' }}")

			.step((step) => step.name("Checkout repository").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js environment").uses(setupNodeAction, (uses) =>
					uses.with({
						"node-version": "18",
						"package-manager": "npm",
					})
				)
			)

			.step((step) => step.name("Build project").run("npm run build"))

			.step((step) =>
				step.name("Upload build artifacts").uses("actions/upload-artifact@v3", (uses) =>
					uses.with({
						name: "build-artifacts",
						path: "dist/",
						"retention-days": "7",
					})
				)
			)
	)

	// Type-safe deployment job
	.job("deploy-staging", (job) =>
		job
			.runsOn("ubuntu-latest")
			.needs(["build"])
			.if("${{ github.ref == 'refs/heads/main' }}")

			.step((step) =>
				step.name("Deploy to staging with type safety").uses(typedDeployAction, (uses) =>
					uses.with({
						environment: "staging", // ✅ Only 'staging' | 'production' allowed
						appName: "my-awesome-app", // ✅ Required string input
						version: "${{ github.sha }}", // ✅ String input with dynamic value
						dryRun: false, // ✅ Boolean input
						// invalidInput: 'test'    // ❌ TypeScript error! Not in DeployInputs interface
					})
				)
			)
	);

// Export the workflow for the CLI
export default workflow;
