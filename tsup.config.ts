import type { Options } from "tsup";

export const tsup: Options = {
	splitting: true,
	sourcemap: true,
	clean: true,
	dts: true,
	format: ["cjs", "esm"],

	entryPoints: ["src/index.ts", "src/cli/watch.ts"],
	define: {
		"import.meta.vitest": "undefined",
	},
};
