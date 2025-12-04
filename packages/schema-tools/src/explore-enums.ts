import fs from "node:fs";
import path from "node:path";

interface EnumInfo {
	path: string;
	enum: unknown[];
	type?: string;
	description?: string;
}

function findEnums(obj: unknown, currentPath = "", results: EnumInfo[] = []): EnumInfo[] {
	if (!obj || typeof obj !== "object") return results;

	const record = obj as Record<string, unknown>;

	// Check if this object has an enum property
	if ("enum" in record && Array.isArray(record.enum)) {
		results.push({
			path: currentPath,
			enum: record.enum,
			type: typeof record.type === "string" ? record.type : undefined,
			description: typeof record.description === "string" ? record.description : undefined,
		});
	}

	// Traverse properties
	if ("properties" in record && typeof record.properties === "object" && record.properties !== null) {
		for (const [propKey, propValue] of Object.entries(record.properties)) {
			findEnums(propValue, currentPath ? `${currentPath}.${propKey}` : propKey, results);
		}
	}

	// Traverse definitions
	if ("definitions" in record && typeof record.definitions === "object" && record.definitions !== null) {
		for (const [defKey, defValue] of Object.entries(record.definitions)) {
			findEnums(defValue, `definitions.${defKey}`, results);
		}
	}

	// Traverse items (for arrays)
	if ("items" in obj && obj.items) {
		if (Array.isArray(obj.items)) {
			obj.items.forEach((item: unknown, idx: number) => {
				findEnums(item, `${currentPath}[${idx}]`, results);
			});
		} else {
			findEnums(obj.items, currentPath, results);
		}
	}

	// Traverse anyOf/oneOf/allOf
	for (const key of ["anyOf", "oneOf", "allOf"] as const) {
		if (key in obj) {
			const value = (obj as Record<string, unknown>)[key];
			if (Array.isArray(value)) {
				value.forEach((item: unknown, idx: number) => {
					findEnums(item, `${currentPath}.${key}[${idx}]`, results);
				});
			}
		}
	}

	return results;
}

// Load schemas
const schemaDir = path.join(process.cwd(), "schemas");
const workflowSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "github-workflow.schema.json"), "utf8"));
const actionSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "github-action.schema.json"), "utf8"));

console.log("=== WORKFLOW SCHEMA ENUMS ===\n");
const workflowEnums = findEnums(workflowSchema);
workflowEnums.forEach((e) => {
	console.log(`Path: ${e.path}`);
	console.log(`Values: ${e.enum.join(", ")}`);
	if (e.description) console.log(`Description: ${e.description}`);
	console.log("");
});

console.log(`\n=== ACTION SCHEMA ENUMS ===\n`);
const actionEnums = findEnums(actionSchema);
actionEnums.forEach((e) => {
	console.log(`Path: ${e.path}`);
	console.log(`Values: ${e.enum.join(", ")}`);
	if (e.description) console.log(`Description: ${e.description}`);
	console.log("");
});

console.log(`\n=== SUMMARY ===`);
console.log(`Workflow schema enums: ${workflowEnums.length}`);
console.log(`Action schema enums: ${actionEnums.length}`);
console.log(`Total: ${workflowEnums.length + actionEnums.length}`);
