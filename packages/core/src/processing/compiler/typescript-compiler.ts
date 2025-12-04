/**
 * TypeScript to CommonJS compilation utility using esbuild
 * This utility compiles TypeScript files to CommonJS strings for VM execution
 */

import { readFileSync } from "node:fs";
import { buildSync, transformSync } from "esbuild";
import { createCompilationError } from "../../utils";

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
	 * Whether to bundle imports (resolves and inlines local imports)
	 * @default true
	 */
	bundle?: boolean;

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
	const { target = "node18", sourcemap = false, bundle = true, esbuildOptions = {} } = options;

	try {
		if (bundle) {
			// Use buildSync to bundle all local imports together
			const result = buildSync({
				entryPoints: [filePath],
				bundle: true,
				write: false,
				target,
				format: "cjs",
				platform: "node",
				sourcemap,
				// Mark @flughafen/core as external since it's provided by the sandbox
				external: ["@flughafen/core", "@flughafen/core/*"],
				// Keep require/module.exports for VM compatibility
				define: {
					"import.meta": "undefined",
				},
				...esbuildOptions,
			});

			if (result.outputFiles && result.outputFiles.length > 0) {
				return result.outputFiles[0].text;
			}
			throw new Error("No output generated from esbuild");
		}

		// Non-bundled mode: just transform the single file
		const sourceCode = readFileSync(filePath, "utf-8");
		const result = transformSync(sourceCode, {
			loader: "ts",
			target,
			format: "cjs",
			sourcefile: filePath,
			platform: "node",
			sourcemap,
			define: {
				"import.meta": "undefined",
			},
			...esbuildOptions,
		});

		return result.code;
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw createCompilationError(filePath, details, error instanceof Error ? error : undefined);
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
		const details = error instanceof Error ? error.message : String(error);
		throw createCompilationError(filename, details, error instanceof Error ? error : undefined);
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

// Type tests
if (import.meta.vitest) {
	const { describe, it, expectTypeOf } = await import("vitest");

	describe("Compiler Types", () => {
		it("should export CompileOptions type correctly", () => {
			expectTypeOf<CompileOptions>().toBeObject();
			expectTypeOf<CompileOptions>().toHaveProperty("target").toEqualTypeOf<string | undefined>();
			expectTypeOf<CompileOptions>().toHaveProperty("sourcemap").toEqualTypeOf<boolean | undefined>();
			expectTypeOf<CompileOptions>().toHaveProperty("esbuildOptions").toEqualTypeOf<Record<string, any> | undefined>();
		});
	});
}
