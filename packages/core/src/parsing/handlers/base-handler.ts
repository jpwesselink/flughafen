import type { FileContext } from "../classification/types";
import type { Handler, ValidationError, ValidationResult, ValidationWarning } from "./types";

/**
 * Abstract base class for all handlers
 * Provides common functionality and enforces interface
 */
export abstract class BaseHandler implements Handler {
	/**
	 * JSON schema for validation (override in subclasses)
	 */
	abstract schema?: import("json-schema").JSONSchema7;

	/**
	 * Generate TypeScript code from content (implement in subclasses)
	 */
	abstract emit(content: unknown, context: FileContext): string;

	/**
	 * Validate content against schema
	 */
	validate(content: unknown): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Basic validation
		if (content === null || content === undefined) {
			errors.push({
				path: "",
				message: "Content cannot be null or undefined",
				code: "CONTENT_NULL",
			});
		}

		if (typeof content !== "object") {
			errors.push({
				path: "",
				message: "Content must be an object",
				code: "CONTENT_NOT_OBJECT",
			});
		}

		// Schema validation would be implemented here with AJV
		// For now, just basic checks

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Utility to convert string to camelCase
	 */
	protected toCamelCase(str: string): string {
		return str
			.replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
			.replace(/^[A-Z]/, (char) => char.toLowerCase());
	}

	/**
	 * Utility to convert string to PascalCase
	 */
	protected toPascalCase(str: string): string {
		return str
			.replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
			.replace(/^[a-z]/, (char) => char.toUpperCase());
	}

	/**
	 * Utility to sanitize identifier names
	 */
	protected sanitizeIdentifier(str: string): string {
		return str
			.replace(/[^a-zA-Z0-9_]/g, "_")
			.replace(/^[0-9]/, "_$&")
			.replace(/_+/g, "_")
			.replace(/^_|_$/g, "");
	}

	/**
	 * Generate import statements
	 */
	protected generateImports(imports: string[]): string {
		if (imports.length === 0) return "";

		return imports.map((imp) => `import ${imp};`).join("\n") + "\n\n";
	}

	/**
	 * Generate JSDoc comment
	 */
	protected generateJSDoc(description?: string, tags?: Record<string, string>): string {
		if (!description && !tags) return "";

		const lines = ["/**"];

		if (description) {
			lines.push(` * ${description}`);
		}

		if (tags) {
			if (description) lines.push(" *");
			Object.entries(tags).forEach(([tag, value]) => {
				lines.push(` * @${tag} ${value}`);
			});
		}

		lines.push(" */");
		return lines.join("\n") + "\n";
	}
}
