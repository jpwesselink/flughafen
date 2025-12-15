import type { FileContext } from "../classification/types";
import { ProcessingPipeline, type ProcessingResult } from "./processing-pipeline";

export interface InMemoryFile {
	context: FileContext;
	content: unknown;
}

export class InMemoryPipeline extends ProcessingPipeline {
	processFiles(files: InMemoryFile[]): ProcessingResult[] {
		return files.map((file) => this.processFile(file.context, file.content));
	}

	processSingleFile(file: InMemoryFile): ProcessingResult {
		return this.processFile(file.context, file.content);
	}

	createFile(context: FileContext, content: unknown): InMemoryFile {
		return { context, content };
	}

	static createFileContext(
		path: string,
		basename?: string,
		name?: string,
		ext?: string,
		dir?: string,
		relativePath?: string
	): FileContext {
		const parsed = require("path").parse(path);

		return {
			path,
			basename: basename || parsed.base,
			name: name || parsed.name,
			ext: ext || parsed.ext,
			dir: dir || parsed.dir,
			relativePath: relativePath || path,
		};
	}
}
