// Legacy - Base parser interfaces and classes

// Re-export types for convenience
export type { FundingConfig } from "../funding/types";
export { BaseYamlParser, type YamlParser } from "./base-parser";
export { BasenameDiscriminator } from "./classification/discriminators/basename-discriminator";
export { PathDiscriminator } from "./classification/discriminators/path-discriminator";
export { SchemaDiscriminator } from "./classification/discriminators/schema-discriminator";
// Classification System
export { ModularFileClassifier } from "./classification/modular-file-classifier";
export type { Discriminator, FileContext, FileKind } from "./classification/types";
export { ActionHandler } from "./handlers/action-handler";
export { DependabotHandler } from "./handlers/dependabot-handler";
export { FundingHandler } from "./handlers/funding-handler";
export type { Handler } from "./handlers/types";
// Handlers
export { WorkflowHandler } from "./handlers/workflow-handler";
export { type ActionAnalysis, ActionParser } from "./parsers/action-parser";
// Legacy - Parser implementations
export { type FundingAnalysis, FundingParser } from "./parsers/funding-parser";
export { type WorkflowAnalysis, WorkflowParser } from "./parsers/workflow-parser";
// New Modular Parsing System
export { ParsingSystem, type ParsingSystemConfig } from "./parsing-system";
export { FileBasedPipeline } from "./pipeline/file-based-pipeline";
export { type InMemoryFile, InMemoryPipeline } from "./pipeline/in-memory-pipeline";
export type { PipelineConfig, ProcessingResult } from "./pipeline/processing-pipeline";
// Legacy - Universal analyzer
export { type UniversalAnalysis, UniversalYamlAnalyzer } from "./universal-analyzer";

import { ActionParser } from "./parsers/action-parser";
import { FundingParser } from "./parsers/funding-parser";
import { WorkflowParser } from "./parsers/workflow-parser";
// Legacy - Import parsers directly for function usage
import { UniversalYamlAnalyzer } from "./universal-analyzer";

// Legacy - Create a pre-configured universal analyzer
export function createUniversalAnalyzer() {
	const analyzer = new UniversalYamlAnalyzer();

	// Register default parsers
	analyzer.registerParser("funding", new FundingParser());
	analyzer.registerParser("workflow", new WorkflowParser());
	analyzer.registerParser("action", new ActionParser());

	return analyzer;
}
