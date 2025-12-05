import { createWorkflow } from "@flughafen/core";

/**
 * Advanced Workflow Triggers Example
 *
 * This example demonstrates the new generic on() method for workflow triggers,
 * showcasing its flexibility to handle any GitHub event type with appropriate configuration.
 */

// Create a comprehensive workflow that responds to many different GitHub events
const advancedWorkflow = createWorkflow()
	.name("Advanced Event Handling")
	.filename("advanced-triggers.yml")

	// Code-related triggers
	.on("push", {
		branches: ["main", "develop"],
		paths: ["src/**", "tests/**", "!docs/**"],
	})
	.on("pull_request", {
		types: ["opened", "synchronize", "reopened"],
		branches: ["main"],
	})
	.on("pull_request_target", {
		types: ["opened", "synchronize"],
		branches: ["main"],
	})

	// Release and deployment triggers
	.on("release", {
		types: ["published", "prereleased"],
	})
	.on("deployment")
	.on("deployment_status")

	// Issue and project management triggers
	.on("issues", {
		types: ["opened", "labeled"],
	})
	.on("issue_comment", {
		types: ["created"],
	})
	.on("pull_request_review", {
		types: ["submitted"],
	})

	// Repository activity triggers
	.on("fork")
	.on("watch", { types: ["started"] })
	.on("create") // Branch or tag creation
	.on("delete") // Branch or tag deletion

	// Scheduled and manual triggers
	.on("schedule", [
		{ cron: "0 2 * * 1" }, // Weekly on Monday at 2 AM
		{ cron: "0 0 1 * *" }, // Monthly on the 1st at midnight
	])
	.on("workflow_dispatch", {
		inputs: {
			environment: {
				description: "Environment to run against",
				required: true,
				type: "choice",
				options: ["development", "staging", "production"],
			},
			debug: {
				description: "Enable debug mode",
				required: false,
				type: "boolean",
				default: false,
			},
			custom_message: {
				description: "Custom message for the run",
				required: false,
				type: "string",
				default: "Manual workflow run",
			},
		},
	})
	.on("repository_dispatch", {
		types: ["deploy", "test"],
	})

	// Workflow call (for reusable workflows)
	.on("workflow_call", {
		inputs: {
			environment: {
				description: "Target environment",
				required: true,
				type: "string",
			},
		},
		secrets: {
			deploy_token: {
				description: "Token for deployment",
				required: true,
			},
		},
	})

	.job("event-handler", (job) =>
		job
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Print Event Information").run(`
						echo "Event: \${{ github.event_name }}"
						echo "Action: \${{ github.event.action }}"
						echo "Repository: \${{ github.repository }}"
						echo "Branch: \${{ github.ref_name }}"
						echo "SHA: \${{ github.sha }}"
					`)
			)
			.step((step) =>
				step
					.name("Handle Scheduled Events")
					.if("github.event_name == 'schedule'")
					.run('echo "This is a scheduled workflow run"')
			)
			.step((step) =>
				step
					.name("Handle Manual Dispatch")
					.if("github.event_name == 'workflow_dispatch'")
					.run(`
						echo "Manual workflow triggered"
						echo "Environment: \${{ github.event.inputs.environment }}"
						echo "Debug mode: \${{ github.event.inputs.debug }}"
						echo "Message: \${{ github.event.inputs.custom_message }}"
					`)
			)
			.step((step) =>
				step
					.name("Handle Issues")
					.if("github.event_name == 'issues'")
					.run(`
						echo "Issue event: \${{ github.event.action }}"
						echo "Issue title: \${{ github.event.issue.title }}"
						echo "Issue number: \${{ github.event.issue.number }}"
					`)
			)
			.step((step) =>
				step
					.name("Handle Releases")
					.if("github.event_name == 'release'")
					.run(`
						echo "Release event: \${{ github.event.action }}"
						echo "Release tag: \${{ github.event.release.tag_name }}"
						echo "Release name: \${{ github.event.release.name }}"
					`)
			)
	);

// Export the workflow for processing
export default advancedWorkflow;
