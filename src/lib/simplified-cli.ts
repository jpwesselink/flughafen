/**
 * Updated CLI using the new synth() method
 * This shows how much cleaner the CLI becomes
 */

import chalk from "chalk";
import { resolve } from "path";

interface SimplifiedCLIOptions {
	file: string;
	dir?: string;
	silent?: boolean;
}

/**
 * Extract workflow from module exports
 */
function extractWorkflowFromModule(workflowModule: any): any {
	// Find workflow in module exports
	if (
		workflowModule.default &&
		typeof workflowModule.default.synth === "function"
	) {
		return workflowModule.default;
	}

	if (
		workflowModule.workflow &&
		typeof workflowModule.workflow.synth === "function"
	) {
		return workflowModule.workflow;
	}

	// Look for any exported WorkflowBuilder
	for (const key of Object.keys(workflowModule)) {
		const exported = workflowModule[key];
		if (exported && typeof exported.synth === "function") {
			return exported;
		}

		// Handle function exports
		if (typeof exported === "function") {
			try {
				const result = exported();
				if (result && typeof result.synth === "function") {
					return result;
				}
			} catch {
				// Ignore execution errors
			}
		}
	}

	throw new Error(
		"No WorkflowBuilder with synth() method found in module exports",
	);
}

/**
 * Write workflow files to filesystem
 */
async function writeWorkflowFiles(
	result: any,
	baseDir: string = ".",
): Promise<void> {
	const fs = await import("fs/promises");
	const path = await import("path");

	// Write workflow file
	const workflowPath = path.join(baseDir, result.workflow.filename);
	await fs.mkdir(path.dirname(workflowPath), { recursive: true });
	await fs.writeFile(workflowPath, result.workflow.content, "utf8");

	// Write action files
	for (const [actionPath, actionContent] of Object.entries(result.actions)) {
		const fullActionPath = path.join(baseDir, actionPath as string);
		await fs.mkdir(path.dirname(fullActionPath), { recursive: true });
		await fs.writeFile(fullActionPath, actionContent as string, "utf8");
	}
}

/**
 * Simplified workflow generation using the new synth() method
 */
export async function generateWorkflowSimplified(
	options: SimplifiedCLIOptions,
): Promise<void> {
	try {
		if (!options.silent) {
			process.stdout.write(chalk.blue("⚡ Processing workflow... "));
		}

		// Import the workflow file
		const absolutePath = resolve(options.file);
		const workflowModule = await import(`file://${absolutePath}`);

		// Extract workflow from module
		const workflow = extractWorkflowFromModule(workflowModule);

		// Process using the new synth() method
		const result = workflow.synth({
			workflowsDir: options.dir || ".github/workflows",
			actionsDir: options.dir ? `${options.dir}/actions` : ".github/actions",
		});

		if (options.dir) {
			// Write files to directory
			await writeWorkflowFiles(result, ".");

			if (!options.silent) {
				console.log(chalk.green("✅ Generated files:"));
				console.log(chalk.cyan(`  📄 ${result.workflow.filename}`));

				for (const actionPath of Object.keys(result.actions)) {
					console.log(chalk.cyan(`  📦 ${actionPath}`));
				}

				const totalFiles = 1 + Object.keys(result.actions).length;
				console.log(
					chalk.blue(`\n🎉 Generation complete! (${totalFiles} files)`),
				);
			}
		} else {
			// Console output mode
			if (!options.silent) {
				console.log(chalk.green("✅ Generated workflow:"));
				console.log(chalk.gray("─".repeat(50)));
			}

			// Show local actions first
			for (const [actionPath, actionContent] of Object.entries(
				result.actions,
			)) {
				if (!options.silent) {
					console.log(chalk.blue(`\n📦 ${actionPath}`));
					console.log(chalk.gray("─".repeat(30)));
				}
				console.log(actionContent);
			}

			if (!options.silent) {
				console.log(chalk.blue(`\n📄 ${result.workflow.filename}`));
				console.log(chalk.gray("─".repeat(50)));
			}
			console.log(result.workflow.content);

			if (!options.silent) {
				console.log(chalk.gray("─".repeat(50)));
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (!options.silent) {
			console.log(chalk.red(`❌ Error: ${errorMessage}`));
		} else {
			console.error(chalk.red(`Error: ${errorMessage}`));
		}
		throw error;
	}
}

// Example usage comparison
export function showCLIComparison() {
	console.log("=== CLI Comparison ===\n");

	console.log("OLD CLI (complex):");
	console.log("- executeWorkflowFile()");
	console.log("- Extract workflow");
	console.log("- Extract local actions via multiple methods");
	console.log("- Generate output paths");
	console.log("- Write files with complex logic");
	console.log("- Handle errors");

	console.log("\nNEW CLI (simple):");
	console.log("- Import workflow module");
	console.log("- extractWorkflowFromModule()");
	console.log("- workflow.synth()");
	console.log("- writeWorkflowFiles()");
	console.log("- Done! ✨");

	console.log("\nBenefits:");
	console.log("✅ Direct method calls");
	console.log("✅ No external processor functions");
	console.log("✅ Easier testing");
	console.log("✅ Cleaner CLI code");
	console.log("✅ Consistent file structure");
}

export default generateWorkflowSimplified;
