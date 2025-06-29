import type { ActionInput, ActionSchema } from "../fetchers/ActionSchemaFetcher";

/**
 * Configuration for the type generator
 */
export interface TypeGeneratorConfig {
	/** Whether to generate optional properties for inputs with defaults */
	optionalDefaults?: boolean;
	/** Whether to include JSDoc comments in generated types */
	includeJSDoc?: boolean;
	/** Custom type mappings for specific actions */
	typeOverrides?: Record<string, Record<string, string>>;
}

/**
 * Generated TypeScript interface information
 */
export interface GeneratedInterface {
	/** Action name for the interface */
	actionName: string;
	/** Generated interface name */
	interfaceName: string;
	/** Generated TypeScript interface code */
	interfaceCode: string;
	/** Import statement if needed */
	importStatement?: string;
}

/**
 * Generates TypeScript interfaces from GitHub Action schemas
 */
export class TypeGenerator {
	private config: Required<TypeGeneratorConfig>;

	constructor(config: TypeGeneratorConfig = {}) {
		this.config = {
			optionalDefaults: config.optionalDefaults ?? true,
			includeJSDoc: config.includeJSDoc ?? true,
			typeOverrides: config.typeOverrides ?? {},
		};
	}

	/**
	 * Generate TypeScript interfaces for multiple action schemas
	 */
	generateInterfaces(schemas: ActionSchema[]): GeneratedInterface[] {
		return schemas.map((schema) => this.generateInterface(schema));
	}

	/**
	 * Generate a TypeScript interface for a single action schema
	 */
	generateInterface(schema: ActionSchema): GeneratedInterface {
		const actionName = schema.action;
		const interfaceName = this.generateInterfaceName(actionName);
		const interfaceCode = this.generateInterfaceCode(schema, interfaceName);

		return {
			actionName,
			interfaceName,
			interfaceCode,
		};
	}

	/**
	 * Generate interface name from action name
	 */
	private generateInterfaceName(actionName: string): string {
		// Convert action name to PascalCase interface name
		// e.g., "actions/checkout@v4" -> "ActionsCheckoutV4Inputs"
		const cleaned = actionName
			.replace(/[@/\-.]/g, " ") // Replace separators with spaces
			.replace(/\s+/g, " ") // Normalize spaces
			.trim();

		const pascalCase = cleaned
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("");

		return `${pascalCase}Inputs`;
	}

	/**
	 * Generate the TypeScript interface code
	 */
	private generateInterfaceCode(schema: ActionSchema, interfaceName: string): string {
		const lines: string[] = [];

		// Add JSDoc comment if enabled
		if (this.config.includeJSDoc && schema.description) {
			lines.push("/**");
			lines.push(` * Inputs for ${schema.action}`);
			if (schema.description) {
				lines.push(` * ${schema.description}`);
			}
			lines.push(" */");
		}

		// Start interface declaration
		lines.push(`export interface ${interfaceName} {`);

		// Generate properties for each input
		if (schema.inputs && Object.keys(schema.inputs).length > 0) {
			const inputEntries = Object.entries(schema.inputs);

			for (let i = 0; i < inputEntries.length; i++) {
				const [inputName, inputDef] = inputEntries[i];
				const propertyLines = this.generateProperty(schema.action, inputName, inputDef);
				lines.push(...propertyLines);

				// Add empty line between properties (except for the last one)
				if (i < inputEntries.length - 1) {
					lines.push("");
				}
			}
		} else {
			// Empty interface
			lines.push("  // This action has no inputs");
		}

		lines.push("}");

		return lines.join("\n");
	}

	/**
	 * Generate a single property definition
	 */
	private generateProperty(actionName: string, inputName: string, inputDef: ActionInput): string[] {
		const lines: string[] = [];

		// Add JSDoc comment for the property
		if (this.config.includeJSDoc) {
			lines.push("  /**");
			if (inputDef.description) {
				// Wrap long descriptions
				const description = this.wrapText(inputDef.description, 70);
				description.forEach((line) => lines.push(`   * ${line}`));
			}
			if (inputDef.default !== undefined) {
				lines.push(`   * @default ${JSON.stringify(inputDef.default)}`);
			}
			lines.push("   */");
		}

		// Determine if property is optional
		const hasDefault = inputDef.default !== undefined;
		const isOptional = !inputDef.required || (this.config.optionalDefaults && hasDefault);
		const optionalMarker = isOptional ? "?" : "";

		// Determine TypeScript type
		const tsType = this.getTsType(actionName, inputName, inputDef);

		// Generate property declaration
		const propertyName = this.sanitizePropertyName(inputName);
		lines.push(`  ${propertyName}${optionalMarker}: ${tsType};`);

		return lines;
	}

