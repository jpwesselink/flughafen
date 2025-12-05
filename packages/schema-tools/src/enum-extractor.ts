import type { JSONSchema4 } from "json-schema";

export interface EnumDefinition {
	/** Original JSON path in schema */
	path: string;
	/** TypeScript-friendly name for the type */
	typeName: string;
	/** Constant name for the array of all values */
	constantName: string;
	/** Enum values */
	values: unknown[];
	/** Optional description from schema */
	description?: string;
	/** Schema this came from */
	source: "workflow" | "action";
}

/**
 * Convert a string to PascalCase, handling both kebab-case and camelCase
 * Examples:
 * - "permissions-level" -> "PermissionsLevel"
 * - "runs-javascript" -> "RunsJavascript"
 * - "runsJavascript" -> "RunsJavascript"
 * - "shell" -> "Shell"
 */
function toPascalCase(str: string): string {
	// First split by hyphens (kebab-case)
	const parts = str.split("-");

	return parts
		.map((part) => {
			// For each part, handle camelCase by inserting spaces before capitals
			const withSpaces = part.replace(/([a-z])([A-Z])/g, "$1 $2");
			// Split on spaces and capitalize each word
			return withSpaces
				.split(" ")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join("");
		})
		.join("");
}

/**
 * Convert a JSON schema path to a TypeScript-friendly type name
 * Examples:
 * - "definitions.shell" -> "ShellType"
 * - "definitions.permissions-level" -> "PermissionsLevelType"
 * - "definitions.runs-javascript.using" -> "RunsJavascriptUsing"
 * - "on.oneOf[2].issues.types" -> "IssuesEventType"
 * - "branding.color" -> "BrandingColor"
 */
function pathToTypeName(path: string): string {
	// Remove array indices and oneOf/anyOf/allOf markers
	const cleaned = path
		.replace(/\.oneOf\[\d+\]/g, "")
		.replace(/\.anyOf\[\d+\]/g, "")
		.replace(/\.allOf\[\d+\]/g, "")
		.replace(/\[\d+\]/g, "");

	// Handle branding.{property} pattern -> Branding{Property}
	if (cleaned.startsWith("branding.")) {
		const property = cleaned.replace("branding.", "");
		return `Branding${property.charAt(0).toUpperCase() + property.slice(1)}`;
	}

	// Handle generic definitions.{type} pattern -> {Type}Type
	// Only for single-level definitions (e.g., definitions.shell, not definitions.shell.anyOf)
	const afterDefinitions = cleaned.replace("definitions.", "");
	if (cleaned.startsWith("definitions.") && !afterDefinitions.includes(".")) {
		return `${toPascalCase(afterDefinitions)}Type`;
	}

	// Handle multi-level definitions paths (e.g., definitions.runs-javascript.using)
	if (cleaned.startsWith("definitions.")) {
		const parts = cleaned.replace("definitions.", "").split(".");
		return parts.map(toPascalCase).join("");
	}

	// Handle event types (on.*.types)
	if (cleaned.startsWith("on.") && cleaned.endsWith(".types")) {
		const eventName = cleaned.split(".")[1];
		const pascalCase = eventName
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join("");
		return `${pascalCase}EventType`;
	}

	// Fallback: convert path to PascalCase
	return cleaned
		.split(".")
		.filter((part) => part !== "definitions" && part !== "properties")
		.map((word) =>
			word
				.split(/[-_]/)
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join("")
		)
		.join("");
}

/**
 * Recursively find all enum definitions in a JSON schema
 */
