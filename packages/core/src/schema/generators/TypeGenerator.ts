import type { ActionSchema } from "../fetchers/ActionSchemaFetcher";
import { ExternalActionGenerator } from "./external-action-generator";
import { LocalActionGenerator } from "./local-action-generator";
import { ModuleAugmentationGenerator } from "./module-augmentation-generator";
import { TypeFileGenerator } from "./type-file-generator";
import type { GeneratedInterface, LocalActionSchema, TypeGeneratorConfig } from "./type-generator-types";

/**
 * Generates TypeScript interfaces from GitHub Action schemas
 */
export class TypeGenerator {
	private config: Required<TypeGeneratorConfig>;
	private externalActionGenerator: ExternalActionGenerator;
	private localActionGenerator: LocalActionGenerator;
	private augmentationGenerator: ModuleAugmentationGenerator;
	private fileGenerator: TypeFileGenerator;

	constructor(config: TypeGeneratorConfig = {}) {
		this.config = {
			optionalDefaults: config.optionalDefaults ?? true,
			includeJSDoc: config.includeJSDoc ?? true,
			typeOverrides: config.typeOverrides ?? {},
		};

		// Initialize specialized generators
		this.externalActionGenerator = new ExternalActionGenerator(this.config);
		this.localActionGenerator = new LocalActionGenerator(this.config);
		this.augmentationGenerator = new ModuleAugmentationGenerator();
		this.fileGenerator = new TypeFileGenerator();
	}

	/**
	 * Generate TypeScript interfaces for multiple action schemas
	 */
	generateInterfaces(schemas: ActionSchema[]): GeneratedInterface[] {
		return this.externalActionGenerator.generateInterfaces(schemas);
	}

	/**
	 * Generate a TypeScript interface for a single action schema
	 */
	generateInterface(schema: ActionSchema): GeneratedInterface {
		return this.externalActionGenerator.generateInterface(schema);
	}

	/**
	 * Generate TypeScript interfaces for local actions
	 */
	generateLocalActionInterfaces(localActions: LocalActionSchema[]): GeneratedInterface[] {
		return this.localActionGenerator.generateLocalActionInterfaces(localActions);
	}

	/**
	 * Generate a TypeScript interface for a local action
	 */
	generateLocalActionInterface(action: LocalActionSchema): GeneratedInterface {
		return this.localActionGenerator.generateLocalActionInterface(action);
	}

	/**
	 * Generate module augmentation for Flughafen with conditional typing
	 */
	generateModuleAugmentation(interfaces: GeneratedInterface[]): string {
		return this.augmentationGenerator.generateModuleAugmentation(interfaces);
	}

	/**
	 * Generate convenience method declarations for type-safe action usage
	 */
	generateConvenienceMethods(interfaces: GeneratedInterface[]): string {
		return this.augmentationGenerator.generateConvenienceMethods(interfaces);
	}

	/**
	 * Generate a complete .d.ts file content with ambient module declarations
	 */
	generateTypeFile(interfaces: GeneratedInterface[]): string {
		return this.fileGenerator.generateTypeFile(interfaces);
	}

	/**
	 * Generate a complete .d.ts file with both external and local action types
	 */
	generateTypeFileWithLocalActions(
		externalInterfaces: GeneratedInterface[],
		localInterfaces: GeneratedInterface[]
	): string {
		return this.fileGenerator.generateTypeFileWithLocalActions(externalInterfaces, localInterfaces);
	}
}

// Export convenience instance
export const typeGenerator = new TypeGenerator();

// Re-export types for external use
export type { GeneratedInterface, LocalActionSchema, TypeGeneratorConfig } from "./type-generator-types";
