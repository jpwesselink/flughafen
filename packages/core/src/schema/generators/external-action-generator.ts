import type { ActionInput, ActionSchema } from "../fetchers/ActionSchemaFetcher";
import { generateInterfaceName, sanitizePropertyName, wrapText } from "./name-converter";
import type { GeneratedInterface, TypeGeneratorConfig } from "./type-generator-types";

/**
 * Generate TypeScript interfaces for external GitHub Actions
 */
export class ExternalActionGenerator {
	constructor(private config: Required<TypeGeneratorConfig>) {}

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
		const interfaceName = generateInterfaceName(actionName);
		const interfaceCode = this.generateInterfaceCode(schema, interfaceName);

		return {
			actionName,
			interfaceName,
			interfaceCode,
		};
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
				const description = wrapText(inputDef.description, 70);
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
		const propertyName = sanitizePropertyName(inputName);
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
				// Boolean inputs often accept string values like "recursive" for submodules
				// Since action.yml doesn't have a formal type system, be permissive
				return "boolean | string";
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
}
