import type { JSONSchema7 } from "json-schema";
import type { FileContext } from "../classification/types";

/**
 * Handler for processing specific GitHub file types
 */
export interface Handler {
	/**
	 * JSON schema for validation (optional)
	 */
	schema?: JSONSchema7;

	/**
	 * Generate TypeScript code from parsed content
	 */
	emit(content: unknown, context: FileContext): string;

	/**
	 * Validate content against schema (optional custom validation)
	 */
	validate?(content: unknown): ValidationResult;
}

/**
 * Extended context for handlers
 */
export interface HandlerContext extends FileContext {
	/**
	 * Processing options
	 */
	options?: ProcessingOptions;

	/**
	 * Additional metadata
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Result from handler processing
 */
export interface HandlerResult {
	/**
	 * Generated TypeScript code
	 */
	code: string;

	/**
	 * Output file path (relative to output directory)
	 */
	outputPath: string;

	/**
	 * Any validation warnings
	 */
	warnings?: string[];

	/**
	 * Additional metadata
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
	path: string;
	message: string;
	code?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
	path: string;
	message: string;
	code?: string;
}

/**
 * Processing options for handlers
 */
export interface ProcessingOptions {
	/**
	 * Skip validation
	 */
	skipValidation?: boolean;

	/**
	 * Generate only types, no implementation
	 */
	typesOnly?: boolean;

	/**
	 * Original filename for reference
	 */
	originalFilename?: string;

	/**
	 * Custom output directory
	 */
	outputDir?: string;
}
