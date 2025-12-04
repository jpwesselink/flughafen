import { createHash } from "node:crypto";
import * as yaml from "yaml";
import { normalizeWorkflowBySchema } from "./schema-normalizer.js";

/**
 * Normalize a YAML workflow for comparison
 * Converts YAML → JSON → schema normalization → sorted → stringified
 */
export function normalizeYaml(yamlContent: string): string {
	// Parse YAML to object
	const obj = yaml.parse(yamlContent);

	// Apply schema-driven normalization
	const schemaNormalized = normalizeWorkflowBySchema(obj);

	// Convert to JSON and recursively sort keys
	const normalized = sortKeysRecursive(schemaNormalized);

	// Return stringified JSON (deterministic)
	return JSON.stringify(normalized, null, 2);
}

/**
 * Normalize whitespace inside GitHub Actions expressions
 * e.g., "${{ matrix.os  }}" → "${{ matrix.os }}"
 */
function normalizeExpressionWhitespace(value: string): string {
	return value.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_match, content) => {
		// Normalize internal whitespace to single spaces
		const normalized = content.trim().replace(/\s+/g, " ");
		return `\${{ ${normalized} }}`;
	});
}

/**
 * Recursively sort object keys for deterministic comparison
 * Also normalizes expression whitespace for semantic equivalence
 */
function sortKeysRecursive(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sortKeysRecursive);
	}

	if (typeof obj === "object") {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
			sorted[key] = sortKeysRecursive((obj as Record<string, unknown>)[key]);
		}
		return sorted;
	}

	// Normalize expression whitespace in strings
	if (typeof obj === "string" && obj.includes("${{")) {
		return normalizeExpressionWhitespace(obj);
	}

	return obj;
}

/**
 * Hash normalized YAML content for comparison
 */
export function hashYaml(yamlContent: string): string {
	const normalized = normalizeYaml(yamlContent);
	return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Compare two YAML files for semantic equivalence
 */
export function compareYaml(
	yaml1: string,
	yaml2: string
): {
	equivalent: boolean;
	hash1: string;
	hash2: string;
	normalized1?: string;
	normalized2?: string;
} {
	const hash1 = hashYaml(yaml1);
	const hash2 = hashYaml(yaml2);

	return {
		equivalent: hash1 === hash2,
		hash1,
		hash2,
		normalized1: hash1 !== hash2 ? normalizeYaml(yaml1) : undefined,
		normalized2: hash1 !== hash2 ? normalizeYaml(yaml2) : undefined,
	};
}

export interface RoundtripValidationResult {
	success: boolean;
	originalHash: string;
	rebuiltHash: string;
	diff?: {
		normalized1: string;
		normalized2: string;
	};
	error?: string;
}
