import { createWorkflow } from "flughafen";

export default createWorkflow()
	.name("TypeScript Error Demo")
	.on("push", { branches: ["main"] })

	.job("test", (job) =>
		job
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Checkout").uses("actions/checkout@v4", (action) =>
					action.with({
						repository: "${{ github.repository }}",
						ref: "${{ github.sha }}",
						"fetch-depth": "invalid_number", // Type error: should be number
						invalidProperty: "test", // Type error: unknown property
					})
				)
			)

			.step((step) =>
				step
					.name("Invalid method call")
					.invalidMethod() // Type error: method doesn't exist
					.run('echo "test"')
			)

			.step(
				(step) => step.name("Missing required properties").uses("actions/setup-node@v4") // Missing required .with() call
			)
	);
