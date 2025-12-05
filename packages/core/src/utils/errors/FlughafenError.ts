import type { ErrorCode, ErrorContext } from "./error-codes";

export abstract class FlughafenError extends Error {
	readonly code: ErrorCode;
	readonly context?: ErrorContext;
	readonly suggestions?: string[];
	readonly cause?: Error;

	constructor(message: string, code: ErrorCode, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.context = context;
		this.suggestions = suggestions;
		this.cause = cause;

		// Maintains proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	toString(): string {
		let result = `${this.name}: ${this.message}`;

		if (this.context && Object.keys(this.context).length > 0) {
			result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
		}

		if (this.suggestions && this.suggestions.length > 0) {
			result += `\nSuggestions:\n${this.suggestions.map((s) => `  - ${s}`).join("\n")}`;
		}

		return result;
	}
}
