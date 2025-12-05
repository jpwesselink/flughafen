#!/usr/bin/env tsx
/**
 * Enhanced Workflow Reference System Example
 *
 * This example demonstrates the new type-safe workflow reference system
 * that allows using .uses(otherWorkflow) instead of string paths.
 */

import { createJob, createWorkflow } from "../packages/core/src/index.js";

console.log("🔗 Enhanced Workflow Reference System Example\n");

// ============================================================================
// 1. CREATE REUSABLE WORKFLOWS
// ============================================================================

// Create a reusable test workflow
const testWorkflow = createWorkflow()
	.name("Reusable Test Workflow")
	.on("workflow_call", {
		inputs: {
			environment: {
				description: "Environment to test against",
				type: "string",
				required: true,
			},
			node_version: {
				description: "Node.js version to use",
				type: "string",
				default: "18",
			},
		},
		outputs: {
			test_result: {
				description: "Result of the test run",
				value: "${{ jobs.test.outputs.result }}",
			},
		},
	})
	.job(
		"test",
		createJob()
			.runsOn("ubuntu-latest")
			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4").with({
					"node-version": "${{ inputs.node_version }}",
				})
			)
			.step((step) => step.name("Run Tests").run("npm test -- --env=${{ inputs.environment }}"))
			.outputs({
				result: "${{ steps.test.outcome }}",
			})
	);

// Create a reusable deployment workflow
const deployWorkflow = createWorkflow()
	.name("Reusable Deploy Workflow")
	.on("workflow_call", {
		inputs: {
			environment: {
				description: "Deployment environment",
				type: "string",
				required: true,
			},
			version: {
				description: "Version to deploy",
				type: "string",
				required: true,
			},
		},
		secrets: {
			DEPLOY_TOKEN: {
				description: "Token for deployment",
				required: true,
			},
		},
	})
	.job(
		"deploy",
		createJob()
			.runsOn("ubuntu-latest")
			.environment({ name: "${{ inputs.environment }}" })
			.step((step) =>
				step
					.name("Deploy Application")
					.run('echo "Deploying version ${{ inputs.version }} to ${{ inputs.environment }}"')
					.env({
						DEPLOY_TOKEN: "${{ secrets.DEPLOY_TOKEN }}",
					})
			)
	);

// ============================================================================
// 2. MAIN WORKFLOW USING TYPE-SAFE REFERENCES
// ============================================================================

const mainWorkflow = createWorkflow()
	.name("CI/CD Pipeline with Type-Safe References")
	.on("push", { branches: ["main"] })
	.on("pull_request", { branches: ["main"] })

	// Job 1: Test in staging using type-safe workflow reference
	.job(
		"test-staging",
		createJob()
			.uses(testWorkflow) // 🎉 Type-safe workflow reference!
			.with({
				environment: "staging",
				node_version: "18",
			})
	)

	// Job 2: Test in production using type-safe workflow reference
	.job(
		"test-production",
		createJob()
			.needs("test-staging")
			.uses(testWorkflow) // 🎉 Type-safe workflow reference!
			.with({
				environment: "production",
				node_version: "20",
			})
	)

	// Job 3: Deploy to staging (only on main branch)
	.job(
		"deploy-staging",
		createJob()
			.needs("test-staging")
			.if("github.ref == 'refs/heads/main'")
			.uses(deployWorkflow) // 🎉 Type-safe workflow reference!
			.with({
				environment: "staging",
				version: "${{ github.sha }}",
			})
			.secrets("inherit") // Pass all secrets to the reusable workflow
	)

	// Job 4: Deploy to production (manual approval required)
	.job(
		"deploy-production",
		createJob()
			.needs(["test-production", "deploy-staging"])
			.if("github.ref == 'refs/heads/main'")
			.uses(deployWorkflow) // 🎉 Type-safe workflow reference!
			.with({
				environment: "production",
				version: "${{ github.sha }}",
			})
			.secrets({
				DEPLOY_TOKEN: "${{ secrets.PROD_DEPLOY_TOKEN }}",
			})
	);

