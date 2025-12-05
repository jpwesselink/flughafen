import type { ActionInputConfig } from "../../core/types/action-types";
import { generateLocalActionInterfaceName, sanitizePropertyName, wrapText } from "./name-converter";
import type { GeneratedInterface, LocalActionSchema, TypeGeneratorConfig } from "./type-generator-types";

/**
 * Generate TypeScript interfaces for local custom actions
 */
export class LocalActionGenerator {
	constructor(private config: Required<TypeGeneratorConfig>) {}

	/**
	 * Generate TypeScript interfaces for local actions
	 */
	generateLocalActionInterfaces(localActions: LocalActionSchema[]): GeneratedInterface[] {
		return localActions.map((action) => this.generateLocalActionInterface(action));
	}

	/**
	 * Generate a TypeScript interface for a local action
	 */
	generateLocalActionInterface(action: LocalActionSchema): GeneratedInterface {
		const interfaceName = generateLocalActionInterfaceName(action.name);
		const interfaceCode = this.generateLocalActionInterfaceCode(action, interfaceName);

		return {
			actionName: action.name,
			interfaceName,
			interfaceCode,
		};
	}

	/**
	 * Generate the TypeScript interface code for a local action
	 */
	private generateLocalActionInterfaceCode(action: LocalActionSchema, interfaceName: string): string {
		const lines: string[] = [];

		// Add JSDoc comment if enabled
		if (this.config.includeJSDoc) {
			lines.push("/**");
			lines.push(` * Inputs for local action: ${action.name}`);
			if (action.description) {
				lines.push(` * ${action.description}`);
			}
			lines.push(" * @local This is a local composite action defined in your project");
			lines.push(" */");
		}

		// Start interface declaration
		lines.push(`export interface ${interfaceName} {`);

		// Generate properties for each input
		if (action.inputs && Object.keys(action.inputs).length > 0) {
			const inputEntries = Object.entries(action.inputs);

			for (let i = 0; i < inputEntries.length; i++) {
				const [inputName, inputConfig] = inputEntries[i];
				const propertyLines = this.generateLocalActionProperty(inputName, inputConfig);
				lines.push(...propertyLines);

				// Add empty line between properties (except for the last one)
				if (i < inputEntries.length - 1) {
					lines.push("");
				}
			}
		} else {
			// Empty interface
			lines.push("  // This local action has no inputs");
		}

		lines.push("}");

		return lines.join("\n");
	}

	/**
	 * Generate a property definition for a local action input
	 */
	private generateLocalActionProperty(inputName: string, inputConfig: ActionInputConfig): string[] {
		const lines: string[] = [];

		// Add JSDoc comment for the property
		if (this.config.includeJSDoc) {
			lines.push("  /**");
			if (inputConfig.description) {
				const description = wrapText(inputConfig.description, 70);
				description.forEach((line) => lines.push(`   * ${line}`));
			}
			if (inputConfig.default !== undefined) {
				lines.push(`   * @default ${JSON.stringify(inputConfig.default)}`);
			}
			lines.push("   */");
		}

		// Determine if property is optional
		const hasDefault = inputConfig.default !== undefined;
		const isOptional = !inputConfig.required || (this.config.optionalDefaults && hasDefault);
		const optionalMarker = isOptional ? "?" : "";

		// Determine TypeScript type based on input config
		let tsType: string;
		switch (inputConfig.type) {
			case "boolean":
				// Boolean inputs often accept string values like "recursive" for submodules
				// Since action.yml doesn't have a formal type system, be permissive
				tsType = "boolean | string";
				break;
			case "number":
				tsType = "number";
				break;
			case "choice":
				if (inputConfig.options && inputConfig.options.length > 0) {
					tsType = inputConfig.options.map((option: string) => `'${option}'`).join(" | ");
				} else {
					tsType = "string";
				}
				break;
			default:
				tsType = "string";
		}

		// Generate property declaration
		const propertyName = sanitizePropertyName(inputName);
		lines.push(`  ${propertyName}${optionalMarker}: ${tsType};`);

		return lines;
	}
}
