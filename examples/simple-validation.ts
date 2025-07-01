import { createWorkflow } from "flughafen";

export default createWorkflow()
	.name("Simple Validation Demo")
	.on("push", { branches: ["main"] })

	.job("test", (job) =>
		job
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Checkout").uses("actions/checkout@v4", (action) =>
					action.with({
						repository: "${{ github.repository }}",
						ref: "${{ github.sha }}",
						"fetch-depth": 1,
					})
				)
			)

			.step((step) =>
				step.name("Setup Node").uses("actions/setup-node@v4", (action) =>
					action.with({
						"node-version": "20",
						cache: "npm",
					})
				)
			)

			.step((step) =>
				step.name("Test with expressions").run("npm test").env({
					NODE_ENV: "test",
					COMMIT_SHA: "${{ github.sha }}",
					BRANCH: "${{ github.ref_name }}",
					// This should trigger security warning:
					USER_INPUT: "${{ github.event.issue.title }}",
				})
			)
	);
