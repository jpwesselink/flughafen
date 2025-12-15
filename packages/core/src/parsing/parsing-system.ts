import { BasenameDiscriminator } from "./classification/discriminators/basename-discriminator";
import { PathDiscriminator } from "./classification/discriminators/path-discriminator";
import { SchemaDiscriminator } from "./classification/discriminators/schema-discriminator";
import type { Discriminator, FileKind } from "./classification/types";
import { ActionHandler } from "./handlers/action-handler";
import { DependabotHandler } from "./handlers/dependabot-handler";
import { FundingHandler } from "./handlers/funding-handler";
import type { Handler } from "./handlers/types";
import { WorkflowHandler } from "./handlers/workflow-handler";
import { FileBasedPipeline } from "./pipeline/file-based-pipeline";
import { InMemoryPipeline } from "./pipeline/in-memory-pipeline";
import type { PipelineConfig, ProcessingResult } from "./pipeline/processing-pipeline";

export interface ParsingSystemConfig {
	discriminators?: Discriminator[];
	handlers?: Map<FileKind, Handler>;
	stopOnFirstMatch?: boolean;
	validateSchema?: boolean;
}

export class ParsingSystem {
	private fileBasedPipeline: FileBasedPipeline;
	private inMemoryPipeline: InMemoryPipeline;

	constructor(config: ParsingSystemConfig = {}) {
		const pipelineConfig = this.createPipelineConfig(config);

		this.fileBasedPipeline = new FileBasedPipeline(pipelineConfig);
		this.inMemoryPipeline = new InMemoryPipeline(pipelineConfig);
	}

	static createDefault(): ParsingSystem {
		return new ParsingSystem();
	}

	static create(config: ParsingSystemConfig): ParsingSystem {
		return new ParsingSystem(config);
	}

	get fileBased(): FileBasedPipeline {
		return this.fileBasedPipeline;
	}

	get inMemory(): InMemoryPipeline {
		return this.inMemoryPipeline;
	}

	async processDirectory(directory: string, pattern?: string): Promise<ProcessingResult[]> {
		return this.fileBasedPipeline.processDirectory(directory, pattern);
	}

	async processFile(filePath: string): Promise<ProcessingResult> {
		return this.fileBasedPipeline.processFilePath(filePath);
	}

	private createPipelineConfig(config: ParsingSystemConfig): PipelineConfig {
		return {
			discriminators: config.discriminators || this.createDefaultDiscriminators(),
			handlers: config.handlers || this.createDefaultHandlers(),
			stopOnFirstMatch: config.stopOnFirstMatch ?? true,
			validateSchema: config.validateSchema ?? true,
		};
	}

	private createDefaultDiscriminators(): Discriminator[] {
		return [new PathDiscriminator(), new BasenameDiscriminator(), new SchemaDiscriminator()];
	}

	private createDefaultHandlers(): Map<FileKind, Handler> {
		const handlers = new Map<FileKind, Handler>();

		handlers.set("gha-workflow", new WorkflowHandler());
		handlers.set("gha-action", new ActionHandler());
		handlers.set("github-funding", new FundingHandler());
		handlers.set("dependabot-config", new DependabotHandler());

		return handlers;
	}
}
