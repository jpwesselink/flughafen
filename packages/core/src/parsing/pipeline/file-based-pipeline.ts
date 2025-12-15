import glob from "fast-glob";
import { readFile } from "fs/promises";
import path from "path";
import { parse as parseYaml } from "yaml";
import type { FileContext } from "../classification/types";
import { ProcessingPipeline, type ProcessingResult } from "./processing-pipeline";

export class FileBasedPipeline extends ProcessingPipeline {
	async processDirectory(directory: string, pattern = "**/*.{yml,yaml,json}"): Promise<ProcessingResult[]> {
		const files = await glob(pattern, {
			cwd: directory,
			absolute: true,
			dot: true,
		});

		const results: ProcessingResult[] = [];

		for (const filePath of files) {
			try {
				const result = await this.processFilePath(filePath);
				results.push(result);
			} catch (error) {
				results.push({
					file: this.createFileContext(filePath),
					kind: "unknown" as any,
					handler: "none",
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return results;
	}

	async processFilePath(filePath: string): Promise<ProcessingResult> {
		const fileContext = this.createFileContext(filePath);
		const content = await this.loadFileContent(filePath);

		return this.processFile(fileContext, content);
	}

	private createFileContext(filePath: string): FileContext {
		const parsed = path.parse(filePath);

		return {
			path: filePath,
			basename: parsed.base,
			name: parsed.name,
			ext: parsed.ext,
			dir: parsed.dir,
			relativePath: path.relative(process.cwd(), filePath),
		};
	}

	private async loadFileContent(filePath: string): Promise<unknown> {
		const content = await readFile(filePath, "utf-8");
		const ext = path.extname(filePath).toLowerCase();

		if (ext === ".json") {
			return JSON.parse(content);
		} else if (ext === ".yml" || ext === ".yaml") {
			return parseYaml(content);
		}

		throw new Error(`Unsupported file extension: ${ext}`);
	}
}
