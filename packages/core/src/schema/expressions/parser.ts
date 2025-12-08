/**
 * GitHub Actions expression parser and validator
 *
 * Provides parsing and validation for GitHub Actions ${{ }} expressions
 */

/**
 * Simple expression parser that recognizes GitHub Actions patterns
 */
export class ExpressionParser {
	/**
	 * Parse a GitHub Actions expression and extract components
	 */
	parseExpression(expression: string): ExpressionComponents {
		const cleanExpr = this.cleanExpression(expression);

		const components: ExpressionComponents = {
			original: expression,
			cleaned: cleanExpr,
			contexts: this.extractContexts(cleanExpr),
			functions: this.extractFunctions(cleanExpr),
			operators: this.extractOperators(cleanExpr),
			literals: this.extractLiterals(cleanExpr),
		};

		return components;
	}

	/**
	 * Get all context references in an expression
	 */
	extractContextReferences(expression: string): ContextReference[] {
		const components = this.parseExpression(expression);
		return components.contexts;
	}

	/**
	 * Extract all potential context-like patterns from an expression.
	 * This includes unknown contexts and is used for validation purposes.
	 * Unlike extractContexts(), this doesn't filter to known contexts only.
	 */
	extractAllPotentialContexts(expression: string): ContextReference[] {
		const cleanExpr = this.cleanExpression(expression);
		// Match any identifier followed by dot notation at expression boundaries
		// Use explicit word boundary that doesn't match after hyphens
		const contextPattern = /(?:^|[\s(,|&!=<>])\s*([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][\w.\-\[\]'"]*)/g;

		const results: ContextReference[] = [];
		let match: RegExpExecArray | null;

		while ((match = contextPattern.exec(cleanExpr)) !== null) {
			const contextName = match[1];
			const pathStr = match[2];
			const path = pathStr.split(".").filter(Boolean);

			results.push({
				name: contextName,
				path,
				fullPath: `${contextName}.${pathStr}`,
			});
		}

		return results;
	}

	private cleanExpression(expression: string): string {
		const trimmed = expression.trim();
		if (trimmed.startsWith("${{") && trimmed.endsWith("}}")) {
			return trimmed.slice(3, -2).trim();
		}
		return trimmed;
	}

	private extractContexts(expression: string): ContextReference[] {
		// Known GitHub Actions contexts
		const validContexts = [
			"github",
			"env",
			"job",
			"runner",
			"steps",
			"needs",
			"strategy",
			"matrix",
			"secrets",
			"vars",
			"inputs",
		];

		// Only match known contexts followed by dot notation
		// This avoids false positives from identifiers after hyphens in step IDs
		const contextPattern = new RegExp(
			`(?:^|[\\s(,|&!=<>])\\s*(${validContexts.join("|")})\\.([\\w.\\-\\[\\]'"]+)`,
			"g"
		);

		const results: ContextReference[] = [];
		let match: RegExpExecArray | null;

		while ((match = contextPattern.exec(expression)) !== null) {
			const contextName = match[1];
			const pathStr = match[2];
			// Split path but handle hyphens in identifiers (don't split on them)
			const path = pathStr.split(".").filter(Boolean);

			results.push({
				name: contextName,
				path,
				fullPath: `${contextName}.${pathStr}`,
			});
		}

		return results;
	}

	private extractFunctions(expression: string): FunctionCall[] {
		const functionPattern = /\b(\w+)\s*\(/g;
		const matches = [];
		let match: RegExpExecArray | null = functionPattern.exec(expression);

		while (match !== null) {
			matches.push({
				name: match[1],
				position: match.index,
			});
			match = functionPattern.exec(expression);
		}

		return matches;
	}

	private extractOperators(expression: string): string[] {
		const operatorPattern = /(\|\||&&|==|!=|<=|>=|<|>|\+|-|\*|\/|%|!)/g;
		return expression.match(operatorPattern) || [];
	}

	private extractLiterals(expression: string): LiteralValue[] {
		const literals: LiteralValue[] = [];

		// String literals
		const stringPattern = /'([^']*)'|"([^"]*)"/g;
		let match: RegExpExecArray | null = stringPattern.exec(expression);
		while (match !== null) {
			literals.push({
				type: "string",
				value: match[1] || match[2],
				raw: match[0],
			});
			match = stringPattern.exec(expression);
		}

		// Number literals
		const numberPattern = /\b\d+(\.\d+)?\b/g;
		match = numberPattern.exec(expression);
		while (match !== null) {
			literals.push({
				type: "number",
				value: parseFloat(match[0]),
				raw: match[0],
			});
			match = numberPattern.exec(expression);
		}

		// Boolean literals
		if (expression.includes("true")) {
			literals.push({ type: "boolean", value: true, raw: "true" });
		}
		if (expression.includes("false")) {
			literals.push({ type: "boolean", value: false, raw: "false" });
		}
		if (expression.includes("null")) {
			literals.push({ type: "null", value: null, raw: "null" });
		}

		return literals;
	}
}

// Types
export interface ExpressionComponents {
	original: string;
	cleaned: string;
	contexts: ContextReference[];
	functions: FunctionCall[];
	operators: string[];
	literals: LiteralValue[];
}

export interface ContextReference {
	name: string;
	path: string[];
	fullPath: string;
}

export interface FunctionCall {
	name: string;
	position: number;
}

export interface LiteralValue {
	type: "string" | "number" | "boolean" | "null";
	value: string | number | boolean | null;
	raw: string;
}
