/**
 * Utilities domain
 *
 * This module provides general-purpose utility functions.
 * For workflow processing utilities, see the processing domain.
 */

// Schema-based defaults (auto-generated)
export * from "../../generated/types/schema-defaults";
// Error utilities
export * from "./errors";
// Property name mapping utilities
export * from "./property-mapper";
// String utilities
export * from "./string";

// Re-export types
export type * from "./types";

/**
 * Helper function for GitHub Actions expressions in template literals
 * Converts 'steps.deploy.outputs.deployment-url' to '${{ steps.deploy.outputs.deployment-url }}'
 *
 * @example
 * `echo "URL: ${expr('steps.deploy.outputs.deployment-url')}"`
 * // becomes: echo "URL: ${{ steps.deploy.outputs.deployment-url }}"
 */
export function expr(expression: string): string {
	return `\${{ ${expression} }}`;
}

/**
 * Shorter alias for expr()
 */
export const $ = expr;