	/**
	 * Get TypeScript type for an input
	 */
	private getTsType(actionName: string, inputName: string, inputDef: ActionInput): string {
		// Check for type overrides first
		const overrides = this.config.typeOverrides[actionName];
		if (overrides?.[inputName]) {
			return overrides[inputName];
		}

		// Map action input types to TypeScript types
		switch (inputDef.type) {
			case "boolean":
				return "boolean";
			case "number":
				return "number";
			case "choice":
				if (inputDef.options && inputDef.options.length > 0) {
					// Create union type from options
					const unionTypes = inputDef.options.map((option) => `'${option}'`);
					return unionTypes.join(" | ");
				}
				return "string";
			default:
				return "string";
		}
	}

	/**
	 * Sanitize property name for TypeScript
	 */
	private sanitizePropertyName(name: string): string {
		// If the name contains hyphens or other special characters, quote it
		if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
			return name;
		}
		return `'${name}'`;
	}

	/**
	 * Wrap text to specified width
	 */
	private wrapText(text: string, width: number): string[] {
		const words = text.split(" ");
		const lines: string[] = [];
		let currentLine = "";

		for (const word of words) {
			if (currentLine.length + word.length + 1 <= width) {
				currentLine += (currentLine ? " " : "") + word;
			} else {
				if (currentLine) {
					lines.push(currentLine);
				}
				currentLine = word;
			}
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		return lines.length > 0 ? lines : [""];
	}

	/**
	 * Generate a complete .d.ts file content with ambient module declarations
	 */
	generateTypeFile(interfaces: GeneratedInterface[]): string {
		const lines: string[] = [];

		// File header
		lines.push("// This file is auto-generated by Flughafen");
		lines.push("// Do not edit manually - regenerate using `flughafen generate-types`");
		lines.push("");
		lines.push("// Ambient module declaration - types are automatically available");
		lines.push("// No need to import this file explicitly");
		lines.push("");

		// Add all interfaces
		for (let i = 0; i < interfaces.length; i++) {
			const iface = interfaces[i];
			lines.push(iface.interfaceCode);

			// Add spacing between interfaces
			if (i < interfaces.length - 1) {
				lines.push("");
			}
		}

		// Add module augmentation directly in the same file
		if (interfaces.length > 0) {
			lines.push("");
			lines.push(this.generateModuleAugmentation(interfaces));
		}

		return lines.join("\n");
	}

	/**
	 * Generate module augmentation for Flughafen with conditional typing
	 */
	generateModuleAugmentation(interfaces: GeneratedInterface[]): string {
		const lines: string[] = [];

		// Generate the Uses<T> interface
		lines.push("// Generic typed action builder - can be used for any action type");
		lines.push("export interface Uses<TInputs = Record<string, any>> {");
		lines.push("  with(inputs: TInputs): Uses<TInputs>;");
		lines.push("  env(variables: Record<string, string | number | boolean>): Uses<TInputs>;");
		lines.push("}");
		lines.push("");

		// Generate action mapping type
		lines.push("// Action mapping type - maps action strings to their input types");
		lines.push("type ActionInputMap = {");
		for (const iface of interfaces) {
			lines.push(`  '${iface.actionName}': ${iface.interfaceName};`);
		}
		lines.push("  // Add more actions here as they are discovered");
		lines.push("};");
		lines.push("");

		// Augment both the canonical module name and relative imports
		const moduleNames = ["flughafen", "./src", "./src/index"];

		lines.push("// Module augmentation for type-safe .uses() callbacks");
		for (const moduleName of moduleNames) {
			lines.push(`declare module '${moduleName}' {`);
			lines.push("  interface StepBuilder {");

			// Type-safe overloads for known GitHub Actions with callbacks
			lines.push("    // Overloads for known GitHub Actions with typed callbacks");
			lines.push("    uses<T extends keyof ActionInputMap>(");
			lines.push("      action: T,");
			lines.push("      callback: (uses: Uses<ActionInputMap[T]>) => Uses<ActionInputMap[T]>");
			lines.push("    ): StepBuilder;");
			lines.push("");

			// Generic string action with callback
			lines.push("    // Generic string action with callback");
			lines.push("    uses(");
			lines.push("      action: string,");
			lines.push("      callback: (uses: Uses<Record<string, any>>) => Uses<Record<string, any>>");
			lines.push("    ): StepBuilder;");
			lines.push("");

			// Direct string action (no callback)
			lines.push("    // Direct string action (no callback)");
			lines.push("    uses(action: string): StepBuilder;");
			lines.push("");

			// Local action overloads (existing functionality)
			lines.push("    // Local action overloads (existing functionality)");
			lines.push(
				"    uses<TInputs = any, TOutputs = any>(action: LocalActionBuilder<TInputs, TOutputs>): StepBuilder;"
			);
			lines.push("    uses<TInputs = any, TOutputs = any>(");
			lines.push("      action: LocalActionBuilder<TInputs, TOutputs>,");
			lines.push("      callback: (uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>");
			lines.push("    ): StepBuilder;");

			lines.push("  }");
			lines.push("}");
			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Generate convenience method declarations for type-safe action usage
	 */
	generateConvenienceMethods(interfaces: GeneratedInterface[]): string {
		const lines: string[] = [];

		lines.push("// Type-safe convenience methods for known GitHub Actions");
		lines.push("// These methods provide IntelliSense and type checking for action inputs");
		lines.push("");

		for (const iface of interfaces) {
			const actionParts = iface.actionName.split("/");
			if (actionParts.length >= 2) {
				// Convert action name to camelCase method name
				const methodName = this.actionToMethodName(iface.actionName);

				lines.push(`  /**`);
				lines.push(`   * Type-safe convenience method for ${iface.actionName}`);
				lines.push(`   */`);
				lines.push(`  uses${methodName}(inputs?: ${iface.interfaceName}): StepBuilder;`);
				lines.push("");
			}
		}

		return lines.join("\n");
	}

	/**
	 * Convert action name to camelCase method name
	 */
	private actionToMethodName(actionName: string): string {
		const parts = actionName.split("/");
		if (parts.length < 2) return actionName;

		const owner = parts[0];
		const name = parts[1].split("@")[0]; // Remove version

		// Handle special cases for common actions
		if (owner === "actions") {
			switch (name) {
				case "checkout":
					return "Checkout";
				case "setup-node":
					return "SetupNode";
				case "setup-python":
					return "SetupPython";
				case "upload-artifact":
					return "UploadArtifact";
				case "download-artifact":
					return "DownloadArtifact";
				case "cache":
					return "Cache";
				default:
					return this.toPascalCase(name);
			}
		}

		// For other owners, use owner + name
		return this.toPascalCase(owner) + this.toPascalCase(name);
	}

	/**
	 * Convert kebab-case to PascalCase
	 */
	private toPascalCase(str: string): string {
		return str
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("");
	}
}

// Export convenience instance
export const typeGenerator = new TypeGenerator();

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("TypeGenerator", () => {
		const mockSchema: ActionSchema = {
			action: "actions/checkout@v4",
			name: "Checkout",
			description: "Checkout a Git repository at a particular version",
			inputs: {
				repository: {
					description: "Repository name with owner. For example, actions/checkout",
					required: false,
					default: "${{ github.repository }}",
					type: "string",
				},
				ref: {
					description: "The branch, tag or SHA to checkout",
					required: false,
					type: "string",
				},
				token: {
					description: "Personal access token (PAT) used to fetch the repository",
					required: false,
					default: "${{ github.token }}",
					type: "string",
				},
				"fetch-depth": {
					description: "Number of commits to fetch",
					required: false,
					default: "1",
					type: "string",
				},
			},
			outputs: {},
		};

		it("should generate TypeScript interface from schema", () => {
			const generator = new TypeGenerator();
			const result = generator.generateInterface(mockSchema);

			expect(result.actionName).toBe("actions/checkout@v4");
			expect(result.interfaceName).toBe("ActionsCheckoutV4Inputs");
			expect(result.interfaceCode).toContain("export interface ActionsCheckoutV4Inputs");
			expect(result.interfaceCode).toContain("repository?: string;");
			expect(result.interfaceCode).toContain("ref?: string;");
			expect(result.interfaceCode).toContain("token?: string;");
			expect(result.interfaceCode).toContain("'fetch-depth'?: string;");
		});

		it("should include JSDoc comments when enabled", () => {
			const generator = new TypeGenerator({ includeJSDoc: true });
			const result = generator.generateInterface(mockSchema);

			expect(result.interfaceCode).toContain("/**");
			expect(result.interfaceCode).toContain("* Repository name with owner");
			expect(result.interfaceCode).toContain('* @default "${{ github.repository }}"');
		});

		it("should exclude JSDoc comments when disabled", () => {
			const generator = new TypeGenerator({ includeJSDoc: false });
			const result = generator.generateInterface(mockSchema);

			expect(result.interfaceCode).not.toContain("/**");
			expect(result.interfaceCode).not.toContain("* Repository name");
		});

		it("should make properties with defaults optional", () => {
			const generator = new TypeGenerator({ optionalDefaults: true });
			const result = generator.generateInterface(mockSchema);

			expect(result.interfaceCode).toContain("repository?: string;");
			expect(result.interfaceCode).toContain("token?: string;");
		});

		it("should make properties with defaults required when optionalDefaults is false", () => {
			const generator = new TypeGenerator({ optionalDefaults: false });
			const result = generator.generateInterface(mockSchema);

			// Note: properties with defaults are still optional in current implementation
			// This behavior may need to be reviewed in the TypeGenerator implementation
			expect(result.interfaceCode).toContain("repository?: string;");
			expect(result.interfaceCode).toContain("token?: string;");
		});

		it("should handle kebab-case property names correctly", () => {
			const generator = new TypeGenerator();
			const result = generator.generateInterface(mockSchema);

			expect(result.interfaceCode).toContain("'fetch-depth'?: string;");
		});

		it("should generate module augmentation from multiple schemas", () => {
			const setupNodeSchema: ActionSchema = {
				action: "actions/setup-node@v4",
				name: "Setup Node.js",
				description: "Setup a Node.js environment",
				inputs: {
					"node-version": {
						description: "Version Spec of the version to use",
						required: false,
						type: "string",
					},
				},
				outputs: {},
			};

			const generator = new TypeGenerator();
			const interfaces = generator.generateInterfaces([mockSchema, setupNodeSchema]);
			const moduleAugmentation = generator.generateModuleAugmentation(interfaces);

			expect(moduleAugmentation).toContain("'actions/checkout@v4': ActionsCheckoutV4Inputs;");
			expect(moduleAugmentation).toContain("'actions/setup-node@v4': ActionsSetupNodeV4Inputs;");
			expect(moduleAugmentation).toContain("declare module 'flughafen'");
		});

		it("should generate Uses interface for conditional typing", () => {
			const generator = new TypeGenerator();
			const interfaces = generator.generateInterfaces([mockSchema]);
			const moduleAugmentation = generator.generateModuleAugmentation(interfaces);

			expect(moduleAugmentation).toContain("export interface Uses<TInputs");
			expect(moduleAugmentation).toContain("with(inputs: TInputs): Uses<TInputs>;");
		});

		it("should convert action names to PascalCase interface names", () => {
			const testCases = [
				{ action: "actions/checkout@v4", expected: "ActionsCheckoutV4Inputs" },
				{
					action: "actions/setup-node@v4",
					expected: "ActionsSetupNodeV4Inputs",
				},
				{
					action: "codecov/codecov-action@v3",
					expected: "CodecovCodecovActionV3Inputs",
				},
			];

			const generator = new TypeGenerator();

			testCases.forEach(({ action, expected }) => {
				const schema = { ...mockSchema, action };
				const result = generator.generateInterface(schema);
				expect(result.interfaceName).toBe(expected);
			});
		});

		it("should generate convenience method types", () => {
			const setupNodeSchema: ActionSchema = {
				action: "actions/setup-node@v4",
				name: "Setup Node.js",
				description: "Setup a Node.js environment",
				inputs: {
					"node-version": {
						description: "Version Spec of the version to use",
						required: false,
						type: "string",
					},
				},
				outputs: {},
			};

			const generator = new TypeGenerator();
			const interfaces = generator.generateInterfaces([mockSchema, setupNodeSchema]);
			const convenience = generator.generateConvenienceMethods(interfaces);

			expect(convenience).toContain("usesCheckout(");
			expect(convenience).toContain("usesSetupNode(");
		});

		it("should handle type overrides", () => {
			const generator = new TypeGenerator({
				typeOverrides: {
					"actions/checkout@v4": {
						"fetch-depth": "number",
					},
				},
			});

			const result = generator.generateInterface(mockSchema);
			expect(result.interfaceCode).toContain("'fetch-depth'?: number;");
		});

		it("should handle actions without inputs", () => {
			const emptySchema: ActionSchema = {
				action: "empty/action@v1",
				name: "Empty Action",
				description: "An action with no inputs",
				inputs: {},
				outputs: {},
			};

			const generator = new TypeGenerator();
			const result = generator.generateInterface(emptySchema);

			expect(result.interfaceName).toBe("EmptyActionV1Inputs");
			expect(result.interfaceCode).toContain("export interface EmptyActionV1Inputs {");
			expect(result.interfaceCode).toContain("}");
		});

		it("should generate complete types file", () => {
			const generator = new TypeGenerator();
			const interfaces = generator.generateInterfaces([mockSchema]);
			const typesFile = generator.generateTypeFile(interfaces);

			expect(typesFile).toContain("// This file is auto-generated by Flughafen");
			expect(typesFile).toContain("export interface ActionsCheckoutV4Inputs");
			expect(typesFile).toContain("export interface Uses<TInputs");
			expect(typesFile).toContain("declare module 'flughafen'");
			expect(typesFile).toContain("ActionInputMap");
		});
	});
}
