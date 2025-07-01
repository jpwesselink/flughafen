import { readFile } from "node:fs/promises";
import * as ts from "typescript";
import type { ValidationContext, WorkflowValidationResult, ValidatorFunction } from "../types";

/**
 * TypeScript compilation validator
 * Validates TypeScript syntax and semantic errors
 */
export class TypeScriptValidator {
	/**
	 * Validate TypeScript compilation for a workflow file
	 */
	async validate(context: ValidationContext, result: WorkflowValidationResult): Promise<void> {
		try {
			// Create TypeScript compiler options
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Node10,
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				noEmit: true, // We only want to check, not emit
				allowImportingTsExtensions: false,
				resolveJsonModule: true,
			};

			// Read the file content
			const sourceCode = await readFile(context.filePath, "utf-8");

			// Create a TypeScript program with the single file
			const sourceFile = ts.createSourceFile(
				context.filePath,
				sourceCode,
				ts.ScriptTarget.ES2020,
				true
			);

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
				getCurrentDirectory: () => process.cwd(),
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

			// Convert TypeScript diagnostics to our validation format
			for (const diagnostic of diagnostics) {
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

				// Determine severity based on diagnostic category
				const isError = diagnostic.category === ts.DiagnosticCategory.Error;

				if (isError) {
					result.errors.push({
						path: context.filePath,
						message: `TypeScript: ${message}`,
						severity: "error",
						rule: "typescript-compilation",
					});
				} else {
					result.warnings.push({
						path: context.filePath,
						message: `TypeScript: ${message}`,
						severity: "warning",
						rule: "typescript-compilation",
					});
				}
			}
		} catch (error) {
			result.warnings.push({
				path: context.filePath,
				message: `TypeScript compilation check failed: ${error instanceof Error ? error.message : error}`,
				severity: "warning",
				rule: "typescript-compilation-error",
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