// ============================================================================
// 3. COMPARISON: OLD VS NEW APPROACH
// ============================================================================

console.log("📊 Comparison: Old vs New Approach\n");

// OLD APPROACH (string-based)
const oldApproachWorkflow = createWorkflow()
	.name("Old Approach - String References")
	.on("push")
	.job(
		"test",
		createJob()
			.uses("./.github/workflows/test.yml") // ❌ String-based, no type safety
			.with({
				environment: "staging",
			})
	)
	.job(
		"deploy",
		createJob()
			.uses("./.github/workflows/deploy.yml") // ❌ String-based, no type safety
			.with({
				environment: "production",
			})
	);

// NEW APPROACH (type-safe)
const newApproachWorkflow = createWorkflow()
	.name("New Approach - Type-Safe References")
	.on("push")
	.job(
		"test",
		createJob()
			.uses(testWorkflow) // ✅ Type-safe, IDE support, refactoring-friendly
			.with({
				environment: "staging",
				node_version: "18",
			})
	)
	.job(
		"deploy",
		createJob()
			.uses(deployWorkflow) // ✅ Type-safe, IDE support, refactoring-friendly
			.with({
				environment: "production",
				version: "1.0.0",
			})
	);

// ============================================================================
// 4. BENEFITS DEMONSTRATION
// ============================================================================

console.log("✨ Benefits of Enhanced Workflow References:\n");

console.log("1. 🔒 Type Safety");
console.log("   - Compile-time validation of workflow references");
console.log("   - Prevents broken references due to typos\n");

console.log("2. 🧠 IDE Support");
console.log("   - IntelliSense for workflow methods and properties");
console.log("   - Go-to-definition for referenced workflows\n");

console.log("3. 🔄 Refactoring");
console.log("   - Rename workflows safely across entire codebase");
console.log("   - Find all usages of a workflow easily\n");

console.log("4. 📝 Better Documentation");
console.log("   - Clear dependency relationships between workflows");
console.log("   - Self-documenting workflow architecture\n");

console.log("5. 🔙 Backward Compatibility");
console.log("   - String-based paths still work for external workflows");
console.log("   - Gradual migration path for existing codebases\n");

// ============================================================================
// 5. MIXED USAGE EXAMPLE
// ============================================================================

const mixedUsageWorkflow = createWorkflow()
	.name("Mixed Usage - Local and External References")
	.on("workflow_dispatch")

	// Use local type-safe reference
	.job(
		"test-local",
		createJob()
			.uses(testWorkflow) // ✅ Type-safe local workflow
			.with({
				environment: "test",
				node_version: "18",
			})
	)

	// Use external string reference (still supported)
	.job(
		"external-action",
		createJob()
			.runsOn("ubuntu-latest")
			.step(
				(step) => step.name("Use External Reusable Workflow").uses("owner/repo/.github/workflows/shared.yml@v1") // ✅ External workflow
			)
	)

	// Use another local type-safe reference
	.job(
		"deploy-local",
		createJob()
			.needs(["test-local"])
			.uses(deployWorkflow) // ✅ Type-safe local workflow
			.with({
				environment: "staging",
				version: "latest",
			})
			.secrets("inherit")
	);

console.log("🎯 Example demonstrates:");
console.log("   • Type-safe workflow references with .uses(workflowObject)");
console.log("   • Reusable workflows with inputs, outputs, and secrets");
console.log("   • Mixed usage of local and external references");
console.log("   • Backward compatibility with string-based paths");
console.log("   • Complex CI/CD pipeline with dependencies");

console.log("\n🏁 Enhanced workflow reference system successfully implemented!");

// Example of the generated workflow path
console.log("\n📁 Generated Paths:");
console.log(`   Test Workflow: ${testWorkflow.getWorkflowPath()}`);
console.log(`   Deploy Workflow: ${deployWorkflow.getWorkflowPath()}`);

export { testWorkflow, deployWorkflow, mainWorkflow, oldApproachWorkflow, newApproachWorkflow, mixedUsageWorkflow };
