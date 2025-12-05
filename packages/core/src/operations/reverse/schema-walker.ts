import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * JSON Schema types
 */
export interface JSONSchema {
	$ref?: string;
	type?: string | string[];
	oneOf?: JSONSchema[];
	anyOf?: JSONSchema[];
	allOf?: JSONSchema[];
	properties?: Record<string, JSONSchema>;
	items?: JSONSchema;
	additionalProperties?: boolean | JSONSchema;
	patternProperties?: Record<string, JSONSchema>;
	definitions?: Record<string, JSONSchema>;
	enum?: unknown[];
	[key: string]: unknown;
}

/**
 * Context passed to visitors during traversal
 */
export interface WalkContext {
	path: string[]; // Current path in the data structure, e.g., ["jobs", "build", "steps", "0"]
	schema: JSONSchema; // Current schema node
	data: unknown; // Current data value
	parentData?: unknown; // Parent data object
	key?: string; // Current property key
}

/**
 * Visitor pattern interface for schema traversal
 */
export interface SchemaVisitor {
	/**
	 * Called when entering a node
	 */
	enter?(context: WalkContext): undefined | boolean; // Return false to skip children

	/**
	 * Called when leaving a node
	 */
	leave?(context: WalkContext): void;

	/**
	 * Called when visiting a property
	 * Return false to skip recursing into property value
	 */
	visitProperty?(context: WalkContext): undefined | boolean;

	/**
	 * Called when visiting an array item
	 */
	visitArrayItem?(context: WalkContext, index: number): void;
}

/**
 * Schema walker that traverses data according to JSON Schema structure
 */
export class SchemaWalker {
	private schema: JSONSchema;
	private definitions: Record<string, JSONSchema>;

	constructor(schemaPath?: string) {
		this.schema = this.loadSchema(schemaPath);
		this.definitions = this.schema.definitions || {};
	}

	private loadSchema(schemaPath?: string): JSONSchema {
		try {
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);
			// Path from src/operations/reverse/ to schemas/ is ../../../schemas/
			const path = schemaPath || join(__dirname, "../../../schemas/github-workflow.schema.json");
			const content = readFileSync(path, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			console.warn("Could not load schema for walking:", error);
			return {};
		}
	}

	/**
	 * Walk data according to schema structure
	 */
	walk(data: unknown, visitor: SchemaVisitor, schema?: JSONSchema, path: string[] = []): void {
		const currentSchema = schema || this.schema;
		const resolvedSchema = this.resolveSchema(currentSchema);

		// Resolve oneOf/anyOf/allOf to get effective schema
		let effectiveSchema = resolvedSchema;
		if (resolvedSchema.oneOf) {
			const matchingBranch = this.findMatchingOneOf(data, resolvedSchema.oneOf);
			if (matchingBranch) {
				effectiveSchema = this.resolveSchema(matchingBranch);
			}
		} else if (resolvedSchema.anyOf) {
			const matchingBranch = this.findMatchingOneOf(data, resolvedSchema.anyOf);
			if (matchingBranch) {
				effectiveSchema = this.resolveSchema(matchingBranch);
			}
		} else if (resolvedSchema.allOf) {
			effectiveSchema = this.mergeAllOf(resolvedSchema.allOf);
		}

		// Pass effective schema to visitor
		const context: WalkContext = {
			path,
			schema: effectiveSchema,
			data,
		};

		// Enter node
		if (visitor.enter) {
			const shouldContinue = visitor.enter(context);
			if (shouldContinue === false) {
				return; // Skip children
			}
		}

		// Now walk using the effective schema
		if (
			effectiveSchema.type === "object" ||
			effectiveSchema.properties ||
			effectiveSchema.patternProperties ||
			effectiveSchema.additionalProperties
		) {
			this.walkObject(data, visitor, effectiveSchema, path);
		} else if (effectiveSchema.type === "array" || effectiveSchema.items) {
			this.walkArray(data, visitor, effectiveSchema, path);
		}

		// Leave node
		if (visitor.leave) {
			visitor.leave(context);
		}
	}

