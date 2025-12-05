/**
 * Simple module loader for extracting workflow objects without requiring synth()
 * This is used by the type generation system to analyze workflow structure
 */

import path from "node:path";
import { createContext, runInContext } from "node:vm";

export interface ModuleExtractionResult {
	/**
	 * All module exports from the executed code
	 */
	moduleExports: Record<string, unknown>;
}

export interface ModuleExtractionOptions {
	/**
	 * Additional globals to provide to the sandbox
	 */
	additionalGlobals?: Record<string, unknown>;

	/**
	 * Timeout for code execution in milliseconds
	 * @default 5000
	 */
	timeout?: number;
}

/**
 * Execute compiled code in a sandbox to extract module exports
 * This is a simpler version of executeWorkflowInSandbox that doesn't require synth()
 */
export function extractModuleExports(
	compiledCode: string,
	filePath: string,
	options: ModuleExtractionOptions = {}
): ModuleExtractionResult {
	const { additionalGlobals = {}, timeout = 5000 } = options;

	try {
		// Create a sandbox context
		const context = createContext({
			console,
			require: (moduleName: string) => {
				// Handle @flughafen/core imports
				if (moduleName === "@flughafen/core" || moduleName.startsWith("@flughafen/core/")) {
					return additionalGlobals.__preloadedFlughafen;
				}

				// Handle common Node.js modules that might be used in workflows
				if (moduleName === "path") {
					return path;
				}

				// For other imports, try to resolve them
				try {
					return require(moduleName);
				} catch {
					return {};
				}
			},
			module: { exports: {} },
			exports: {},
			__filename: filePath,
			__dirname: path.dirname(filePath),
			...additionalGlobals,
		});

		// Execute the compiled code
		runInContext(compiledCode, context, {
			filename: filePath,
			timeout,
		});

		return {
			moduleExports: context.module.exports,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to extract module exports: ${error.message}`);
		}
		throw new Error(`Failed to extract module exports: ${String(error)}`);
	}
}
