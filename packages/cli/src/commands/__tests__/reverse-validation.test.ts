import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReverseCliOptions } from "../reverse";
import { reverse } from "../reverse";

// Mock the core reverse module to avoid export issues during testing
vi.mock("@flughafen/core", () => ({
	reverse: {
		workflow: vi.fn(),
		github: vi.fn(),
		getSummary: vi.fn(),
	},
}));

describe("CLI Reverse Command Validation Options", () => {
	const testDir = join(process.cwd(), "test-validation-temp");
	const testFiles: string[] = [];

	const createTestFile = (filename: string, content: string): string => {
		const filePath = join(testDir, filename);
		writeFileSync(filePath, content);
		testFiles.push(filePath);
		return filePath;
	};

	beforeEach(() => {
		// Create test directory
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}

		// Reset mocks
		vi.clearAllMocks();

		// Suppress console output during tests
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		// Clean up test files
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		testFiles.length = 0;

		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}

		vi.restoreAllMocks();
	});

	describe("Validation Option Handling", () => {
		it("should pass validation options to core reverse.workflow", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			const workflowFile = createTestFile(
				"test.yml",
				`
name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`
			);

			const options: ReverseCliOptions = {
				target: workflowFile,
				skipYamlValidation: true,
				skipSchemaValidation: true,
				skipActionValidation: true,
				validateOnly: true,
				validationReport: true,
				strictValidation: true,
				silent: true,
			};

			await reverse(options);

			expect(mockReverse.workflow).toHaveBeenCalledWith(
				workflowFile,
				expect.objectContaining({
					skipYamlValidation: true,
					skipSchemaValidation: true,
					skipActionValidation: true,
					validateOnly: true,
					validationReport: true,
					strictValidation: true,
				})
			);
		});

		it("should pass validation options to core reverse.github", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.github as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			const options: ReverseCliOptions = {
				target: testDir,
				skipYamlValidation: false,
				skipSchemaValidation: false,
				skipActionValidation: false,
				validateOnly: false,
				validationReport: false,
				strictValidation: false,
				silent: true,
			};

			await reverse(options);

			expect(mockReverse.github).toHaveBeenCalledWith(
				testDir,
				expect.objectContaining({
					skipYamlValidation: false,
					skipSchemaValidation: false,
					skipActionValidation: false,
					validateOnly: false,
					validationReport: false,
					strictValidation: false,
				})
			);
		});
	});

	describe("Validation Error Handling", () => {
		it("should handle validation errors appropriately", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [
					{
						file: "test.yml",
						message: "Missing required field: runs-on",
						line: 5,
						column: 4,
						type: "validation",
					},
					{
						file: "test.yml",
						message: "Invalid YAML syntax",
						line: 2,
						column: 10,
						type: "yaml",
					},
				],
				warnings: ["Job has no steps defined"],
			});

			const workflowFile = createTestFile("test.yml", "invalid yaml content");

			const options: ReverseCliOptions = {
				target: workflowFile,
				validateOnly: true,
				silent: true,
			};

			await expect(reverse(options)).rejects.toThrow("Validation failed with 1 error(s)");
		});

		it("should handle strict validation mode", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			const mockResult = {
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: ["Job has no timeout defined", "Missing description"],
			};
			(mockReverse.workflow as any).mockResolvedValue(mockResult);

			const workflowFile = createTestFile("test.yml", "valid but with warnings");

			const options: ReverseCliOptions = {
				target: workflowFile,
				strictValidation: true,
				silent: true,
			};

			// Verify the mock is working correctly
			const mockCallResult = await mockReverse.workflow(workflowFile, options);
			expect(mockCallResult.warnings).toHaveLength(2);

			// The strict validation should throw when there are warnings
			await expect(reverse(options)).rejects.toThrow("Strict validation failed with 2 warning(s) treated as errors");
		});

		it("should not fail on warnings in normal mode", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: ["Job has no timeout defined"],
			});

			const workflowFile = createTestFile("test.yml", "valid with warnings");

			const options: ReverseCliOptions = {
				target: workflowFile,
				strictValidation: false,
				silent: true,
			};

			await expect(reverse(options)).resolves.not.toThrow();
		});
	});

	describe("Output Formatting", () => {
		it("should display validation success message in validate-only mode", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const workflowFile = createTestFile("test.yml", "valid yaml");

			const options: ReverseCliOptions = {
				target: workflowFile,
				validateOnly: true,
				silent: false,
			};

			await reverse(options);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[ok] Validation completed!"));
		});

		it("should display validation errors with file and line information", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [
					{
						file: "/path/to/test.yml",
						message: "Missing runs-on field",
						line: 8,
						column: 6,
						type: "validation",
					},
				],
				warnings: [],
			});

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const workflowFile = createTestFile("test.yml", "invalid yaml");

			const options: ReverseCliOptions = {
				target: workflowFile,
				silent: false,
				verbose: true,
			};

			try {
				await reverse(options);
			} catch (_error) {
				// Expected to throw
			}

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[!!] 1 validation error(s) found:"));
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("validation in test.yml (line 8, column 6): Missing runs-on field")
			);
		});

		it("should provide appropriate next steps in validate-only mode", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const workflowFile = createTestFile("test.yml", "valid yaml");

			const options: ReverseCliOptions = {
				target: workflowFile,
				validateOnly: true,
				silent: false,
			};

			await reverse(options);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("> Next Steps:"));
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Run without --validate-only to generate TypeScript files")
			);
		});

		it("should show fix instructions when validation fails", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [
					{
						file: "test.yml",
						message: "Invalid syntax",
						type: "validation",
					},
				],
				warnings: [],
			});

			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const workflowFile = createTestFile("test.yml", "invalid yaml");

			const options: ReverseCliOptions = {
				target: workflowFile,
				validateOnly: true,
				silent: false,
			};

			try {
				await reverse(options);
			} catch (_error) {
				// Expected to throw
			}

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("-> Fix validation errors before proceeding:"));
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Review the validation errors above"));
		});
	});

	describe("File Type Detection", () => {
		it("should detect workflow files correctly", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.workflow as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			const ymlFile = createTestFile("test.yml", "content");
			const yamlFile = createTestFile("test.yaml", "content");

			// Test .yml file
			await reverse({ target: ymlFile, silent: true });
			expect(mockReverse.workflow).toHaveBeenCalledWith(ymlFile, expect.any(Object));

			vi.clearAllMocks();

			// Test .yaml file
			await reverse({ target: yamlFile, silent: true });
			expect(mockReverse.workflow).toHaveBeenCalledWith(yamlFile, expect.any(Object));
		});

		it("should detect directories correctly", async () => {
			const { reverse: mockReverse } = await import("@flughafen/core");
			(mockReverse.github as any).mockResolvedValue({
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors: [],
				warnings: [],
			});

			await reverse({ target: testDir, silent: true });
			expect(mockReverse.github).toHaveBeenCalledWith(testDir, expect.any(Object));
		});

		it("should reject invalid file types", async () => {
			const txtFile = createTestFile("test.txt", "content");

			const options: ReverseCliOptions = {
				target: txtFile,
				silent: true,
			};

			await expect(reverse(options)).rejects.toThrow("Target must be a directory or a .yml/.yaml workflow file");
		});
	});
});
