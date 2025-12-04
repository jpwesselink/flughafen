import { ErrorCode, type ErrorContext } from "./error-codes";
import { FlughafenError } from "./FlughafenError";

export class NetworkError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.NETWORK_ERROR, context, suggestions, cause);
	}
}
