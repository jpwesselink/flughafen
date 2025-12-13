/**
 * Converts GitHub Actions expressions to expr() helper calls
 */
export class ExpressionConverter {
	/**
	 * Check if a string contains GitHub Actions expressions
	 */
	hasExpression(str: string): boolean {
		return /\$\{\{.*?\}\}/.test(str);
	}

	/**
	 * Convert a string with expressions to use expr() helper
	 *
	 * @example
	 * Input:  "${{ github.event.pull_request.number || github.ref }}"
	 * Output: "expr('github.event.pull_request.number || github.ref')"
	 *
	 * @example
	 * Input:  "Deploy to ${{ matrix.environment }}"
	 * Output: "`Deploy to ${expr('matrix.environment')}`"
	 */
	convertToExpr(str: string): string {
		if (!this.hasExpression(str)) {
			return JSON.stringify(str);
		}

		// Check if the entire string is just a single expression (no other text or multiple expressions)
		const trimmed = str.trim();
		if (trimmed.startsWith("${{") && trimmed.endsWith("}}")) {
			// Make sure it's actually a single expression by checking there are no other ${{ }} pairs inside
			const inner = trimmed.slice(3, -2);
			if (!inner.includes("${{") && !inner.includes("}}")) {
				return `expr(${JSON.stringify(inner.trim())})`;
			}
		}

		// String contains mixed content - use template literal
		const parts: string[] = [];
		let lastIndex = 0;
		const expressionPattern = /\$\{\{(.*?)\}\}/g;
		let match: RegExpExecArray | null = expressionPattern.exec(str);

		while (match !== null) {
			// Add text before the expression
			if (match.index > lastIndex) {
				parts.push(str.slice(lastIndex, match.index));
			}

			// Add the expression as ${expr(...)}
			const expression = match[1].trim();
			parts.push(`\${expr(${JSON.stringify(expression)})}`);

			lastIndex = match.index + match[0].length;
			match = expressionPattern.exec(str);
		}

		// Add remaining text
		if (lastIndex < str.length) {
			parts.push(str.slice(lastIndex));
		}

		// Build template literal
		return "`" + parts.join("") + "`";
	}

	/**
	 * Convert an object that may contain expressions
	 */
	convertObject(obj: unknown, indent = "\t"): string {
		if (typeof obj === "string") {
			if (this.hasExpression(obj)) {
				return this.convertToExpr(obj);
			}
			return JSON.stringify(obj);
		}

		if (typeof obj === "number" || typeof obj === "boolean" || obj === null) {
			return JSON.stringify(obj);
		}

		if (Array.isArray(obj)) {
			const items = obj.map((item) => this.convertObject(item, indent + "\t"));
			return `[\n${indent}\t${items.join(`,\n${indent}\t`)}\n${indent}]`;
		}

		if (typeof obj === "object" && obj !== null) {
			const entries = Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
				const convertedValue = this.convertObject(value, indent + "\t");
				return `${indent}\t"${key}": ${convertedValue}`;
			});
			return `{\n${entries.join(",\n")}\n${indent}}`;
		}

		return JSON.stringify(obj);
	}
}