	/**
	 * Walk object properties according to schema
	 */
	private walkObject(data: unknown, visitor: SchemaVisitor, schema: JSONSchema, path: string[]): void {
		if (!data || typeof data !== "object" || Array.isArray(data)) {
			return;
		}

		const properties = schema.properties || {};
		const dataObj = data as Record<string, unknown>;

		for (const [key, value] of Object.entries(dataObj)) {
			const propSchema = properties[key];
			if (propSchema) {
				const propPath = [...path, key];
				const context: WalkContext = {
					path: propPath,
					schema: propSchema,
					data: value,
					parentData: data,
					key,
				};

				let shouldRecurse = true;
				if (visitor.visitProperty) {
					const result = visitor.visitProperty(context);
					if (result === false) {
						shouldRecurse = false;
					}
				}

				// Recurse into property value if allowed
				if (shouldRecurse) {
					this.walk(value, visitor, propSchema, propPath);
				}
			} else if (schema.patternProperties) {
				// Check pattern properties
				for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
					if (new RegExp(pattern).test(key)) {
						const propPath = [...path, key];
						const context: WalkContext = {
							path: propPath,
							schema: patternSchema,
							data: value,
							parentData: data,
							key,
						};

						let shouldRecurse = true;
						if (visitor.visitProperty) {
							const result = visitor.visitProperty(context);
							if (result === false) {
								shouldRecurse = false;
							}
						}

						if (shouldRecurse) {
							this.walk(value, visitor, patternSchema, propPath);
						}
						break;
					}
				}
			} else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
				// Handle additional properties with schema
				const propPath = [...path, key];
				const context: WalkContext = {
					path: propPath,
					schema: schema.additionalProperties,
					data: value,
					parentData: data,
					key,
				};

				let shouldRecurse = true;
				if (visitor.visitProperty) {
					const result = visitor.visitProperty(context);
					if (result === false) {
						shouldRecurse = false;
					}
				}

				if (shouldRecurse) {
					this.walk(value, visitor, schema.additionalProperties, propPath);
				}
			}
		}
	}

	/**
	 * Walk array items according to schema
	 */
	private walkArray(data: unknown, visitor: SchemaVisitor, schema: JSONSchema, path: string[]): void {
		if (!Array.isArray(data)) {
			return;
		}

		const itemSchema = schema.items;
		if (!itemSchema) {
			return;
		}

		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			const itemPath = [...path, String(i)];
			const context: WalkContext = {
				path: itemPath,
				schema: itemSchema,
				data: item,
				parentData: data,
				key: String(i),
			};

			if (visitor.visitArrayItem) {
				visitor.visitArrayItem(context, i);
			}

			this.walk(item, visitor, itemSchema, itemPath);
		}
	}

	/**
	 * Resolve $ref references
	 */
	private resolveSchema(schema: JSONSchema): JSONSchema {
		if (!schema.$ref) {
			return schema;
		}

		// Handle #/definitions/name references
		if (schema.$ref.startsWith("#/definitions/")) {
			const defName = schema.$ref.substring("#/definitions/".length);
			const resolved = this.definitions[defName];
			if (resolved) {
				return this.resolveSchema(resolved);
			}
		}

		return schema;
	}

	/**
	 * Find which oneOf/anyOf branch matches the data
	 */
	private findMatchingOneOf(data: unknown, branches: JSONSchema[]): JSONSchema | null {
		for (const branch of branches) {
			if (this.dataMatchesSchema(data, branch)) {
				return branch;
			}
		}
		return null;
	}

	/**
	 * Check if data matches a schema (basic validation)
	 */
	private dataMatchesSchema(data: unknown, schema: JSONSchema): boolean {
		const resolved = this.resolveSchema(schema);

		// Check type
		if (resolved.type) {
			const dataType = Array.isArray(data) ? "array" : typeof data;
			if (Array.isArray(resolved.type)) {
				if (!resolved.type.includes(dataType)) {
					return false;
				}
			} else if (resolved.type !== dataType) {
				return false;
			}
		}

		// Check enum
		if (resolved.enum) {
			if (!resolved.enum.includes(data)) {
				return false;
			}
		}

		// Check required properties (for objects with required fields)
		if (
			resolved.required &&
			Array.isArray(resolved.required) &&
			typeof data === "object" &&
			data !== null &&
			!Array.isArray(data)
		) {
			const dataObj = data as Record<string, unknown>;
			// Check if all required properties exist in data
			for (const requiredProp of resolved.required) {
				if (!(requiredProp in dataObj)) {
					return false; // Required property missing
				}
			}
		}

		// Check properties (for objects)
		if (resolved.properties && typeof data === "object" && data !== null && !Array.isArray(data)) {
			// If there are required fields, we already checked them above
			// Check if data has properties that exist in schema (at least one match)
			const dataObj = data as Record<string, unknown>;
			const dataKeys = Object.keys(dataObj);
			const schemaKeys = Object.keys(resolved.properties);
			const hasMatchingKey = dataKeys.some((key) => schemaKeys.includes(key));
			return hasMatchingKey;
		}

		return true;
	}

	/**
	 * Merge allOf schemas
	 */
	private mergeAllOf(schemas: JSONSchema[]): JSONSchema {
		const merged: JSONSchema = {
			properties: {},
		};

		for (const schema of schemas) {
			const resolved = this.resolveSchema(schema);
			if (resolved.properties) {
				merged.properties = { ...merged.properties, ...resolved.properties };
			}
			if (resolved.type) {
				merged.type = resolved.type;
			}
		}

		return merged;
	}
}
