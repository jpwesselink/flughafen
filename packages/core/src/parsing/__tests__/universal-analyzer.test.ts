import { beforeEach, describe, expect, it } from "vitest";
import { ActionParser, createUniversalAnalyzer, FundingParser, UniversalYamlAnalyzer, WorkflowParser } from "../index";

describe("UniversalYamlAnalyzer", () => {
	let analyzer: UniversalYamlAnalyzer;

	beforeEach(() => {
		analyzer = new UniversalYamlAnalyzer();
	});

	describe("Parser Registration", () => {
		it("should register and list parsers", () => {
			const fundingParser = new FundingParser();
			const workflowParser = new WorkflowParser();

			analyzer.registerParser("funding", fundingParser);
			analyzer.registerParser("workflow", workflowParser);

			const registered = analyzer.getRegisteredParsers();
			expect(registered).toContain("funding");
			expect(registered).toContain("workflow");
		});

		it("should unregister parsers", () => {
			const fundingParser = new FundingParser();
			analyzer.registerParser("funding", fundingParser);

			expect(analyzer.unregisterParser("funding")).toBe(true);
			expect(analyzer.getRegisteredParsers()).not.toContain("funding");
		});

		it("should get specific parsers", () => {
			const fundingParser = new FundingParser();
			analyzer.registerParser("funding", fundingParser);

			const retrieved = analyzer.getParser("funding");
			expect(retrieved).toBe(fundingParser);
			expect(analyzer.getParser("nonexistent")).toBeUndefined();
		});
	});

	describe("File Detection", () => {
		beforeEach(() => {
			analyzer.registerParser("funding", new FundingParser());
			analyzer.registerParser("workflow", new WorkflowParser());
			analyzer.registerParser("action", new ActionParser());
		});

		it("should detect FUNDING.yml files", () => {
			expect(analyzer.canHandle(".github/FUNDING.yml")).toBe(true);
			expect(analyzer.canHandle("FUNDING.yml")).toBe(true);
			expect(analyzer.canHandle("funding.yml")).toBe(true);
		});

		it("should detect workflow files", () => {
			expect(analyzer.canHandle(".github/workflows/ci.yml")).toBe(true);
			expect(analyzer.canHandle(".github/workflows/deploy.yaml")).toBe(true);
		});

		it("should detect action files", () => {
			expect(analyzer.canHandle("action.yml")).toBe(true);
			expect(analyzer.canHandle("./action.yaml")).toBe(true);
			expect(analyzer.canHandle("my-action/action.yml")).toBe(true);
		});

		it("should not detect unsupported files", () => {
			expect(analyzer.canHandle("package.json")).toBe(false);
			expect(analyzer.canHandle("README.md")).toBe(false);
		});

		it("should find compatible parsers", () => {
			const fundingCompatible = analyzer.getCompatibleParsers(".github/FUNDING.yml");
			expect(fundingCompatible).toEqual(["funding"]);

			const workflowCompatible = analyzer.getCompatibleParsers(".github/workflows/test.yml");
			expect(workflowCompatible).toEqual(["workflow"]);
		});
	});

	describe("Content Analysis", () => {
		beforeEach(() => {
			analyzer.registerParser("funding", new FundingParser());
			analyzer.registerParser("workflow", new WorkflowParser());
			analyzer.registerParser("action", new ActionParser());
		});

		it("should analyze FUNDING.yml content", () => {
			const fundingYaml = `github: octocat
patreon: creator
custom: https://example.com/donate`;

			const result = analyzer.analyzeContent(fundingYaml, ".github/FUNDING.yml");

			expect(result.parser).toBe("funding");
			expect(result.type).toBe("funding");
			expect(result.data.config.github).toBe("octocat");
			expect(result.data.platforms).toContain("github");
			expect(result.data.platforms).toContain("patreon");
		});

		it("should analyze workflow content", () => {
			const workflowYaml = `name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`;

			const result = analyzer.analyzeContent(workflowYaml, ".github/workflows/ci.yml");

			expect(result.parser).toBe("workflow");
			expect(result.type).toBe("workflow");
			expect(result.data.name).toBe("CI");
			expect(result.data.triggers).toContain("push");
			expect(result.data.jobCount).toBe(1);
		});

		it("should analyze action content", () => {
			const actionYaml = `name: Test Action
description: A test action
runs:
  using: composite
  steps:
    - run: echo "Hello World"
inputs:
  message:
    description: Message to display
    required: true`;

			const result = analyzer.analyzeContent(actionYaml, "action.yml");

			expect(result.parser).toBe("action");
			expect(result.type).toBe("action");
			expect(result.data.name).toBe("Test Action");
			expect(result.data.actionType).toBe("composite");
			expect(result.data.hasInputs).toBe(true);
			expect(result.data.inputCount).toBe(1);
		});
	});

	describe("TypeScript Generation", () => {
		beforeEach(() => {
			analyzer.registerParser("funding", new FundingParser());
		});

		it("should generate TypeScript code", () => {
			const config = {
				github: "octocat",
				patreon: "creator",
			};

			const typescript = analyzer.generateTypeScript("funding", config);

			expect(typescript).toContain('import { createFunding } from "@flughafen/core"');
			expect(typescript).toContain('.github("octocat")');
			expect(typescript).toContain('.patreon("creator")');
			expect(typescript).toContain(".build()");
		});

		it("should throw error for unknown parser", () => {
			expect(() => {
				analyzer.generateTypeScript("unknown", {});
			}).toThrow("Parser 'unknown' not found");
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			analyzer.registerParser("funding", new FundingParser());
		});

		it("should throw error for unsupported files", () => {
			expect(() => {
				analyzer.analyzeContent("content", "unsupported.txt");
			}).toThrow("No parser found for file: unsupported.txt");
		});

		it("should handle invalid YAML", () => {
			const invalidYaml = `github: octocat
invalid: [unclosed bracket`;

			expect(() => {
				analyzer.analyzeContent(invalidYaml, ".github/FUNDING.yml");
			}).toThrow("YAML parsing errors");
		});
	});
});

describe("createUniversalAnalyzer", () => {
	it("should create pre-configured analyzer", () => {
		const analyzer = createUniversalAnalyzer();

		const parsers = analyzer.getRegisteredParsers();
		expect(parsers).toContain("funding");
		expect(parsers).toContain("workflow");
		expect(parsers).toContain("action");
	});

	it("should handle all supported file types", () => {
		const analyzer = createUniversalAnalyzer();

		expect(analyzer.canHandle(".github/FUNDING.yml")).toBe(true);
		expect(analyzer.canHandle(".github/workflows/ci.yml")).toBe(true);
		expect(analyzer.canHandle("action.yml")).toBe(true);
	});
});
