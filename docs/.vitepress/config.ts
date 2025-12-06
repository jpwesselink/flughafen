import { defineConfig } from "vitepress";
// import { withMermaid } from 'vitepress-plugin-mermaid';

export default defineConfig({
	title: "Flughafen",
	description: "Type-Safe GitHub Actions Workflow Builder for TypeScript",

	// Base URL for GitHub Pages
	base: "/flughafen/",

	// Output to dist directory
	outDir: "./dist",

	// Clean URLs
	cleanUrls: true,

	// Ignore dead links for now
	ignoreDeadLinks: true,

	// Vite configuration
	vite: {
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// Suppress 'Module level directives cause errors when bundled' warnings
					if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
						return;
					}
					warn(warning);
				},
			},
		},
	},

	// Theme configuration
	themeConfig: {
		logo: "🛫",

		nav: [
			{ text: "Home", link: "/" },
			{ text: "Validate", link: "/validation" },
			{ text: "Reverse", link: "/reverse-engineering-quick-start" },
			{ text: "API", link: "/api" },
		],

		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Quick Start", link: "/" },
					{ text: "Validation", link: "/validation" },
					{ text: "Reverse Engineering", link: "/reverse-engineering-quick-start" },
				],
			},
			{
				text: "Reference",
				items: [
					{ text: "API", link: "/api" },
					{ text: "Examples", link: "/examples" },
				],
			},
		],

		socialLinks: [{ icon: "github", link: "https://github.com/jpwesselink/flughafen" }],

		search: {
			provider: "local",
		},

		editLink: {
			pattern: "https://github.com/jpwesselink/flughafen/edit/main/docs/:path",
			text: "Edit this page on GitHub",
		},

		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © 2025-present Flughafen Contributors",
		},
	},

	// Markdown configuration
	markdown: {
		lineNumbers: true,
		theme: {
			light: "github-light",
			dark: "github-dark",
		},
	},

	// Mermaid configuration
	mermaid: {
		// Optional: add mermaid config here
	},

	// Disable Vue in markdown for api-reference directory
	vue: {
		template: {
			compilerOptions: {
				isCustomElement: (tag) => tag.startsWith("v-"),
			},
		},
	},

	// Head tags for SEO
	head: [
		["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
		["meta", { name: "theme-color", content: "#3c82f6" }],
		["meta", { name: "og:type", content: "website" }],
		["meta", { name: "og:title", content: "Flughafen - Type-Safe GitHub Actions" }],
		[
			"meta",
			{
				name: "og:description",
				content: "Build GitHub Actions workflows with full TypeScript type safety and IntelliSense support",
			},
		],
	],
});
