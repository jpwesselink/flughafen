import type { FileContext } from "../classification/types";
import type { Discriminator, FileKind } from "../classification/types";
import type { Handler } from "../handlers/types";

export interface ProcessingResult {
	file: FileContext;
	kind: FileKind;
	handler: string;
	output?: string;
	success: boolean;
	error?: string;
}

export interface PipelineConfig {
	discriminators: Discriminator[];
	handlers: Map<FileKind, Handler>;
	stopOnFirstMatch?: boolean;
	validateSchema?: boolean;
}

export abstract class ProcessingPipeline {
	constructor(protected config: PipelineConfig) {}

	protected classifyFile(file: FileContext): FileKind[] {
		const candidates: FileKind[] = [];

		for (const discriminator of this.config.discriminators) {
			const matches = discriminator.probe(file);
			candidates.push(...matches);

			if (this.config.stopOnFirstMatch && matches.length > 0) {
				break;
			}
		}

		return [...new Set(candidates)];
	}

	protected processFile(file: FileContext, content: unknown): ProcessingResult {
		const kinds = this.classifyFile(file);

		if (kinds.length === 0) {
			return {
				file,
				kind: "unknown" as FileKind,
				handler: "none",
				success: false,
				error: "No matching discriminator found",
			};
		}

		for (const kind of kinds) {
			const handler = this.config.handlers.get(kind);
			if (!handler) {
				continue;
			}

			try {
				if (this.config.validateSchema && handler.schema) {
					const validation = handler.validate(content);
					if (!validation.valid) {
						continue;
					}
				}

				const output = handler.emit(content, file);
				return {
					file,
					kind,
					handler: handler.constructor.name,
					output,
					success: true,
				};
			} catch (error) {
				return {
					file,
					kind,
					handler: handler.constructor.name,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		return {
			file,
			kind: kinds[0],
			handler: "none",
			success: false,
			error: "No suitable handler found",
		};
	}
}
