import { ErrorCode, type ErrorContext } from "./error-codes";
import { FlughafenError } from "./FlughafenError";

export class ProcessingError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.WORKFLOW_PROCESSING_ERROR, context, suggestions, cause);
	}
}
