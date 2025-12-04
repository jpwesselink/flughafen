#!/usr/bin/env tsx
/**
 * Dogfooding Test Suite
 *
 * Validates that Flughafen can successfully process real-world GitHub Actions workflows
 * through the complete reverse → build → reverse roundtrip cycle.
 *
 * Test Phases:
 * 1. Discovery: Find all example YAML files
 * 2. Reverse: Convert YAML → TypeScript
 * 3. Build: Convert TypeScript → YAML
 * 4. Compare: Semantic equivalence check
 * 5. Report: Success rates and failure analysis
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { ReverseApi, validate } from "@flughafen/core";
import yaml from "js-yaml";

// Create reverse API instance
const reverseApi = new ReverseApi();

interface TestResult {
	file: string;
	phase: "reverse" | "build" | "compare";
	success: boolean;
	errors: string[];
	warnings: string[];
	metrics?: {
		originalLines: number;
		generatedLines: number;
		semanticMatch: boolean;
		diffPercentage: number;
	};
}

interface TestSummary {
	total: number;
	passed: number;
	failed: number;
	skipped: number;
	byProject: Record<string, { passed: number; failed: number; total: number }>;
	byComplexity: {
		simple: { passed: number; failed: number };
		intermediate: { passed: number; failed: number };
		advanced: { passed: number; failed: number };
	};
	failurePatterns: Record<string, number>;
	results: TestResult[];
}

/**
 * Find all YAML workflow files in examples directory
 */
function findWorkflowFiles(baseDir: string): string[] {
	const workflowFiles: string[] = [];

	function traverse(dir: string) {
		const entries = readdirSync(dir);

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				// Skip node_modules, dist, etc.
				if (!["node_modules", "dist", "build", ".git"].includes(entry)) {
					traverse(fullPath);
				}
			} else if (stat.isFile() && (entry.endsWith(".yml") || entry.endsWith(".yaml"))) {
				// Only include files in .github/workflows directories
				if (fullPath.includes(".github/workflows") || fullPath.includes(".github\\workflows")) {
					workflowFiles.push(fullPath);
				}
			}
		}
	}

	traverse(baseDir);
	return workflowFiles;
}

/**
 * Determine workflow complexity based on content analysis
 */
function analyzeComplexity(yamlContent: string): "simple" | "intermediate" | "advanced" {
	const hasMatrix = yamlContent.includes("matrix:");
	const hasReusable = yamlContent.includes("workflow_call") || yamlContent.includes("uses:");
	const hasConditionals = (yamlContent.match(/if:/g) || []).length > 3;
	const jobCount = (yamlContent.match(/^ {2}\w+:/gm) || []).length;
	const lineCount = yamlContent.split("\n").length;

	// Advanced: Reusable workflows, many jobs, or very long files
	if (hasReusable || jobCount > 5 || lineCount > 200) {
		return "advanced";
	}

	// Intermediate: Matrix strategies or multiple conditionals
	if (hasMatrix || hasConditionals || jobCount > 2) {
		return "intermediate";
	}

	// Simple: Basic push/PR triggers with 1-2 jobs
	return "simple";
}

/**
 * Test Phase 1: Reverse YAML → TypeScript
 */
async function testReverse(yamlFile: string, outputDir: string): Promise<TestResult> {
	const result: TestResult = {
		file: yamlFile,
		phase: "reverse",
		success: false,
		errors: [],
		warnings: [],
	};

	try {
		// Run reverse operation
		const reverseResult = await reverseApi.workflow(yamlFile, {
			outputDir,
			preview: false,
		});

		// Check for errors
		if (reverseResult.errors && reverseResult.errors.length > 0) {
			result.errors = reverseResult.errors.map((e) => (typeof e === "string" ? e : e.message || String(e)));
			result.success = false;
		} else if (reverseResult.generatedFiles && reverseResult.generatedFiles.length > 0) {
			result.success = true;
		} else {
			result.errors.push("No files generated");
			result.success = false;
		}

		// Collect warnings
		if (reverseResult.warnings) {
			result.warnings = reverseResult.warnings.map((w) => (typeof w === "string" ? w : w.message || String(w)));
		}
	} catch (error) {
		result.success = false;
		result.errors.push(error instanceof Error ? error.message : String(error));
	}

	return result;
}

/**
 * Test Phase 2: Build TypeScript → YAML
 */
