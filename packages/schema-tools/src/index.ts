/**
 * @flughafen/schema-tools
 *
 * Internal tooling for fetching GitHub Actions schemas and generating TypeScript types.
 * This package is used by maintainers to keep the Flughafen type system up to date.
 */

export { fetchAllSchemas, fetchSchema } from "./fetch-schemas";
export { generateSchemaDefaults, generateTypes } from "./generate-types";
