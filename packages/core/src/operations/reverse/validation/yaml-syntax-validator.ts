import yaml from "yaml";

export interface YamlValidationResult {
	valid: boolean;
	errors: YamlSyntaxError[];
}

export interface YamlSyntaxError {
	line: number;
	column: number;
	message: string;
	snippet: string;
}

export class YamlSyntaxValidator {
	/**
	 * Validates YAML syntax and provides detailed error reporting with line/column information
	 */
	validateSyntax(content: string): YamlValidationResult {
		try {
			yaml.parse(content);
			return { valid: true, errors: [] };
		} catch (error) {
			return {
				valid: false,
				errors: [this.createSyntaxError(content, error as yaml.YAMLParseError)],
			};
		}
	}

	private createSyntaxError(content: string, error: yaml.YAMLParseError): YamlSyntaxError {
		const lines = content.split("\n");
		const lineNumber = error.linePos?.[0]?.line || 1;
		const columnNumber = error.linePos?.[0]?.col || 1;

		return {
			line: lineNumber,
			column: columnNumber,
			message: this.cleanErrorMessage(error.message),
			snippet: this.extractSnippet(lines, lineNumber, columnNumber),
		};
	}

	private cleanErrorMessage(message: string): string {
		// Remove technical YAML parser details and make message user-friendly
		return message
			.replace(/at line \d+, column \d+/, "")
			.replace(/^YAMLParseError: /, "")
			.trim();
	}

	private extractSnippet(lines: string[], errorLine: number, errorColumn: number): string {
		const contextLines = 2; // Show 2 lines before and after
		const startLine = Math.max(0, errorLine - contextLines - 1);
		const endLine = Math.min(lines.length, errorLine + contextLines);

		const snippet: string[] = [];

		for (let i = startLine; i < endLine; i++) {
			const lineNum = i + 1;
			const line = lines[i] || "";
			const isErrorLine = lineNum === errorLine;

			if (isErrorLine) {
				snippet.push(`>  ${lineNum.toString().padStart(2)} | ${line}`);
				// Add error pointer
				const pointer = " ".repeat(6 + errorColumn - 1) + "^";
				snippet.push(pointer);
			} else {
				snippet.push(`   ${lineNum.toString().padStart(2)} | ${line}`);
			}
		}

		return snippet.join("\n");
	}
}
