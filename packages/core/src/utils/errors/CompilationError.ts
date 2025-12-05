import { ErrorCode, type ErrorContext } from "./error-codes";
import { FlughafenError } from "./FlughafenError";

export class CompilationError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.TYPESCRIPT_COMPILATION_ERROR, context, suggestions, cause);
	}
}