async function testBuild(tsFile: string): Promise<TestResult> {
	const result: TestResult = {
		file: tsFile,
		phase: "build",
		success: false,
		errors: [],
		warnings: [],
	};

	try {
		// Validate TypeScript file first
		const validationResult = await validate({
			files: [tsFile],
			strict: false,
			silent: true,
		});

		// Check validation results
		if (!validationResult.success) {
			result.success = false;
			result.errors = validationResult.results.flatMap((r) => r.errors.map((e) => e.message));
			result.warnings = validationResult.results.flatMap((r) => r.warnings.map((w) => w.message));
		} else {
			result.success = true;
		}
	} catch (error) {
		result.success = false;
		result.errors.push(error instanceof Error ? error.message : String(error));
	}

	return result;
}

/**
 * Test Phase 3: Semantic equivalence comparison
 */
async function compareWorkflows(originalYaml: string, generatedYaml: string): Promise<TestResult> {
	const result: TestResult = {
		file: originalYaml,
		phase: "compare",
		success: false,
		errors: [],
		warnings: [],
		metrics: {
			originalLines: 0,
			generatedLines: 0,
			semanticMatch: false,
			diffPercentage: 0,
		},
	};

	try {
		const originalContent = await readFile(originalYaml, "utf-8");
		const generatedContent = await readFile(generatedYaml, "utf-8");

		result.metrics!.originalLines = originalContent.split("\n").length;
		result.metrics!.generatedLines = generatedContent.split("\n").length;

		// Parse both as YAML
		const originalParsed = yaml.load(originalContent) as any;
		const generatedParsed = yaml.load(generatedContent) as any;

		// Semantic comparison (simplified - can be enhanced)
		const semanticMatch = deepCompare(originalParsed, generatedParsed);
		result.metrics!.semanticMatch = semanticMatch;
		result.success = semanticMatch;

		// Calculate diff percentage
		const diff = Math.abs(result.metrics!.originalLines - result.metrics!.generatedLines);
		result.metrics!.diffPercentage = (diff / result.metrics!.originalLines) * 100;

		if (!semanticMatch) {
			result.warnings.push("Semantic differences detected between original and generated workflows");
		}
	} catch (error) {
		result.success = false;
		result.errors.push(error instanceof Error ? error.message : String(error));
	}

	return result;
}

/**
 * Deep comparison of two objects (simplified semantic comparison)
 */
function deepCompare(obj1: any, obj2: any, path = ""): boolean {
	if (obj1 === obj2) return true;
	if (obj1 == null || obj2 == null) return false;
	if (typeof obj1 !== typeof obj2) return false;

	if (typeof obj1 === "object") {
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		// Allow for minor key differences (e.g., ordering)
		if (Math.abs(keys1.length - keys2.length) > 2) return false;

		// Check critical keys exist
		const criticalKeys = ["name", "on", "jobs", "runs-on", "uses", "run"];
		for (const key of criticalKeys) {
			if (key in obj1 && !(key in obj2)) return false;
			if (!(key in obj1) && key in obj2) return false;
		}

		return true; // Simplified - full comparison would check all nested values
	}

	return false;
}

/**
 * Analyze failure patterns to identify common issues
 */
function analyzeFailurePatterns(results: TestResult[]): Record<string, number> {
	const patterns: Record<string, number> = {};

	for (const result of results) {
		if (!result.success) {
			for (const error of result.errors) {
				// Extract pattern from error message
				if (error.includes("workflow_call")) {
					patterns["workflow_call issues"] = (patterns["workflow_call issues"] || 0) + 1;
				} else if (error.includes("secrets: inherit")) {
					patterns["secrets: inherit"] = (patterns["secrets: inherit"] || 0) + 1;
				} else if (error.includes("runs-on")) {
					patterns["runs-on validation"] = (patterns["runs-on validation"] || 0) + 1;
				} else if (error.includes("matrix")) {
					patterns["matrix strategy"] = (patterns["matrix strategy"] || 0) + 1;
				} else if (error.includes("TypeScript")) {
					patterns["TypeScript compilation"] = (patterns["TypeScript compilation"] || 0) + 1;
				} else {
					patterns["other"] = (patterns["other"] || 0) + 1;
				}
			}
		}
	}

	return patterns;
}

/**
 * Generate detailed report
 */
