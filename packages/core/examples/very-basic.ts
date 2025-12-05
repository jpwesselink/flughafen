/**
 * Very Basic Example - Minimal Flughafen Workflow
 *
 * This is the simplest possible example showing how to create a GitHub Actions
 * workflow with Flughafen. Perfect for getting started!
 *
 * What this workflow does:
 * 1. Runs on push to main branch
 * 2. Checks out the code
 * 3. Sets up Node.js
 * 4. Installs dependencies
 * 5. Runs tests
 *
 * To generate the workflow file:
 *   flughafen synth examples/very-basic.ts -d .github
 */

import { createWorkflow } from "@flughafen/core";

const workflow = createWorkflow()
	.name("Basic CI")
	.on("push", { branches: ["main"] })
	.job("test", (job) =>
		job
			.runsOn("ubuntu-latest")

			.step((step) => step.name("Checkout code").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (uses) =>
					uses.with({
						"node-version": "18",
						cache: "npm",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("npm install"))

			.step((step) => step.name("Run tests").run("npm test"))
	);

export default workflow;
