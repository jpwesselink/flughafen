import { createWorkflow } from "@flughafen/core";

/**
 * Documentation Deployment Workflow
 *
 * Automatically builds and deploys the documentation site to GitHub Pages
 * when changes are detected in:
 * - docs/** (markdown documentation)
 * - packages/documentation-site/** (VitePress configuration)
 * - packages/core/src/** (API changes for TypeDoc)
 * - examples/** (example workflows)
 */
export default createWorkflow()
	.name("Deploy Documentation")
	.filename("deploy-docs")

	// Trigger on changes to docs, examples, or source code
	.on("push", {
		branches: ["main"],
		paths: ["docs/**", "packages/documentation-site/**", "packages/core/src/**", "examples/**"],
	})
	.on("workflow_dispatch") // Allow manual triggers

	// GitHub Pages permissions
	.permissions({
		contents: "read",
		pages: "write",
		"id-token": "write",
	})

	// Prevent concurrent deployments
	.concurrency({
		group: "pages",
		"cancel-in-progress": false,
	})

	// Build job - compile docs and generate API reference
	.job("build", (job) =>
		job
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Checkout repository").uses(
					"actions/checkout@v4",
					(action) => action.with({ "fetch-depth": 0 }) // Full history for timestamps
				)
			)
			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (action) =>
					action.with({
						"node-version": "20",
						cache: "pnpm",
					})
				)
			)
			.step((step) => step.name("Setup pnpm").uses("pnpm/action-setup@v2", (action) => action.with({ version: 8 })))
			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))
			.step((step) =>
				step.name("Build packages").run("pnpm build").comment("Build core packages - needed for TypeDoc generation")
			)
			.step((step) =>
				step
					.name("Generate API documentation")
					.run("cd packages/documentation-site && pnpm typedoc")
					.comment("Generate TypeDoc API reference from source code")
			)
			.step((step) =>
				step
					.name("Build documentation site")
					.run("cd packages/documentation-site && pnpm build")
					.comment("Build VitePress static site")
			)
			.step((step) =>
				step
					.name("Upload Pages artifact")
					.uses("actions/upload-pages-artifact@v3", (action) =>
						action.with({ path: "packages/documentation-site/dist" })
					)
			)
	)

	// Deploy job - publish to GitHub Pages
	.job("deploy", (job) =>
		job
			.runsOn("ubuntu-latest")
			.needs("build")
			.environment({
				name: "github-pages",
				url: "${{ steps.deployment.outputs.page_url }}",
			})
			.step((step) => step.name("Deploy to GitHub Pages").id("deployment").uses("actions/deploy-pages@v4"))
	);