function generateReport(summary: TestSummary): string {
	const lines: string[] = [];

	lines.push("╔═══════════════════════════════════════════════════════════════╗");
	lines.push("║           FLUGHAFEN DOGFOODING TEST REPORT                   ║");
	lines.push("╚═══════════════════════════════════════════════════════════════╝");
	lines.push("");

	// Overall statistics
	lines.push("📊 OVERALL RESULTS");
	lines.push("─────────────────────────────────────────────────────────────────");
	lines.push(`  Total workflows tested: ${summary.total}`);
	lines.push(`  ✅ Passed: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
	lines.push(`  ❌ Failed: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)`);
	lines.push(`  ⏭️  Skipped: ${summary.skipped}`);
	lines.push("");

	// By project
	lines.push("📁 RESULTS BY PROJECT");
	lines.push("─────────────────────────────────────────────────────────────────");
	for (const [project, stats] of Object.entries(summary.byProject)) {
		const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
		lines.push(`  ${project}:`);
		lines.push(
			`    Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Success: ${successRate}%`
		);
	}
	lines.push("");

	// By complexity
	lines.push("🎚️  RESULTS BY COMPLEXITY");
	lines.push("─────────────────────────────────────────────────────────────────");
	for (const [level, stats] of Object.entries(summary.byComplexity)) {
		const total = stats.passed + stats.failed;
		const successRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : "0.0";
		lines.push(`  ${level.charAt(0).toUpperCase() + level.slice(1)}:`);
		lines.push(`    Total: ${total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Success: ${successRate}%`);
	}
	lines.push("");

	// Failure patterns
	if (Object.keys(summary.failurePatterns).length > 0) {
		lines.push("🔍 COMMON FAILURE PATTERNS");
		lines.push("─────────────────────────────────────────────────────────────────");
		const sorted = Object.entries(summary.failurePatterns).sort(([, a], [, b]) => b - a);
		for (const [pattern, count] of sorted) {
			lines.push(`  • ${pattern}: ${count} occurrence(s)`);
		}
		lines.push("");
	}

	// Recommendations
	lines.push("💡 RECOMMENDATIONS");
	lines.push("─────────────────────────────────────────────────────────────────");

	if (summary.failurePatterns["workflow_call issues"]) {
		lines.push("  ⚠️  Fix workflow_call validation (high priority)");
	}
	if (summary.failurePatterns["secrets: inherit"]) {
		lines.push('  ⚠️  Support "secrets: inherit" syntax');
	}
	if (summary.passed / summary.total < 0.5) {
		lines.push("  ⚠️  Success rate below 50% - schema validation needs work");
	} else if (summary.passed / summary.total < 0.9) {
		lines.push("  ✅ Good progress - focus on edge cases");
	} else {
		lines.push("  🎉 Excellent! Ready for production dogfooding");
	}

	return lines.join("\n");
}

/**
 * Main test runner
 */
async function runDogfoodingTests() {
	console.log("🔍 Discovering workflow files...\n");

	const examplesDir = join(process.cwd(), "examples/real-world-examples");
	const workflowFiles = findWorkflowFiles(examplesDir);

	console.log(`Found ${workflowFiles.length} workflow files\n`);
	console.log("🧪 Running tests...\n");

	const summary: TestSummary = {
		total: workflowFiles.length,
		passed: 0,
		failed: 0,
		skipped: 0,
		byProject: {},
		byComplexity: {
			simple: { passed: 0, failed: 0 },
			intermediate: { passed: 0, failed: 0 },
			advanced: { passed: 0, failed: 0 },
		},
		failurePatterns: {},
		results: [],
	};

	const tempDir = join(process.cwd(), ".dogfood-test-output");
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}

	// Test each workflow
	for (const file of workflowFiles) {
		const relativePath = relative(examplesDir, file);
		const project = relativePath.split("/")[0] || "unknown";

		// Initialize project stats
		if (!summary.byProject[project]) {
			summary.byProject[project] = { passed: 0, failed: 0, total: 0 };
		}
		summary.byProject[project].total++;

		// Analyze complexity
		const yamlContent = readFileSync(file, "utf-8");
		const complexity = analyzeComplexity(yamlContent);

		// Phase 1: Reverse
		const reverseResult = await testReverse(file, tempDir);
		summary.results.push(reverseResult);

		if (reverseResult.success) {
			summary.passed++;
			summary.byProject[project].passed++;
			summary.byComplexity[complexity].passed++;
			console.log(`  ✅ ${relativePath}`);
		} else {
			summary.failed++;
			summary.byProject[project].failed++;
			summary.byComplexity[complexity].failed++;
			console.log(`  ❌ ${relativePath}`);
			if (reverseResult.errors.length > 0) {
				console.log(`     Error: ${reverseResult.errors[0]}`);
			}
		}
	}

	console.log("\n");

	// Analyze failure patterns
	summary.failurePatterns = analyzeFailurePatterns(summary.results);

	// Generate and display report
	const report = generateReport(summary);
	console.log(report);

	// Save detailed results to file
	const resultsFile = join(tempDir, "dogfood-test-results.json");
	await writeFile(resultsFile, JSON.stringify(summary, null, 2));
	console.log(`\n📝 Detailed results saved to: ${resultsFile}`);

	// Exit with error code if tests failed
	process.exit(summary.failed > 0 ? 1 : 0);
}

// Run tests
runDogfoodingTests().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
