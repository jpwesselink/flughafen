/**
 * Secure VM sandbox for executing workflow files
 * This utility creates a sandboxed environment to safely execute compiled workflow code
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

export interface SandboxResult {
	/**
	 * The synth result from calling workflow.synth() inside the sandbox
	 */
	synthResult: {
		workflow: {
			filename: string;
			content: string;
		};
		actions: Record<string, string>;
	};

	/**
	 * All module exports from the executed code (for debugging)
	 */
	moduleExports: Record<string, unknown>;
}

export interface SandboxOptions {
	/**
	 * The directory context for resolving relative imports
	 * @default process.cwd()
	 */
	workingDirectory?: string;

	/**
	 * Additional globals to provide to the sandbox
	 */
	additionalGlobals?: Record<string, unknown>;

	/**
	 * Whether to allow require() calls in the sandbox
	 * @default true
	 */
	allowRequire?: boolean;

	/**
	 * Timeout for code execution in milliseconds
	 * @default 30000
	 */
	timeout?: number;
}

/**
 * Creates a secure VM context for executing workflow code
 *
 * @param filePath - Path to the original file (for context)
 * @param options - Sandbox configuration options
 * @returns VM context ready for code execution
 */
export function createWorkflowSandbox(filePath: string, options: SandboxOptions = {}) {
	const { workingDirectory = process.cwd(), additionalGlobals = {}, allowRequire = true } = options;

	const fileDir = dirname(resolve(filePath));

	// Check if flughafen module was pre-loaded via additionalGlobals
	const preloadedFlughafen = additionalGlobals.__preloadedFlughafen;

	// Create sandbox context with controlled globals
	const context = {
		// Essential Node.js globals
		console,
		setTimeout,
		setInterval,
		clearTimeout,
		clearInterval,
		Buffer,
		process: {
			env: process.env,
			cwd: () => workingDirectory,
			version: process.version,
			versions: process.versions,
		},

		// Module system
		require: allowRequire
			? createSandboxRequire(fileDir, preloadedFlughafen as Record<string, unknown> | undefined)
			: undefined,
		module: { exports: {} },
		exports: {},
		__dirname: fileDir,
		__filename: resolve(filePath),

		// Additional globals (exclude the internal preloaded module)
		...Object.fromEntries(Object.entries(additionalGlobals).filter(([key]) => key !== "__preloadedFlughafen")),

		// Prevent access to dangerous globals
		global: undefined,
		globalThis: undefined,
		eval: undefined,
		Function: undefined,
	};

	return createContext(context, {
		name: `workflow-sandbox-${Date.now()}`,
		codeGeneration: {
			strings: false,
			wasm: false,
		},
	});
}

/**
 * Creates a secure require function for the sandbox
 *
 * @param baseDir - Base directory for resolving relative requires
 * @param preloadedFlughafen - Pre-loaded flughafen module to avoid dynamic require issues
 * @returns Safe require function
 */
function createSandboxRequire(baseDir: string, preloadedFlughafen?: Record<string, unknown>) {
	return function sandboxRequire(id: string) {
		// Allow built-in Node.js modules
		const builtinModules = ["path", "fs", "util", "crypto", "os", "events", "stream", "buffer", "url", "querystring"];

		if (builtinModules.includes(id)) {
			return require(id);
		}

		// Allow @flughafen/core imports - use pre-loaded module
		if (id === "@flughafen/core" || id.startsWith("@flughafen/core/")) {
			if (preloadedFlughafen) {
				return preloadedFlughafen;
			} else {
				throw new Error("@flughafen/core module not available in sandbox");
			}
		}

		// Allow relative imports from the file's directory
		if (id.startsWith("./") || id.startsWith("../")) {
			const resolvedPath = resolve(baseDir, id);

			// Ensure the resolved path is within allowed directories
			if (!resolvedPath.startsWith(baseDir) && !resolvedPath.startsWith(process.cwd())) {
				throw new Error(`Access denied: Cannot require '${id}' outside project directory`);
			}

			if (existsSync(resolvedPath)) {
				return require(resolvedPath);
			}

			// Try with common extensions
			const extensions = [".js", ".ts", ".json"];
			for (const ext of extensions) {
				const pathWithExt = resolvedPath + ext;
				if (existsSync(pathWithExt)) {
					return require(pathWithExt);
				}
			}

			throw new Error(`Cannot resolve module '${id}' from ${baseDir}`);
		}

		throw new Error(`Module '${id}' is not allowed in sandbox environment`);
	};
}

/**
 * Executes compiled workflow code in a secure sandbox and calls synth()
 *
 * @param compiledCode - CommonJS code string from esbuild
 * @param filePath - Original file path (for context)
 * @param options - Sandbox options including synth options
 * @returns Execution result with synth output
 * @throws Error if execution fails or workflow not found
 */
export function executeWorkflowInSandbox(
	compiledCode: string,
	filePath: string,
	options: SandboxOptions & {
		synthOptions?: {
			basePath?: string;
			workflowsDir?: string;
			actionsDir?: string;
			defaultFilename?: string;
		};
	} = {}
): SandboxResult {
	const { timeout = 30000, synthOptions = {} } = options;

	try {
		// Create sandbox context
		const context = createWorkflowSandbox(filePath, options);

		// Add synth execution code to the compiled code
		const codeWithSynth = `
      ${compiledCode}
      
      // Extract ALL workflows and call synth on each inside sandbox
      const moduleExports = module.exports || exports;

      function extractAllWorkflowBuilders(exports) {
        const workflows = [];

        // Check default export
        if (exports.default && typeof exports.default.synth === 'function') {
          workflows.push({ name: 'default', builder: exports.default });
        }

        // Check all named exports
        for (const [name, value] of Object.entries(exports)) {
          if (name === 'default') continue; // Already handled

          if (value && typeof value === 'object' && typeof value.synth === 'function') {
            workflows.push({ name, builder: value });
          }
        }

        return workflows;
      }

      const workflows = extractAllWorkflowBuilders(moduleExports);
      if (workflows.length === 0) {
        throw new Error('No workflow found with synth() method');
      }

      // Synth all workflows and merge results
      const allWorkflows = [];
      const allActions = {};

      for (const { name, builder } of workflows) {
        const result = builder.synth(${JSON.stringify(synthOptions)});
        allWorkflows.push(result.workflow);
        Object.assign(allActions, result.actions);
      }

      // Return first workflow as primary (for backwards compat) but include all
      global.__synthResult = {
        workflow: allWorkflows[0],
        workflows: allWorkflows,
        actions: allActions
      };
      global.__moduleExports = moduleExports;
    `;

		// Add globals for results
		context.global = {
			__synthResult: null,
			__moduleExports: null,
		};

		// Execute the code with synth call
		runInContext(codeWithSynth, context, {
			filename: filePath,
			timeout,
			displayErrors: true,
		});

		const synthResult = context.global.__synthResult;
		const moduleExports = context.global.__moduleExports;

		if (!synthResult) {
			throw new Error("synth() method did not return a valid result");
		}

		return {
			synthResult,
			moduleExports,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to execute workflow in sandbox: ${error.message}`);
		}
		throw new Error(`Failed to execute workflow in sandbox: ${String(error)}`);
	}
}
