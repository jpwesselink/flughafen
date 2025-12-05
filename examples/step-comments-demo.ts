import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Step Comments Demo")
	.filename("step-comments-demo.yml")
	.onPush({ branches: ["main"] })
	.job("build", (job) =>
		job
			.comment("Build and test the application")
			.runsOn("ubuntu-latest")
			.step((step) =>
				step
					.comment("Checkout the repository")
					.name("Checkout")
					.uses("actions/checkout@v4", (a) => a)
			)
			.step((step) =>
				step
					.comment("Setup Node.js environment\nInstalls the specified Node version")
					.name("Setup Node")
					.uses("actions/setup-node@v4", (a) => a.with({ "node-version": "20" }))
			)
			.step((step) => step.comment("Install dependencies").name("Install").run("npm ci"))
			.step((step) => step.comment("Run linter to check code quality").name("Lint").run("npm run lint"))
			.step((step) => step.comment("Build the project").name("Build").run("npm run build"))
	);
