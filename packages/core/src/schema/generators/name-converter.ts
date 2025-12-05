/**
 * Utility functions for converting action names to TypeScript-friendly names
 */

/**
 * Generate interface name from action name
 * @example "actions/checkout@v4" -> "ActionsCheckoutV4Inputs"
 */
export function generateInterfaceName(actionName: string): string {
	// Convert action name to PascalCase interface name
	const cleaned = actionName
		.replace(/[@/\-.]/g, " ") // Replace separators with spaces
		.replace(/\s+/g, " ") // Normalize spaces
		.trim();

	const pascalCase = cleaned
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");

	return `${pascalCase}Inputs`;
}

/**
 * Generate interface name from local action name
 * @example "docker-build" -> "DockerBuildInputs"
 */
export function generateLocalActionInterfaceName(actionName: string): string {
	// Convert action name to PascalCase interface name
	const cleaned = actionName
		.replace(/[@/\-.]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	const pascalCase = cleaned
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");

	return `${pascalCase}Inputs`;
}

/**
 * Sanitize property name for TypeScript
 * Converts kebab-case to camelCase for idiomatic TypeScript
 * @example "fetch-depth" -> "fetchDepth"
 */
export function sanitizePropertyName(name: string): string {
	// Convert kebab-case to camelCase
	const camelCase = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

	// Check if it's a valid identifier
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(camelCase)) {
		return camelCase;
	}

	// Fallback to quoted original name for truly unusual names
	return `'${name}'`;
}

/**
 * Convert action name to camelCase method name
 * @example "actions/checkout@v4" -> "Checkout"
 */
export function actionToMethodName(actionName: string): string {
	const parts = actionName.split("/");
	if (parts.length < 2) return actionName;

	const owner = parts[0];
	const name = parts[1].split("@")[0]; // Remove version

	// Handle special cases for common actions
	if (owner === "actions") {
		switch (name) {
			case "checkout":
				return "Checkout";
			case "setup-node":
				return "SetupNode";
			case "setup-python":
				return "SetupPython";
			case "upload-artifact":
				return "UploadArtifact";
			case "download-artifact":
				return "DownloadArtifact";
			case "cache":
				return "Cache";
			default:
				return toPascalCase(name);
		}
	}

	// For other owners, use owner + name
	return toPascalCase(owner) + toPascalCase(name);
}

/**
 * Convert kebab-case to PascalCase
 * @example "setup-node" -> "SetupNode"
 */
export function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");
}

/**
 * Wrap text to specified width
 */
export function wrapText(text: string, width: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		if (currentLine.length + word.length + 1 <= width) {
			currentLine += (currentLine ? " " : "") + word;
		} else {
			if (currentLine) {
				lines.push(currentLine);
			}
			currentLine = word;
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.length > 0 ? lines : [""];
}
