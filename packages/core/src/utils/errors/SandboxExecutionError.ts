import { ErrorCode, type ErrorContext } from "./error-codes";
import { FlughafenError } from "./FlughafenError";

export class SandboxExecutionError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.SANDBOX_EXECUTION_ERROR, context, suggestions, cause);
	}
}
