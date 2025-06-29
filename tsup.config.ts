import type { Options } from "tsup";

export const tsup: Options = {
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: true,
	format: ["cjs", "esm"],

	entryPoints: {
		index: "src/index.ts",
		"cli/cli": "src/cli/cli.ts",
	},

	// Externalize esbuild for CLI to avoid bundling issues
	external: ["esbuild"],

	define: {
		"import.meta.vitest": "undefined",
	},
};
