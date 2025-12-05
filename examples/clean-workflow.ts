import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Clean Build Demo")
	.on("push", { branches: ["main"] })

	.job("build", (job) =>
		job
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Checkout code").uses("actions/checkout@v4", (action) =>
					action.with({
						repository: "${{ github.repository }}",
						ref: "${{ github.sha }}",
						"fetch-depth": 1,
					})
				)
			)

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (action) =>
					action.with({
						"node-version": "20",
						cache: "npm",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("npm ci"))

			.step((step) => step.name("Run tests").run("npm test"))
	);
