import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { parse } from "yaml";

interface YamlValidationResult {
	valid: boolean;
	errors?: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validation utilities for GitHub Actions workflows and actions
 */

/**
 * Validate a workflow YAML string against the GitHub Actions schema
 */
export function validateWorkflowYAML(yamlContent: string): YamlValidationResult {
	try {
		// Parse YAML to JSON
		const config = parse(yamlContent);

		// Load the workflow schema
		const schemaPath = join(__dirname, "..", "..", "schemas", "github-workflow.schema.json");
		const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
		const ajv = new Ajv({
			allErrors: true,
			strictRequired: false,
			strictTypes: false,
			strictTuples: false,
			allowUnionTypes: true,
		});

		const validate = ajv.compile(schema);
		const valid = validate(config);

		if (!valid) {
			return {
				valid: false,
				errors: validate.errors?.map((err) => `${err.instancePath || "root"}: ${err.message}`) || [
					"Unknown validation error",
				],
			};
		}

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			errors: [`YAML parsing error: ${(error as Error).message}`],
		};
	}
}

/**
 * Validate a local action YAML string
 * Note: This performs basic structural validation since there's no official JSON schema
 */
export function validateActionYAML(yamlContent: string): YamlValidationResult {
	try {
		// Parse YAML to JSON
		const config = parse(yamlContent);

		// Basic validation for required action.yml fields
		const errors: string[] = [];

		if (!config || typeof config !== "object") {
			errors.push("Action configuration must be an object");
			return { valid: false, errors };
		}

		// Required fields
		if (!config.name || typeof config.name !== "string") {
			errors.push('Action must have a "name" field (string)');
		}

		if (!config.description || typeof config.description !== "string") {
			errors.push('Action must have a "description" field (string)');
		}

		if (!config.runs || typeof config.runs !== "object") {
			errors.push('Action must have a "runs" field (object)');
		} else {
			const runs = config.runs as Record<string, unknown>;

			if (!runs.using || typeof runs.using !== "string") {
				errors.push('Action runs must specify "using" field (string)');
			} else {
				const using = runs.using;

				// Validate based on action type
				if (using === "node24" || using === "node20" || using === "node16" || using === "node12") {
					if (!runs.main || typeof runs.main !== "string") {
						errors.push(`JavaScript action (${using}) must specify "main" entry point`);
					}
				} else if (using === "composite") {
					if (!runs.steps || !Array.isArray(runs.steps)) {
						errors.push('Composite action must specify "steps" array');
					}
				} else if (using === "docker") {
					if (!runs.image || typeof runs.image !== "string") {
						errors.push('Docker action must specify "image" field');
					}
				} else {
					errors.push(`Unknown action type: ${using}. Must be node24, node20, node16, node12, composite, or docker`);
				}
			}
		}

		// Optional fields validation
		if (config.inputs && typeof config.inputs !== "object") {
			errors.push('Action "inputs" field must be an object');
		}

		if (config.outputs && typeof config.outputs !== "object") {
			errors.push('Action "outputs" field must be an object');
		}

		if (config.branding && typeof config.branding !== "object") {
			errors.push('Action "branding" field must be an object');
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	} catch (error) {
		return {
			valid: false,
			errors: [`YAML parsing error: ${(error as Error).message}`],
		};
	}
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: YamlValidationResult, type: "workflow" | "action" = "workflow"): string {
	if (result.valid) {
		return `✅ ${type} validation passed`;
	}

	const errorList = result.errors?.map((err) => `  • ${err}`).join("\n") || "  • Unknown error";
	return `❌ ${type} validation failed:\n${errorList}`;
}
