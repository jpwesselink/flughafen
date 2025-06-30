import chalk from "chalk";
import { generateTypes as coreGenerateTypes, type GenerateTypesOptions } from "flughafen";

/**
 * CLI wrapper for the generateTypes operation
 */
export async function generateTypes(options: GenerateTypesOptions): Promise<void> {
	const { silent = false, verbose = false, workflowDir, output, files } = options;

	try {
		if (!silent) {
			console.log(chalk.blue("🔍 Generating types for GitHub Actions..."));
		}

		if (verbose) {
			if (files && files.length > 0) {
				console.log(chalk.gray(`📄 Processing files: ${files.join(", ")}`));
			} else {
				console.log(chalk.gray(`📁 Scanning directory: ${workflowDir || process.cwd()}`));
			}
			console.log(chalk.gray(`📄 Output file: ${output || "./flughafen-actions.d.ts"}`));
		}

		const result = await coreGenerateTypes(options);

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
		if (!silent) {
			console.error(chalk.red("❌ Type generation failed:"), error instanceof Error ? error.message : String(error));
		}
		throw error;
	}
}
