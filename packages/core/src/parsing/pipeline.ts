import { readFileSync } from "node:fs";
import { extname } from "node:path";
import Ajv from "ajv";
import { parse as parseYaml } from "yaml";
import { FileClassifier, type FileContext, type FileKind, type KindHandler } from "./file-classification";

export interface ProcessingOptions {
	inputDir: string;
	outputDir: string;
	patterns: string[];
	skipValidation?: boolean;
	continueOnError?: boolean;
}

export interface ProcessingResult {
	processed: number;
	skipped: number;
	errors: ProcessingError[];
}

export interface ProcessingError {
	file: string;
	kind: FileKind;
	error: string;
	phase: "parse" | "classify" | "validate" | "emit";
}

export class ProcessingPipeline {
	private classifier = new FileClassifier();
	private ajv = new Ajv({ strict: false });
	private handlers = new Map<FileKind, KindHandler>();

	registerHandler(kind: FileKind, handler: KindHandler): void {
		this.handlers.set(kind, handler);
	}

	async processFile(
		filePath: string,
		options: ProcessingOptions
	): Promise<{
		success: boolean;
		result?: string;
		error?: ProcessingError;
	}> {
		try {
			// 1. Parse based on extension
			const ext = extname(filePath);
			const raw = readFileSync(filePath, "utf-8");

			let content: unknown;
			try {
				if (ext === ".json") {
					content = JSON.parse(raw);
				} else if (ext === ".yml" || ext === ".yaml") {
					content = parseYaml(raw);
				} else if (ext === ".md") {
					content = { markdown: raw }; // Simple wrapper for markdown
				} else {
					return {
						success: false,
						error: {
							file: filePath,
							kind: "unknown",
							error: `Unsupported file extension: ${ext}`,
							phase: "parse",
						},
					};
				}
			} catch (parseError) {
				return {
					success: false,
					error: {
						file: filePath,
						kind: "unknown",
						error: `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
						phase: "parse",
					},
				};
			}

			// 2. Build context and classify
			const context = this.classifier.createFileContext(filePath, content);
			const kind = this.classifier.classify(context);

			if (kind === "unknown") {
				return {
					success: false,
					error: {
						file: filePath,
						kind: "unknown",
						error: "Could not classify file type",
						phase: "classify",
					},
				};
			}

			// 3. Get handler
			const handler = this.handlers.get(kind);
			if (!handler) {
				return {
					success: false,
					error: {
						file: filePath,
						kind,
						error: `No handler registered for kind: ${kind}`,
						phase: "emit",
					},
				};
			}

			// 4. Optional schema validation
			if (!options.skipValidation && handler.schema) {
				const valid = this.ajv.validate(handler.schema, content);
				if (!valid) {
					const errors =
						this.ajv.errors?.map((e) => `${e.instancePath}: ${e.message}`).join(", ") || "Unknown validation error";
					return {
						success: false,
						error: {
							file: filePath,
							kind,
							error: `Schema validation failed: ${errors}`,
							phase: "validate",
						},
					};
				}
			}

			// 5. Emit TypeScript
			try {
				const result = handler.emit(content, context);
				return { success: true, result };
			} catch (emitError) {
				return {
					success: false,
					error: {
						file: filePath,
						kind,
						error: `Emit error: ${emitError instanceof Error ? emitError.message : String(emitError)}`,
						phase: "emit",
					},
				};
			}
		} catch (error) {
			return {
				success: false,
				error: {
					file: filePath,
					kind: "unknown",
					error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
					phase: "parse",
				},
			};
		}
	}

	createContext(filePath: string, content: unknown): FileContext {
		return this.classifier.createFileContext(filePath, content);
	}

	classifyFile(context: FileContext): FileKind {
		return this.classifier.classify(context);
	}

	getRegisteredHandlers(): FileKind[] {
		return Array.from(this.handlers.keys());
	}
}
