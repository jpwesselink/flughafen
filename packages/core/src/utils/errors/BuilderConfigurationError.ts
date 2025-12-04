import { ErrorCode, type ErrorContext } from "./error-codes";
import { FlughafenError } from "./FlughafenError";

export class BuilderConfigurationError extends FlughafenError {
	constructor(message: string, context?: ErrorContext, suggestions?: string[], cause?: Error) {
		super(message, ErrorCode.BUILDER_CONFIGURATION_ERROR, context, suggestions, cause);
	}
}
