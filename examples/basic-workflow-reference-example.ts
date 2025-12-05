#!/usr/bin/env tsx
/**
 * Basic Example: Enhanced Workflow References
 *
 * A simple example showing the before/after of the enhanced workflow reference system.
 */

import { createJob, createWorkflow } from "../packages/core/src/index.js";

// ============================================================================
// STEP 1: Create a reusable workflow
// ============================================================================

const simpleTestWorkflow = createWorkflow()
	.name("Simple Test Workflow")
	.on("workflow_call", {
		inputs: {
			test_command: {
				description: "Command to run tests",
				type: "string",
				default: "npm test",
			},
		},
	})
	.job(
		"test",
		createJob()
			.runsOn("ubuntu-latest")
			.step((step) => step.name("Checkout").uses("actions/checkout@v4"))
			.step((step) => step.name("Run Tests").run("${{ inputs.test_command }}"))
	);

// ============================================================================
// STEP 2: Use the workflow with type-safe references
// ============================================================================

// ❌ OLD WAY (string-based, error-prone)
const oldWayWorkflow = createWorkflow()
	.name("Old Way - String References")
	.on("push")
	.job(
		"test",
		createJob()
			.uses("./.github/workflows/test.yml") // String path - no type safety!
			.with({
				test_command: "npm run test:unit",
			})
	);

// ✅ NEW WAY (type-safe, refactoring-friendly)
const newWayWorkflow = createWorkflow()
	.name("New Way - Type-Safe References")
	.on("push")
	.job(
		"test",
		createJob()
			.uses(simpleTestWorkflow) // 🎉 Direct workflow reference!
			.with({
				test_command: "npm run test:unit",
			})
	);

// ============================================================================
// STEP 3: Benefits in action
// ============================================================================

console.log("🚀 Basic Enhanced Workflow Reference Example\n");

console.log('Before: .uses("./.github/workflows/test.yml")');
console.log("After:  .uses(simpleTestWorkflow)\n");

console.log("✅ Benefits:");
console.log("   • Type safety at compile time");
console.log("   • IDE IntelliSense support");
console.log("   • Safe refactoring");
console.log("   • Clear dependencies\n");

// Both approaches generate valid workflows
export { simpleTestWorkflow, oldWayWorkflow, newWayWorkflow };
