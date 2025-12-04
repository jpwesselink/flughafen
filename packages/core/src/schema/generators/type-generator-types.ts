import type { ActionInputConfig, ActionOutputConfig } from "../../core/types/action-types";

/**
 * Represents a local action discovered in a workflow
 */
export interface LocalActionSchema {
	/** Action name (from .name() call) */
	name: string;
	/** Action description */
	description?: string;
	/** Input definitions */
	inputs?: Record<string, ActionInputConfig>;
	/** Output definitions */
	outputs?: Record<string, ActionOutputConfig>;
}

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
