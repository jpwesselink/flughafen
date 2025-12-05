import { createLocalAction, createWorkflow } from "@flughafen/core";

const setupEnv = createLocalAction()
	.name("setup-environment")
	.description("Setup development environment with all dependencies")
	.comment(
		"Custom composite action for environment setup\nAutomatically handles Node.js installation and dependency caching"
	)
	.input("node-version", {
		description: "Node.js version to install",
		required: false,
		default: "20",
	})
	.output("cache-hit", {
		description: "Whether dependencies were restored from cache",
	})
	.step((step) => step.comment("Checkout repository to get package files").name("Checkout").uses("actions/checkout@v4"))
	.step((step) =>
		step
			.comment("Install Node.js\nVersion specified by input parameter")
			.name("Setup Node")
			.uses("actions/setup-node@v4")
			.with({
				"node-version": "${{ inputs.node-version }}",
				cache: "npm",
			})
	)
	.step((step) => step.comment("Install all npm dependencies").name("Install dependencies").run("npm ci"))
	.step((step) =>
		step
			.comment("Output cache status for debugging")
			.name("Set cache output")
			.id("cache-check")
			.run('echo "cache-hit=true" >> $GITHUB_OUTPUT')
	);

export default createWorkflow()
	.name("Local Action Comments Demo")
	.filename("local-action-comments-demo.yml")
	.onPush({ branches: ["main"] })
	.job("build", (job) =>
		job
			.comment("Build the project using our custom setup action")
			.runsOn("ubuntu-latest")
			.step((step) =>
				step
					.comment("Use our custom environment setup action")
					.name("Setup Environment")
					.uses(setupEnv, (action) => action.with({ "node-version": "20" }))
			)
			.step((step) => step.comment("Build the application").name("Build").run("npm run build"))
	);
