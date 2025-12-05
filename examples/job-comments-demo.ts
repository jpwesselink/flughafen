import { createWorkflow } from "@flughafen/core";

export default createWorkflow()
	.name("Job Comments Demo")
	.filename("job-comments-demo.yml")
	.onPush({ branches: ["main"] })
	.job("build", (job) =>
		job
			.comment("This job builds the project and runs linting")
			.runsOn("ubuntu-latest")
			.step((step) => step.name("Checkout").uses("actions/checkout@v4", (a) => a))
			.step((step) => step.name("Build").run("npm run build"))
	)
	.job("test", (job) =>
		job
			.comment("Run all tests\nIncludes unit tests, integration tests, and e2e tests")
			.runsOn("ubuntu-latest")
			.needs("build")
			.step((step) => step.name("Checkout").uses("actions/checkout@v4", (a) => a))
			.step((step) => step.name("Test").run("npm test"))
	)
	.job("deploy", (job) =>
		job
			.comment("Deploy to production\nOnly runs on main branch")
			.runsOn("ubuntu-latest")
			.needs(["build", "test"])
			.if("github.ref == 'refs/heads/main'")
			.step((step) => step.name("Deploy").run("npm run deploy"))
	);
