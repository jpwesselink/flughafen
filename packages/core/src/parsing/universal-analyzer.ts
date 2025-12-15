import { readFileSync } from "node:fs";
import type { YamlParser } from "./base-parser";

/**
 * Generic analysis result that can hold any parser's output
 */
export interface UniversalAnalysis {
	parser: string;
	filePath: string;
	data: any;
	type: "workflow" | "funding" | "action" | "unknown";
}

/**
 * Universal YAML analyzer with pluggable parser system
 */
export class UniversalYamlAnalyzer {
	private parsers = new Map<string, YamlParser<any, any>>();

	/**
	 * Register a parser for a specific file type
	 */
	registerParser(name: string, parser: YamlParser<any, any>): void {
		this.parsers.set(name, parser);
	}

	/**
	 * Unregister a parser
	 */
	unregisterParser(name: string): boolean {
		return this.parsers.delete(name);
	}

	/**
	 * Get all registered parser names
	 */
	getRegisteredParsers(): string[] {
		return Array.from(this.parsers.keys());
	}

	/**
	 * Get a specific parser by name
	 */
	getParser(name: string): YamlParser<any, any> | undefined {
		return this.parsers.get(name);
	}

	/**
	 * Analyze a YAML file using auto-detected parser
	 */
	analyzeFile(filePath: string): UniversalAnalysis {
		const content = readFileSync(filePath, "utf-8");
		return this.analyzeContent(content, filePath);
	}

	/**
	 * Analyze YAML content using auto-detected parser
	 */
	analyzeContent(content: string, filePath: string): UniversalAnalysis {
		const parser = this.detectParser(filePath);

		if (!parser) {
			throw new Error(`No parser found for file: ${filePath}`);
		}

		const analysis = parser.parse(content, filePath);

		return {
			parser: parser.name,
			filePath,
			data: analysis,
			type: this.inferFileType(parser.name),
		};
	}

	/**
	 * Generate TypeScript code using specific parser
	 */
	generateTypeScript(parserName: string, config: any): string {
		const parser = this.parsers.get(parserName);

		if (!parser) {
			throw new Error(`Parser '${parserName}' not found`);
		}

		return parser.generateTypeScript(config);
	}

	/**
	 * Detect which parser can handle the given file
	 */
	private detectParser(filePath: string): YamlParser<any, any> | null {
		for (const [, parser] of this.parsers) {
			if (parser.detectFileType(filePath)) {
				return parser;
			}
		}
		return null;
	}

	/**
	 * Infer file type from parser name
	 */
	private inferFileType(parserName: string): UniversalAnalysis["type"] {
		switch (parserName.toLowerCase()) {
			case "workflow":
				return "workflow";
			case "funding":
				return "funding";
			case "action":
				return "action";
			default:
				return "unknown";
		}
	}

	/**
	 * Check if a parser is registered for the given file
	 */
	canHandle(filePath: string): boolean {
		return this.detectParser(filePath) !== null;
	}

	/**
	 * Get all parsers that can handle the given file
	 */
	getCompatibleParsers(filePath: string): string[] {
		const compatible: string[] = [];

		for (const [parserName, parser] of this.parsers) {
			if (parser.detectFileType(filePath)) {
				compatible.push(parserName);
			}
		}

		return compatible;
	}
}
