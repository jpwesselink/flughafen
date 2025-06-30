#!/usr/bin/env node

/**
 * Main CLI function
 */
export function cli(): void {
	console.log("@flughafen/cli - Coming soon!");
	console.log("For now, use the existing CLI from the flughafen package:");
	console.log("  npx flughafen synth <file>");
	console.log("  npx flughafen generate-types");
}

// Run the CLI (check if this file is being run directly)
// For CommonJS builds, check require.main
const isMainModule = typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;
// For ES module builds, we'll check if this file is being run directly
if (isMainModule) {
	cli();
}
