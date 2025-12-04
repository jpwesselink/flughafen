import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		includeSource: ["src/**/*.{js,ts}"],
		reporters: ["verbose"],
		environment: "node",
	},
	define: {
		"import.meta.vitest": "undefined",
	},
	esbuild: {
		target: "node18",
	},
});
