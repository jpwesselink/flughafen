import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"fetch-schemas": "src/fetch-schemas.ts",
		"generate-types": "src/generate-types.ts",
		"cli-fetch-schemas": "src/cli-fetch-schemas.ts",
		"cli-generate-types": "src/cli-generate-types.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	minify: false,
	shims: true,
});
