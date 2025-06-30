import chalk from "chalk";
import { SchemaManager } from "../../schema";

/**
 * Options for the generate types command
 */
export interface GenerateTypesOptions {
	workflowDir?: string;
	output?: string;
	githubToken?: string;
	includeJsdoc?: boolean;
	silent?: boolean;
	verbose?: boolean;
	files?: string[]; // Named positional arguments
}

/**
 * Generate types command: scan workflows and generate TypeScript interfaces
 */
export async function generateTypesCommand(options: GenerateTypesOptions): Promise<void> {
	try {
		const {
			workflowDir,
			output,
			githubToken,
			includeJsdoc: includeJSDoc = true,
			silent = false,
			verbose = false,
			files = [], // Use the named positional argument
		} = options;

		if (!silent) {
			console.log(chalk.blue("🔍 Generating types for GitHub Actions..."));
		}

		const manager = new SchemaManager({
			workflowDir,
			typesFilePath: output,
			githubToken,
			includeJSDoc,
		});

		// If specific files are provided, use them; otherwise scan the directory
		const targetFiles = files.length > 0 ? files : undefined;

		if (verbose) {
			if (targetFiles) {
				console.log(chalk.gray(`📄 Processing files: ${targetFiles.join(", ")}`));
			} else {
				console.log(chalk.gray(`📁 Scanning directory: ${workflowDir || process.cwd()}`));
			}
			console.log(chalk.gray(`📄 Output file: ${output || "./flughafen-actions.d.ts"}`));
		}

		// Generate types from workflow files
		const result = targetFiles
			? await manager.generateTypesFromSpecificFiles(targetFiles)
			: await manager.generateTypesFromWorkflowFiles();

		if (!silent) {
			console.log(chalk.green("✅ Type generation completed!\n"));
			console.log(`📊 Results:`);
			console.log(`   - Actions processed: ${result.actionsProcessed}`);
			console.log(`   - Schemas fetched: ${result.schemasFetched}`);
			console.log(`   - Interfaces generated: ${result.interfacesGenerated}`);
			console.log(`   - Types file: ${result.typesFilePath}`);

			if (result.failedActions.length > 0) {
				console.log(chalk.yellow(`   - Failed actions: ${result.failedActions.join(", ")}`));
			}

			if (verbose) {
				console.log("\n📋 Generated Interfaces:");
				result.interfaces.forEach((iface) => {
					console.log(`   - ${iface.actionName} -> ${iface.interfaceName}`);
				});
			}

			console.log(chalk.green("\n🎉 Types are now available for type-safe .with() calls!"));
			console.log(chalk.gray("No imports needed - TypeScript will automatically discover the types."));
		}
	} catch (error) {
		if (!options.silent) {
			console.error(chalk.red("❌ Type generation failed:"), error instanceof Error ? error.message : String(error));
		}
		throw error;
	}
}
