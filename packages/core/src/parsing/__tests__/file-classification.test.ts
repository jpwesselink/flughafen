import { describe, expect, it } from "vitest";
import { FileClassifier, type FileContext } from "../file-classification";

describe("FileClassifier", () => {
	const classifier = new FileClassifier();

	function createContext(path: string, content: unknown): FileContext {
		return classifier.createFileContext(path, content);
	}

	describe("Path-based classification", () => {
		it("should identify GitHub workflows by path", () => {
			const context = createContext(".github/workflows/ci.yml", {
				name: "CI",
				on: "push",
				jobs: { test: { "runs-on": "ubuntu-latest" } },
			});

			expect(classifier.classify(context)).toBe("gha-workflow");
		});

		it("should identify issue templates by path", () => {
			const context = createContext(".github/ISSUE_TEMPLATE/bug.yml", {
				name: "Bug Report",
				body: [],
			});

			expect(classifier.classify(context)).toBe("issue-template");
		});

		it("should identify actions in .github/actions/{name}/ by path", () => {
			const context = createContext(".github/actions/my-action/action.yml", {
				name: "My Custom Action",
				description: "Does custom things",
				runs: { using: "composite", steps: [] },
			});

			expect(classifier.classify(context)).toBe("gha-action");
		});

		it("should identify actions in .github/actions/{name}/ with yaml extension", () => {
			const context = createContext(".github/actions/setup-env/action.yaml", {
				name: "Setup Environment",
				runs: { using: "node20", main: "index.js" },
			});

			expect(classifier.classify(context)).toBe("gha-action");
		});
	});

	describe("Basename exact matching", () => {
		it("should identify FUNDING.yml files", () => {
			const context = createContext(".github/FUNDING.yml", {
				github: "sponsor",
				patreon: "creator",
			});

			expect(classifier.classify(context)).toBe("funding");
		});

		it("should identify dependabot.yml files", () => {
			const context = createContext(".github/dependabot.yml", {
				version: 2,
				updates: [],
			});

			expect(classifier.classify(context)).toBe("dependabot");
		});

		it("should identify action.yml files", () => {
			const context = createContext("action.yml", {
				name: "My Action",
				runs: { using: "composite", steps: [] },
			});

			expect(classifier.classify(context)).toBe("gha-action");
		});

		it("should identify CONTRIBUTING.md files", () => {
			const context = createContext("CONTRIBUTING.md", {
				markdown: "# Contributing Guide",
			});

			expect(classifier.classify(context)).toBe("contributing");
		});

		it("should identify CODE_OF_CONDUCT.md files", () => {
			const context = createContext("CODE_OF_CONDUCT.md", {
				markdown: "# Code of Conduct",
			});

			expect(classifier.classify(context)).toBe("code-of-conduct");
		});

		it("should identify SECURITY.md files", () => {
			const context = createContext("SECURITY.md", {
				markdown: "# Security Policy",
			});

			expect(classifier.classify(context)).toBe("security");
		});

		it("should identify CITATION.cff files", () => {
			const context = createContext("CITATION.cff", {
				"cff-version": "1.2.0",
				title: "My Software",
			});

			expect(classifier.classify(context)).toBe("citation");
		});
	});

	describe("Path-based classification for templates", () => {
		it("should identify discussion templates by path", () => {
			const context = createContext(".github/DISCUSSION_TEMPLATE/ideas.yml", {
				title: "Ideas",
				body: [],
			});

			expect(classifier.classify(context)).toBe("discussion-template");
		});
	});

	describe("Schema-based fallback", () => {
		it("should identify workflows by schema when path is ambiguous", () => {
			const context = createContext("some/random/workflow.yml", {
				name: "Random Workflow",
				on: { push: { branches: ["main"] } },
				jobs: {
					build: {
						"runs-on": "ubuntu-latest",
						steps: [{ uses: "actions/checkout@v4" }],
					},
				},
			});

			expect(classifier.classify(context)).toBe("gha-workflow");
		});

		it("should identify actions by schema when not in standard location", () => {
			const context = createContext("scripts/custom-action.yml", {
				name: "Custom Action",
				description: "Does something",
				runs: {
					using: "node20",
					main: "index.js",
				},
			});

			expect(classifier.classify(context)).toBe("gha-action");
		});

		it("should identify funding by schema when path is ambiguous", () => {
			const context = createContext("some/path/funding.yml", {
				github: "sponsor",
				patreon: "creator",
			});

			expect(classifier.classify(context)).toBe("funding");
		});
	});

	describe("Intersection logic", () => {
		it("should handle definitive path + basename match", () => {
			// Both path and basename point to same type
			const context = createContext(".github/FUNDING.yml", {
				github: "sponsor",
			});

			expect(classifier.classify(context)).toBe("funding");
		});

		it("should handle ambiguous schema matches", () => {
			// File could be multiple things based on schema alone
			const context = createContext("weird/location.yml", {
				name: "Something",
				// Could match multiple schemas
			});

			const result = classifier.classify(context);
			// Should return 'unknown' or the best guess
			expect(["unknown", "gha-action", "gha-workflow"].includes(result)).toBe(true);
		});
	});

	describe("Edge cases", () => {
		it("should return unknown for unrecognizable files", () => {
			const context = createContext("random.yml", {
				someField: "someValue",
			});

			expect(classifier.classify(context)).toBe("unknown");
		});

		it("should handle empty content", () => {
			const context = createContext("empty.yml", {});

			expect(classifier.classify(context)).toBe("unknown");
		});

		it("should handle null content", () => {
			const context = createContext("null.yml", null);

			expect(classifier.classify(context)).toBe("unknown");
		});

		it("should handle non-object content", () => {
			const context = createContext("string.yml", "just a string");

			expect(classifier.classify(context)).toBe("unknown");
		});
	});

	describe("File context creation", () => {
		it("should create proper context from path", () => {
			const context = classifier.createFileContext(".github/workflows/ci.yml", { content: true });

			expect(context.path).toBe(".github/workflows/ci.yml");
			expect(context.basename).toBe("ci.yml");
			expect(context.ext).toBe(".yml");
			expect(context.dir).toBe(".github/workflows");
			expect(context.content).toEqual({ content: true });
		});

		it("should handle root level files", () => {
			const context = classifier.createFileContext("package.json", {});

			expect(context.path).toBe("package.json");
			expect(context.basename).toBe("package.json");
			expect(context.ext).toBe(".json");
			expect(context.dir).toBe(".");
		});
	});
});
