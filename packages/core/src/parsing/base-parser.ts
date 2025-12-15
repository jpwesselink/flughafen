import { type Document, parseDocument, visit } from "yaml";

/**
 * Base interface for all YAML parsers
 */
export interface YamlParser<TConfig = any, TAnalysis = any> {
	/**
	 * Parse YAML content and analyze it
	 */
	parse(content: string, filePath: string): TAnalysis;

	/**
	 * Generate TypeScript code from parsed configuration
	 */
	generateTypeScript(config: TConfig): string;

	/**
	 * Detect if this parser can handle the given file
	 */
	detectFileType(filePath: string): boolean;

	/**
	 * Get the parser name for identification
	 */
	readonly name: string;
}

/**
 * Base implementation for YAML parsers with visitor pattern support
 */
export abstract class BaseYamlParser<TConfig = any, TAnalysis = any> implements YamlParser<TConfig, TAnalysis> {
	abstract readonly name: string;

	/**
	 * Parse YAML content into analysis result
	 */
	parse(content: string, filePath: string): TAnalysis {
		const doc = this.parseDocument(content);
		return this.analyze(doc, filePath);
	}

	/**
	 * Parse YAML content into Document with error handling
	 */
	protected parseDocument(content: string): Document {
		const doc = parseDocument(content);

		// Check for YAML parsing errors
		if (doc.errors.length > 0) {
			throw new Error(`YAML parsing errors: ${doc.errors.map((e) => e.message).join(", ")}`);
		}

		if (!doc.contents) {
			throw new Error("Empty YAML document");
		}

		return doc;
	}

	/**
	 * Visit YAML document with visitor pattern
	 */
	protected visitDocument(doc: Document, visitors: any): void {
		visit(doc, visitors);
	}

	/**
	 * Convert document to plain JavaScript object
	 */
	protected toJS<T = any>(doc: Document): T {
		return doc.toJS() as T;
	}

	/**
	 * Abstract method to analyze the parsed document
	 */
	abstract analyze(doc: Document, filePath: string): TAnalysis;

	/**
	 * Abstract method to generate TypeScript code
	 */
	abstract generateTypeScript(config: TConfig): string;

	/**
	 * Abstract method to detect if parser can handle file
	 */
	abstract detectFileType(filePath: string): boolean;
}
