import { createWorkflow } from "@flughafen/core";

/**
 * CI workflow for the Flughafen monorepo
 * Runs tests, linting, and builds on push/PR
 */
const ciWorkflow = createWorkflow()
	.name("CI")
	.filename("ci.yml")

	// Trigger on push to main and PRs
	.on("push", {
		branches: ["main"],
	})
	.on("pull_request", {
		branches: ["main"],
	})

	.permissions({
		contents: "read",
	})

	.env({
		NODE_ENV: "test",
		CI: "true",
	})

	// Test job - runs on multiple Node versions
	.job("test", (job) =>
		job
			.name("Test")
			.runsOn("ubuntu-latest")
			.strategy({
				matrix: {
					"node-version": ["20", "22"],
				},
			})

			.step((step) => step.name("Checkout repository").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js ${{ matrix.node-version }}").uses("actions/setup-node@v4", (uses) =>
					uses.with({
						"node-version": "${{ matrix.node-version }}",
						cache: "pnpm",
					})
				)
			)

			.step((step) =>
				step.name("Install pnpm").uses("pnpm/action-setup@v4", (uses) =>
					uses.with({
						version: "latest",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Run linter").run("pnpm lint"))

			.step((step) => step.name("Run type checks").run("pnpm typecheck"))

			.step((step) => step.name("Run tests with coverage").run("pnpm test:coverage"))

			.step((step) => step.name("Run roundtrip tests").run("pnpm test:roundtrip"))

			.step((step) => step.name("Run dogfood tests").run("pnpm test:dogfood"))

			.step((step) => step.name("Upload coverage to Codecov").uses("codecov/codecov-action@v4"))
	)

	// Build job - only runs after tests pass on push events
	.job("build", (job) =>
		job
			.name("Build")
			.runsOn("ubuntu-latest")
			.needs(["test"])
			.if("github.event_name == 'push'")

			.step((step) => step.name("Checkout repository").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (uses) =>
					uses.with({
						"node-version": "20",
						cache: "pnpm",
					})
				)
			)

			.step((step) =>
				step.name("Install pnpm").uses("pnpm/action-setup@v4", (uses) =>
					uses.with({
						version: "latest",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Build all packages").run("pnpm build"))
	);

// Export the workflow for synthesis
export default ciWorkflow;
