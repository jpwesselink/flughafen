#!/usr/bin/env tsx
/**
 * Debug script to show roundtrip intermediate files
 * Outputs to .roundtrip-output/ for inspection
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { compareYaml, reverse, synth } from "../packages/core/src/index.ts";

const OUTPUT_DIR = ".roundtrip-output";

async function debugRoundtrip(workflowPath: string) {
	const workflowName = basename(workflowPath, ".yml").replace(".yaml", "");
	const projectName = basename(dirname(dirname(dirname(workflowPath))));
	const outputDir = join(OUTPUT_DIR, `${projectName}--${workflowName}`);

	// Use temp dir for synth (so absolute path triggers correct behavior)
	const tmpDir = join(tmpdir(), `flughafen-debug-${Date.now()}`);
	mkdirSync(tmpDir, { recursive: true });
	mkdirSync(outputDir, { recursive: true });

	console.log(`\n${"=".repeat(60)}`);
	console.log(`Roundtrip: ${workflowPath}`);
	console.log(`Output: ${outputDir}/`);
	console.log("=".repeat(60));

	// 1. Copy original YAML
	const originalYaml = readFileSync(workflowPath, "utf-8");
	writeFileSync(join(outputDir, "1-original.yml"), originalYaml);
	console.log("\n1. Original YAML saved to 1-original.yml");

	// 2. Reverse: YAML → TypeScript
	const reverseResult = await reverse.workflow(workflowPath, {
		skipLocalActions: true,
		silent: true,
	});

	if (!reverseResult.generatedFiles?.length) {
		console.error("   ERROR: No TypeScript generated");
		console.error("   ", reverseResult.errors?.[0]?.message);
		return;
	}

	const tsContent = reverseResult.generatedFiles[0].content;
	writeFileSync(join(outputDir, "2-generated.ts"), tsContent);
	writeFileSync(join(tmpDir, "workflow.ts"), tsContent); // For synth
	console.log("2. Generated TypeScript saved to 2-generated.ts");

	// 3. Synth: TypeScript → YAML (use temp dir so paths are absolute)
	const synthResult = await synth({
		file: join(tmpDir, "workflow.ts"),
		output: tmpDir,
		silent: true,
	});

	const rebuiltYaml = synthResult.workflow.content;
	writeFileSync(join(outputDir, "3-rebuilt.yml"), rebuiltYaml);
	console.log("3. Rebuilt YAML saved to 3-rebuilt.yml");

	// 4. Compare
	const comparison = compareYaml(originalYaml, rebuiltYaml);

	writeFileSync(join(outputDir, "4-original-normalized.json"), comparison.normalized1 || "MATCH");
	writeFileSync(join(outputDir, "4-rebuilt-normalized.json"), comparison.normalized2 || "MATCH");

	console.log("\n4. Comparison:");
	console.log(`   Original hash: ${comparison.hash1.slice(0, 16)}...`);
	console.log(`   Rebuilt hash:  ${comparison.hash2.slice(0, 16)}...`);
	console.log(`   Match: ${comparison.equivalent ? "✅ YES" : "❌ NO"}`);

	if (!comparison.equivalent) {
		console.log("\n   Normalized JSONs saved for diff:");
		console.log("   4-original-normalized.json");
		console.log("   4-rebuilt-normalized.json");
	}

	console.log(`\n📁 All files in: ${outputDir}/`);
}

// Run for all test workflows or specific one from args
const testWorkflows = [
	"examples/real-world-examples/typescript/.github/workflows/close-issues.yml",
	"examples/real-world-examples/react/.github/workflows/shared_lint.yml",
	"examples/real-world-examples/vitest/.github/workflows/ci.yml",
	"examples/real-world-examples/next-js/.github/workflows/cancel.yml",
	"examples/real-world-examples/turborepo/.github/workflows/lint.yml",
	"examples/real-world-examples/playwright/.github/workflows/tests_primary.yml",
	"examples/real-world-examples/prisma/.github/workflows/test.yml",
	"examples/real-world-examples/typescript/.github/workflows/nightly.yaml",
];

const targetWorkflow = process.argv[2];

if (targetWorkflow) {
	await debugRoundtrip(targetWorkflow);
} else {
	for (const wf of testWorkflows) {
		await debugRoundtrip(wf);
	}
}
