import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import * as ts from "typescript";
import type { ValidationContext, ValidatorFunction, WorkflowValidationResult } from "../types";

/**
 * TypeScript compilation validator
 * Validates TypeScript syntax and semantic errors
 */
export class TypeScriptValidator {
	/**
	 * Find and load the nearest tsconfig.json
	 */
	private findTsConfig(filePath: string): ts.ParsedCommandLine | undefined {
		const fileDir = dirname(filePath);
		const configPath = ts.findConfigFile(fileDir, ts.sys.fileExists, "tsconfig.json");

		if (configPath) {
			const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
			if (!configFile.error) {
				return ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
			}
		}
		return undefined;
	}

	/**
	 * Validate TypeScript compilation for a workflow file
	 */
	async validate(context: ValidationContext, result: WorkflowValidationResult): Promise<void> {
		// Skip non-TypeScript files
		if (context.filePath.endsWith(".yml") || context.filePath.endsWith(".yaml")) {
			return;
		}

		try {
			// Try to load tsconfig.json from the project
			const parsedConfig = this.findTsConfig(context.filePath);

			// Create TypeScript compiler options, preferring project's tsconfig
			const compilerOptions: ts.CompilerOptions = parsedConfig?.options ?? {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Node10,
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				resolveJsonModule: true,
			};

			// Always ensure noEmit is true
			compilerOptions.noEmit = true;
			// Skip lib checking for faster validation
			compilerOptions.skipLibCheck = true;

			// Read the file content
			const sourceCode = await readFile(context.filePath, "utf-8");

			// Create a TypeScript program with the single file
			const sourceFile = ts.createSourceFile(context.filePath, sourceCode, ts.ScriptTarget.ES2020, true);

			// Create compiler host
			const compilerHost: ts.CompilerHost = {
				getSourceFile: (fileName: string) => {
					if (fileName === context.filePath) {
						return sourceFile;
					}
					// For other files, try to read them from disk
					try {
						const content = ts.sys.readFile(fileName);
						if (content !== undefined) {
							return ts.createSourceFile(fileName, content, ts.ScriptTarget.ES2020);
						}
					} catch {
						// File not found or not readable
					}
					return undefined;
				},
				writeFile: () => {}, // No-op since we're not emitting
				getCurrentDirectory: () => dirname(context.filePath),
				getDirectories: ts.sys.getDirectories,
				fileExists: ts.sys.fileExists,
				readFile: ts.sys.readFile,
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => ts.sys.newLine,
				getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
			};

			// Create the TypeScript program
			const program = ts.createProgram([context.filePath], compilerOptions, compilerHost);

			// Get all diagnostics (syntax + semantic)
			const diagnostics = [
				...program.getSyntacticDiagnostics(sourceFile),
				...program.getSemanticDiagnostics(sourceFile),
			];

			// Known modules that are bundled/available at runtime but may not resolve in isolated compilation
			const knownModules = ["@flughafen/core", "@flughafen/core/"];

			// Convert TypeScript diagnostics to our validation format
			for (const diagnostic of diagnostics) {
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

				// Get line and column information if available
				let locationInfo = "";
				if (diagnostic.file && diagnostic.start !== undefined) {
					const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
					locationInfo = ` (line ${line + 1}, col ${character + 1})`;
				}

				// Skip module resolution errors for known packages (they're bundled at build time)
				// Error codes: 2307 = Cannot find module, 7016 = Could not find declaration file
				if (
					(diagnostic.code === 2307 || diagnostic.code === 7016) &&
					knownModules.some((mod) => message.includes(`'${mod}`))
				) {
					continue;
				}

				// Skip implicit any errors that stem from unresolved module types
				// Error code 7006 = Parameter implicitly has 'any' type
				if (diagnostic.code === 7006 && !parsedConfig) {
					// Downgrade to warning when no tsconfig exists
					result.warnings.push({
						path: context.filePath,
						message: `TypeScript: ${message}${locationInfo}`,
						severity: "warning",
						rule: "schema",
					});
					continue;
				}

				// Determine severity based on diagnostic category
				const isError = diagnostic.category === ts.DiagnosticCategory.Error;

				if (isError) {
					result.errors.push({
						path: context.filePath,
						message: `TypeScript: ${message}${locationInfo}`,
						severity: "error",
						rule: "schema",
					});
				} else {
					result.warnings.push({
						path: context.filePath,
						message: `TypeScript: ${message}${locationInfo}`,
						severity: "warning",
						rule: "schema",
					});
				}
			}
		} catch (error) {
			result.warnings.push({
				path: context.filePath,
				message: `TypeScript compilation check failed: ${error instanceof Error ? error.message : error}`,
				severity: "warning",
				rule: "schema",
			});
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateTypeScript: ValidatorFunction = async (context, result) => {
	const validator = new TypeScriptValidator();
	await validator.validate(context, result);
};
