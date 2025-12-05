/**
 * Property Name Mapper
 *
 * Utilities for converting between camelCase (TypeScript style) and kebab-case (GitHub Actions style)
 * property names. This allows users to write idiomatic TypeScript with camelCase properties
 * while maintaining compatibility with GitHub Actions' kebab-case convention.
 */

/**
 * Convert camelCase to kebab-case
 * @example camelToKebab('nodeVersion') // 'node-version'
 */
function camelToKebab(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Convert kebab-case to camelCase
 * @example kebabToCamel('node-version') // 'nodeVersion'
 */
export function kebabToCamel(str: string): string {
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalizes an object's keys to kebab-case (GitHub Actions format)
 * Used when outputting to YAML or building final configuration.
 *
 * Supports both camelCase and kebab-case input for backward compatibility.
 *
 * @example
 * normalizeToKebabCase({ nodeVersion: '20', cache: 'npm' })
 * // { 'node-version': '20', cache: 'npm' }
 *
 * @example
 * normalizeToKebabCase({ 'node-version': '20' }) // Already kebab - unchanged
 * // { 'node-version': '20' }
 */
export function normalizeToKebabCase<T extends Record<string, any>>(obj: T): Record<string, any> {
	if (!obj || typeof obj !== "object") {
		return obj;
	}

	const normalized: Record<string, any> = {};

	for (const [key, value] of Object.entries(obj)) {
		// Skip if already kebab-case
		if (key.includes("-")) {
			normalized[key] = value;
		} else if (key.includes("_")) {
			// Preserve SCREAMING_SNAKE_CASE or snake_case (workflow inputs, etc.)
			normalized[key] = value;
		} else if (/[A-Z]/.test(key)) {
			// Convert camelCase to kebab-case
			normalized[camelToKebab(key)] = value;
		} else {
			// All lowercase or already normalized, keep as-is
			normalized[key] = value;
		}
	}

	return normalized;
}

/**
 * Normalizes an object's keys to camelCase (TypeScript format)
 * Used in reverse engineering when converting YAML → TypeScript.
 *
 * @example
 * normalizeToCamelCase({ 'node-version': '20', 'ssh-key': 'key' })
 * // { nodeVersion: '20', sshKey: 'key' }
 */
export function normalizeToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
	if (!obj || typeof obj !== "object") {
		return obj;
	}

	const normalized: Record<string, any> = {};

	for (const [key, value] of Object.entries(obj)) {
		// Convert kebab-case to camelCase
		const camelKey = kebabToCamel(key);
		normalized[camelKey] = value;
	}

	return normalized;
}

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("kebabToCamel", () => {
		it("should convert kebab-case to camelCase", () => {
			expect(kebabToCamel("node-version")).toBe("nodeVersion");
			expect(kebabToCamel("ssh-key")).toBe("sshKey");
			expect(kebabToCamel("persist-credentials")).toBe("persistCredentials");
		});

		it("should handle already camelCase strings", () => {
			expect(kebabToCamel("nodeVersion")).toBe("nodeVersion");
			expect(kebabToCamel("cache")).toBe("cache");
		});

		it("should handle multiple dashes", () => {
			expect(kebabToCamel("ssh-known-hosts")).toBe("sshKnownHosts");
			expect(kebabToCamel("very-long-property-name")).toBe("veryLongPropertyName");
		});
	});

	describe("normalizeToKebabCase", () => {
		it("should convert camelCase to kebab-case", () => {
			const input = { nodeVersion: "20", sshKey: "key", cache: "npm" };
			const expected = { "node-version": "20", "ssh-key": "key", cache: "npm" };
			expect(normalizeToKebabCase(input)).toEqual(expected);
		});

		it("should preserve already kebab-case keys", () => {
			const input = { "node-version": "20", "ssh-key": "key" };
			expect(normalizeToKebabCase(input)).toEqual(input);
		});

		it("should handle mixed format (backward compatibility)", () => {
			const input = { nodeVersion: "20", "ssh-key": "key", cache: "npm" };
			const expected = { "node-version": "20", "ssh-key": "key", cache: "npm" };
			expect(normalizeToKebabCase(input)).toEqual(expected);
		});

		it("should handle empty object", () => {
			expect(normalizeToKebabCase({})).toEqual({});
		});

		it("should preserve all-lowercase keys", () => {
			const input = { cache: "npm", token: "secret" };
			expect(normalizeToKebabCase(input)).toEqual(input);
		});
	});

	describe("normalizeToCamelCase", () => {
		it("should convert kebab-case to camelCase", () => {
			const input = { "node-version": "20", "ssh-key": "key", cache: "npm" };
			const expected = { nodeVersion: "20", sshKey: "key", cache: "npm" };
			expect(normalizeToCamelCase(input)).toEqual(expected);
		});

		it("should handle all-lowercase keys", () => {
			const input = { cache: "npm", token: "secret" };
			const expected = { cache: "npm", token: "secret" };
			expect(normalizeToCamelCase(input)).toEqual(expected);
		});

		it("should convert multiple dash segments", () => {
			const input = { "ssh-known-hosts": "hosts", "persist-credentials": true };
			const expected = { sshKnownHosts: "hosts", persistCredentials: true };
			expect(normalizeToCamelCase(input)).toEqual(expected);
		});

		it("should handle empty object", () => {
			expect(normalizeToCamelCase({})).toEqual({});
		});
	});

	describe("roundtrip conversion", () => {
		it("should survive camelCase → kebab-case → camelCase", () => {
			const original = { nodeVersion: "20", sshKey: "key", cache: "npm" };
			const kebab = normalizeToKebabCase(original);
			const backToCamel = normalizeToCamelCase(kebab);
			expect(backToCamel).toEqual(original);
		});

		it("should survive kebab-case → camelCase → kebab-case", () => {
			const original = { "node-version": "20", "ssh-key": "key", cache: "npm" };
			const camel = normalizeToCamelCase(original);
			const backToKebab = normalizeToKebabCase(camel);
			expect(backToKebab).toEqual(original);
		});
	});
}