export function extractEnums(
	schema: JSONSchema4,
	source: "workflow" | "action",
	currentPath = "",
	results: EnumDefinition[] = []
): EnumDefinition[] {
	if (!schema || typeof schema !== "object") return results;

	// Check if this object has an enum property
	if (schema.enum && Array.isArray(schema.enum)) {
		const typeName = pathToTypeName(currentPath);
		const constantName = `ALL_${typeName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}S`;

		results.push({
			path: currentPath,
			typeName,
			constantName,
			values: schema.enum,
			description: schema.description,
			source,
		});
	}

	// Traverse properties
	if (schema.properties && typeof schema.properties === "object") {
		for (const [propKey, propValue] of Object.entries(schema.properties)) {
			if (propValue && typeof propValue === "object") {
				extractEnums(propValue as JSONSchema4, source, currentPath ? `${currentPath}.${propKey}` : propKey, results);
			}
		}
	}

	// Traverse definitions
	if (schema.definitions && typeof schema.definitions === "object") {
		for (const [defKey, defValue] of Object.entries(schema.definitions)) {
			if (defValue && typeof defValue === "object") {
				extractEnums(defValue as JSONSchema4, source, `definitions.${defKey}`, results);
			}
		}
	}

	// Traverse items (for arrays)
	if (schema.items) {
		if (Array.isArray(schema.items)) {
			schema.items.forEach((item, idx) => {
				if (item && typeof item === "object") {
					extractEnums(item as JSONSchema4, source, `${currentPath}[${idx}]`, results);
				}
			});
		} else if (typeof schema.items === "object") {
			extractEnums(schema.items as JSONSchema4, source, currentPath, results);
		}
	}

	// Traverse anyOf/oneOf/allOf
	for (const key of ["anyOf", "oneOf", "allOf"] as const) {
		const arr = schema[key];
		if (arr && Array.isArray(arr)) {
			arr.forEach((item, idx) => {
				if (item && typeof item === "object") {
					extractEnums(item as JSONSchema4, source, `${currentPath}.${key}[${idx}]`, results);
				}
			});
		}
	}

	return results;
}

/**
 * Generate TypeScript code for enum definitions
 */
export function generateEnumTypes(enums: EnumDefinition[]): string {
	const lines: string[] = [];

	// Group by category for better organization
	const categories = new Map<string, EnumDefinition[]>();

	for (const enumDef of enums) {
		let category = "Other";

		if (enumDef.path.includes("definitions.permissions") || enumDef.path.includes("permissions-level")) {
			category = "Permissions";
		} else if (enumDef.path.includes("definitions.shell") || enumDef.path.includes("shell")) {
			category = "Shell Types";
		} else if (enumDef.path.includes("definitions.machine") || enumDef.path.includes("definitions.architecture")) {
			category = "Machine/Architecture";
		} else if (enumDef.path.includes("branding")) {
			category = "Branding";
		} else if (enumDef.path.includes("definitions.runs-javascript") || enumDef.path.includes("node")) {
			category = "Node.js Runtimes";
		} else if (enumDef.path.startsWith("on.") && enumDef.path.includes(".types")) {
			category = "Event Types";
		} else if (enumDef.path.includes("definitions.event")) {
			category = "Events";
		} else if (enumDef.path.includes("workflow")) {
			category = "Workflow Configuration";
		}

		if (!categories.has(category)) {
			categories.set(category, []);
		}
		categories.get(category)?.push(enumDef);
	}

	// Generate code for each category
	for (const [category, categoryEnums] of categories.entries()) {
		lines.push(`// ============================================================================`);
		lines.push(`// ${category}`);
		lines.push(`// ============================================================================`);
		lines.push("");

		for (const enumDef of categoryEnums) {
			// Add description if available
			if (enumDef.description) {
				lines.push(`/**`);
				lines.push(` * ${enumDef.description}`);
				lines.push(` * Source: ${enumDef.source} schema - ${enumDef.path}`);
				lines.push(` */`);
			} else {
				lines.push(`/** ${enumDef.source} schema: ${enumDef.path} */`);
			}

			// Generate type
			const typeValues = enumDef.values.map((v) => `"${v}"`).join(" | ");
			lines.push(`export type ${enumDef.typeName} = ${typeValues};`);
			lines.push("");

			// Generate constant array
			lines.push(`/** All ${enumDef.typeName} values */`);
			const constValues = enumDef.values.map((v) => `"${v}"`).join(", ");
			lines.push(`export const ${enumDef.constantName}: readonly ${enumDef.typeName}[] = [${constValues}] as const;`);
			lines.push("");
		}
	}

	return lines.join("\n");
}
