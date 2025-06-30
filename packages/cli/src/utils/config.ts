import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const JoyCon = require("joycon");
import { join } from "node:path";
import { cwd } from "node:process";

/**
 * Flughafen CLI configuration interface
 */
export interface FlughafenConfig {
	/** Input directory for workflow source files */
	input: string;

	/** Output directory for generated workflows */
	output: string;

	/** GitHub token for API access */
	githubToken?: string;

	/** Templates configuration */
	templates?: {
		/** Custom template directories */
		directories?: string[];
		/** Default template to use */
		default?: string;
	};

	/** Validation settings */
	validation?: {
		/** Enable strict mode */
		strict?: boolean;
		/** Custom validation rules */
		rules?: ValidationRule[];
	};

	/** Type generation settings */
	types?: {
		/** Actions to generate types for */
		actions?: string[];
		/** Output file for generated types */
		output?: string;
		/** Include JSDoc in generated types */
		includeJSDoc?: boolean;
	};
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
	name: string;
	severity: "error" | "warning" | "info";
	check: (workflow: any) => boolean | string;
}

/**
 * Default configuration values
 */
export const defaultConfig: FlughafenConfig = {
	input: "./workflows",
	output: "./.github/workflows",
	templates: {
		default: "basic-ci",
	},
	validation: {
		strict: true,
	},
	types: {
		output: "./flughafen-actions.d.ts",
		includeJSDoc: true,
	},
};

/**
 * Configuration loader using JoyCon
 */
class ConfigLoader {
	private joycon: any;

	constructor() {
		this.joycon = new JoyCon();
	}

	/**
	 * Load configuration from various sources
	 */
	async load(cwd: string = process.cwd()): Promise<FlughafenConfig> {
		const result = await this.joycon.load(
			[
				"flughafen.config.ts",
				"flughafen.config.js",
				"flughafen.config.mjs",
				"flughafen.config.json",
				".flughafenrc",
				".flughafenrc.json",
				".flughafenrc.js",
				".flughafenrc.ts",
			],
			cwd,
		);

		// Merge with defaults
		const config = result?.data ? { ...defaultConfig, ...result.data } : { ...defaultConfig };

		// Resolve relative paths
		if (config.input && !config.input.startsWith("/")) {
			config.input = join(cwd, config.input);
		}
		if (config.output && !config.output.startsWith("/")) {
			config.output = join(cwd, config.output);
		}
		if (config.types?.output && !config.types.output.startsWith("/")) {
			config.types.output = join(cwd, config.types.output);
		}

		return config;
	}

	/**
	 * Get configuration file path if it exists
	 */
	async getConfigPath(cwd: string = process.cwd()): Promise<string | null> {
		const result = await this.joycon.load(
			[
				"flughafen.config.ts",
				"flughafen.config.js",
				"flughafen.config.mjs",
				"flughafen.config.json",
				".flughafenrc",
				".flughafenrc.json",
				".flughafenrc.js",
				".flughafenrc.ts",
			],
			cwd,
		);

		return result?.path || null;
	}
}

// Singleton instance
const configLoader = new ConfigLoader();

/**
 * Load Flughafen configuration
 */
export async function loadConfig(searchDir?: string): Promise<FlughafenConfig> {
	return configLoader.load(searchDir);
}

/**
 * Get configuration file path
 */
export async function getConfigPath(searchDir?: string): Promise<string | null> {
	return configLoader.getConfigPath(searchDir);
}

/**
 * Type guard for FlughafenConfig
 */
export function isValidConfig(config: any): config is FlughafenConfig {
	return (
		typeof config === "object" &&
		config !== null &&
		typeof config.input === "string" &&
		typeof config.output === "string"
	);
}