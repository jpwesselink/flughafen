/**
 * TypeScript to CommonJS compilation utility using esbuild
 * This utility compiles TypeScript files to CommonJS strings for VM execution
 */

import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

export interface CompileOptions {
	/**
	 * Target Node.js version for compilation
	 * @default 'node18'
	 */
	target?: string;

	/**
	 * Whether to include source maps in the output
	 * @default false
	 */
	sourcemap?: boolean;

	/**
	 * Additional esbuild options
	 */
	esbuildOptions?: Record<string, any>;
}

/**
 * Compiles a TypeScript file to CommonJS string using esbuild
 *
 * @param filePath - Absolute path to the TypeScript file
 * @param options - Compilation options
 * @returns Compiled CommonJS code as a string
 * @throws Error if compilation fails or file cannot be read
 */
export function compileTypeScriptFile(filePath: string, options: CompileOptions = {}): string {
	const { target = "node18", sourcemap = false, esbuildOptions = {} } = options;

	try {
		// Read the TypeScript file
		const sourceCode = readFileSync(filePath, "utf-8");

		// Compile using esbuild
		const result = transformSync(sourceCode, {
			loader: "ts",
			target,
			format: "cjs",
			sourcefile: filePath,
			platform: "node",
			sourcemap,
			// Keep require/module.exports for VM compatibility
			define: {
				"import.meta": "undefined",
			},
			// Merge any additional options
			...esbuildOptions,
		});

		return result.code;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to compile TypeScript file '${filePath}': ${error.message}`);
		}
		throw new Error(`Failed to compile TypeScript file '${filePath}': ${String(error)}`);
	}
}

/**
 * Compiles TypeScript source code to CommonJS string using esbuild
 *
 * @param sourceCode - TypeScript source code
 * @param filename - Virtual filename for error reporting
 * @param options - Compilation options
 * @returns Compiled CommonJS code as a string
 * @throws Error if compilation fails
 */
export function compileTypeScriptSource(
	sourceCode: string,
	filename: string = "virtual-file.ts",
	options: CompileOptions = {}
): string {
	const { target = "node18", sourcemap = false, esbuildOptions = {} } = options;

	try {
		const result = transformSync(sourceCode, {
			loader: "ts",
			target,
			format: "cjs",
			sourcefile: filename,
			platform: "node",
			sourcemap,
			// Keep require/module.exports for VM compatibility
			define: {
				"import.meta": "undefined",
			},
			// Merge any additional options
			...esbuildOptions,
		});

		return result.code;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to compile TypeScript source '${filename}': ${error.message}`);
		}
		throw new Error(`Failed to compile TypeScript source '${filename}': ${String(error)}`);
	}
}

/**
 * Validates that a file is a TypeScript file
 *
 * @param filePath - Path to check
 * @returns true if the file has a .ts extension
 */
export function isTypeScriptFile(filePath: string): boolean {
	return filePath.endsWith(".ts");
}

/**
 * Validates that a file is a JavaScript file
 *
 * @param filePath - Path to check
 * @returns true if the file has a .js or .mjs extension
 */
export function isJavaScriptFile(filePath: string): boolean {
	return filePath.endsWith(".js") || filePath.endsWith(".mjs");
}
