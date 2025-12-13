import type { Options } from "tsup";

export const tsup: Options = {
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: true,
	format: ["esm"],

	entryPoints: {
		index: "src/index.ts",
	},

	// Externalize esbuild and typescript for CLI to avoid bundling issues
	external: ["esbuild", "typescript"],

	// Copy schemas and generated files after build
	onSuccess: async () => {
		const { execSync } = await import("child_process");
		execSync("cp -r schemas dist/ 2>/dev/null || true", { stdio: "ignore" });
		execSync("cp -r generated dist/ 2>/dev/null || true", { stdio: "ignore" });
	},

	define: {
		"import.meta.vitest": "undefined",
	},
};
