#!/usr/bin/env tsx
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareYaml, type RoundtripValidationResult, reverse, synth } from "../packages/core/src/index.ts";

interface RoundtripTest {
	workflow: string;
	result: RoundtripValidationResult;
	error?: string;
}

async function testRoundtrip(workflowPath: string): Promise<RoundtripTest> {
	const tmpDir = join(tmpdir(), `flughafen-roundtrip-${Date.now()}`);
	mkdirSync(tmpDir, { recursive: true });

	try {
		// 1. Read original YAML
		const originalYaml = readFileSync(workflowPath, "utf-8");

		// 2. YAML → TypeScript (reverse - don't write files, just get content)
		const reverseResult = await reverse.workflow(workflowPath, {
			skipLocalActions: true,
			silent: true,
		});

		if (!reverseResult.generatedFiles || reverseResult.generatedFiles.length === 0) {
			const errorMsg = reverseResult.errors?.[0]?.message || "No files generated";
			return {
				workflow: workflowPath,
				result: {
					success: false,
					originalHash: "",
					rebuiltHash: "",
					error: errorMsg,
				},
				error: errorMsg,
			};
		}

		// Check for validation errors
		if (reverseResult.errors && reverseResult.errors.length > 0) {
			const errorMsg = reverseResult.errors[0].message;
			return {
				workflow: workflowPath,
				result: {
					success: false,
					originalHash: "",
					rebuiltHash: "",
					error: errorMsg,
				},
				error: errorMsg,
			};
		}

		// Get the generated TypeScript content
		const tsFile = reverseResult.generatedFiles[0];

		// Write the TS file to tmp directory so synth can process it
		const tsPath = join(tmpDir, "test.ts");
		writeFileSync(tsPath, tsFile.content);

		// 3. TypeScript → YAML (synth)
		const synthResult = await synth({
			file: tsPath,
			output: tmpDir,
			silent: true,
			dryRun: false,
		});

		const rebuiltYaml = synthResult.workflow.content;

		// 4. Compare
		const comparison = compareYaml(originalYaml, rebuiltYaml);

		return {
			workflow: workflowPath,
			result: {
				success: comparison.equivalent,
				originalHash: comparison.hash1,
				rebuiltHash: comparison.hash2,
				diff: comparison.equivalent
					? undefined
					: {
							normalized1: comparison.normalized1 ?? "",
							normalized2: comparison.normalized2 ?? "",
						},
			},
		};
	} catch (error) {
		return {
			workflow: workflowPath,
			result: {
				success: false,
				originalHash: "",
				rebuiltHash: "",
				error: error instanceof Error ? error.message : String(error),
			},
			error: error instanceof Error ? error.message : String(error),
		};
	} finally {
		// Cleanup
		try {
			rmSync(tmpDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	}
}

async function main() {
	console.log("🔄 Testing roundtrip validation (YAML → TS → YAML)\n");

	// Test with a diverse set of workflows
	const testWorkflows = [
		// Simple workflows
		"examples/real-world-examples/typescript/.github/workflows/close-issues.yml",
		"examples/real-world-examples/react/.github/workflows/shared_lint.yml",
		"examples/real-world-examples/vitest/.github/workflows/ci.yml",

		// Medium complexity
		"examples/real-world-examples/next-js/.github/workflows/cancel.yml",
		"examples/real-world-examples/turborepo/.github/workflows/lint.yml",

		// Complex workflows
		"examples/real-world-examples/playwright/.github/workflows/tests_primary.yml",
		"examples/real-world-examples/prisma/.github/workflows/test.yml",
		"examples/real-world-examples/typescript/.github/workflows/nightly.yaml",
	];

	const results: RoundtripTest[] = [];

	for (const workflow of testWorkflows) {
		console.log(`Testing: ${workflow}`);
		const result = await testRoundtrip(workflow);
		results.push(result);

		if (result.result.success) {
			console.log(`  ✅ Roundtrip successful`);
			console.log(`     Hash: ${result.result.originalHash.slice(0, 16)}...`);
		} else {
			console.log(`  ❌ Roundtrip failed`);
			if (result.error) {
				console.log(`     Error: ${result.error}`);
			}
		}
		console.log();
	}

	// Summary
	const successful = results.filter((r) => r.result.success).length;
	const total = results.length;
	console.log(
		`\n📊 Summary: ${successful}/${total} (${((successful / total) * 100).toFixed(1)}%) roundtrips successful\n`
	);

	// Analyze common missing features
	const missingFeatures = new Map<string, number>();
	for (const failure of results.filter((r) => !r.result.success && r.result.diff)) {
		const diff = failure.result.diff!;
		const lines = diff.normalized1.split("\n");

		for (const line of lines) {
			// Detect common missing features
			if (line.includes('"defaults":')) missingFeatures.set("defaults", (missingFeatures.get("defaults") || 0) + 1);
			if (line.includes('"permissions":'))
				missingFeatures.set("permissions", (missingFeatures.get("permissions") || 0) + 1);
			if (line.includes('"if":')) missingFeatures.set("if conditions", (missingFeatures.get("if conditions") || 0) + 1);
			if (line.includes('"concurrency":'))
				missingFeatures.set("concurrency", (missingFeatures.get("concurrency") || 0) + 1);
			if (line.includes('"env":') && !line.includes('"steps"'))
				missingFeatures.set("env (top-level)", (missingFeatures.get("env (top-level)") || 0) + 1);
			if (line.includes('"timeout-minutes":'))
				missingFeatures.set("timeout-minutes", (missingFeatures.get("timeout-minutes") || 0) + 1);
			if (line.includes('"continue-on-error":'))
				missingFeatures.set("continue-on-error", (missingFeatures.get("continue-on-error") || 0) + 1);
		}
	}

	// Show summary of missing features
	if (missingFeatures.size > 0) {
		console.log("\n🔍 Missing Features Summary:");
		console.log("─".repeat(80));
		const sorted = Array.from(missingFeatures.entries()).sort((a, b) => b[1] - a[1]);
		for (const [feature, count] of sorted) {
			console.log(`  ${feature}: ${count} workflow(s) affected`);
		}
		console.log();
	}

	// Show first 3 failure details
	const failures = results.filter((r) => !r.result.success).slice(0, 3);
	if (failures.length > 0) {
		console.log("❌ Sample Failed Roundtrips (first 3):\n");
		for (const failure of failures) {
			console.log(`\n${"=".repeat(80)}`);
			console.log(`Workflow: ${failure.workflow}`);
			console.log(`Error: ${failure.result.error || "Hash mismatch"}`);

			if (failure.result.diff) {
				console.log("\n--- DIFF (first 20 lines) ---");
				showDiff(failure.result.diff.normalized1, failure.result.diff.normalized2, 20);
			}
			console.log(`${"=".repeat(80)}\n`);
		}

		if (results.filter((r) => !r.result.success).length > 3) {
			console.log(`\n... and ${results.filter((r) => !r.result.success).length - 3} more failures\n`);
		}
	}
}

function showDiff(original: string, rebuilt: string, maxDiffs: number = 50) {
	const lines1 = original.split("\n");
	const lines2 = rebuilt.split("\n");
	const maxLines = Math.max(lines1.length, lines2.length);

	let diffCount = 0;
	for (let i = 0; i < maxLines && diffCount < maxDiffs; i++) {
		const line1 = lines1[i] || "";
		const line2 = lines2[i] || "";

		if (line1 !== line2) {
			console.log(`Line ${i + 1}:`);
			console.log(`  - ${line1}`);
			console.log(`  + ${line2}`);
			diffCount++;
		}
	}

	if (diffCount >= maxDiffs) {
		console.log("\n... (truncated, showing first " + maxDiffs + " differences)");
	}
}

main().catch(console.error);
