import type { Options } from "tsup";

export const tsup: Options = {
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: true,
	format: ["cjs", "esm"],

	entryPoints: {
		index: "src/index.ts",
	},

	// Externalize esbuild and typescript for CLI to avoid bundling issues
	external: ["esbuild", "typescript"],

	define: {
		"import.meta.vitest": "undefined",
	},
};
