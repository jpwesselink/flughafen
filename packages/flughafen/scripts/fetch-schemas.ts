#!/usr/bin/env node

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SchemaConfig {
	name: string;
	url: string;
	output: string;
}

/**
 * Fetch a schema from a URL and save it to a file
 */
async function fetchSchema(url: string, outputPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`📥 Fetching schema from: ${url}`);

		https
			.get(url, (response) => {
				if (response.statusCode !== 200) {
					reject(new Error(`Failed to fetch schema: HTTP ${response.statusCode}`));
					return;
				}

				let data = "";
				response.on("data", (chunk) => {
					data += chunk;
				});

				response.on("end", () => {
					try {
						// Parse and re-stringify to format the JSON nicely
						const schema = JSON.parse(data);
						const formattedJson = JSON.stringify(schema, null, "\t");

						// Ensure the output directory exists
						const outputDir = path.dirname(outputPath);
						if (!fs.existsSync(outputDir)) {
							fs.mkdirSync(outputDir, { recursive: true });
						}

						// Write the schema to file
						fs.writeFileSync(outputPath, formattedJson, "utf8");

						const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
						console.log(`✅ Saved to: ${outputPath} (${fileSize} KB)`);
						resolve();
					} catch (error) {
						reject(new Error(`Failed to parse or save schema: ${(error as Error).message}`));
					}
				});
			})
			.on("error", (error) => {
				reject(new Error(`Request failed: ${error.message}`));
			});
	});
}

/**
 * Main function to fetch all schemas
 */
async function fetchAllSchemas(): Promise<void> {
	try {
		console.log("🚀 Fetching GitHub schemas from SchemaStore...\n");

		const schemas: SchemaConfig[] = [
			{
				name: "GitHub Workflow",
				url: "https://raw.githubusercontent.com/SchemaStore/schemastore/refs/heads/master/src/schemas/json/github-workflow.json",
				output: path.join(__dirname, "..", "schemas", "github-workflow.schema.json"),
			},
			{
				name: "GitHub Action",
				url: "https://raw.githubusercontent.com/SchemaStore/schemastore/refs/heads/master/src/schemas/json/github-action.json",
				output: path.join(__dirname, "..", "schemas", "github-action.schema.json"),
			},
		];

		for (const schema of schemas) {
			console.log(`📋 Processing ${schema.name} schema...`);
			await fetchSchema(schema.url, schema.output);
			console.log("");
		}

		console.log("🎉 All schemas fetched successfully!");
		console.log("\n📝 Next steps:");
		console.log("  1. Review the updated schemas for any breaking changes");
		console.log("  2. Run `npm run generate-types` to update TypeScript definitions");
		console.log("  3. Test your builds to ensure compatibility");
	} catch (error) {
		console.error("❌ Error fetching schemas:", (error as Error).message);
		process.exit(1);
	}
}

// Run the script - ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
	fetchAllSchemas();
}

export { fetchSchema, fetchAllSchemas };
