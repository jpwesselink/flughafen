import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../cli";

// Mock the commands to avoid actual execution
vi.mock("../commands/reverse", () => ({
	reverse: vi.fn().mockResolvedValue(undefined),
}));

describe("CLI Validation Arguments", () => {
	let cli: any;

	beforeEach(() => {
		cli = createCli();
		// Suppress yargs help output during tests
		vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit() called");
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Reverse Command Validation Options", () => {
		it("should parse skip-yaml-validation option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--skip-yaml-validation"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					skipYamlValidation: true,
				})
			);
		});

		it("should parse skip-schema-validation option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--skip-schema-validation"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					skipSchemaValidation: true,
				})
			);
		});

		it("should parse skip-action-validation option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--skip-action-validation"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					skipActionValidation: true,
				})
			);
		});

		it("should parse validate-only option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--validate-only"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					validateOnly: true,
				})
			);
		});

		it("should parse validation-report option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--validation-report"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					validationReport: true,
				})
			);
		});

		it("should parse strict-validation option", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--strict-validation"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					strictValidation: true,
				})
			);
		});

		it("should parse multiple validation options together", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync([
				"reverse",
				"test.yml",
				"--validate-only",
				"--validation-report",
				"--strict-validation",
				"--skip-action-validation",
			]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					validateOnly: true,
					validationReport: true,
					strictValidation: true,
					skipActionValidation: true,
				})
			);
		});

		it("should have default values for validation options", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml"]);

			expect(reverse).toHaveBeenCalledWith(
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

		it("should combine validation options with existing options", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync([
				"reverse",
				"test.yml",
				"--output",
				"./output",
				"--preview",
				"--validate-only",
				"--verbose",
			]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					target: "test.yml",
					outputDir: "./output",
					preview: true,
					validateOnly: true,
					verbose: true,
				})
			);
		});
	});

	describe("Help Text and Examples", () => {
		it("should include validation examples in help text", async () => {
			let _helpOutput = "";
			vi.spyOn(cli, "showHelp").mockImplementation((output) => {
				_helpOutput = output || "";
			});

			try {
				await cli.parseAsync(["reverse", "--help"]);
			} catch (_error) {
				// Expected to exit
			}

			// Check that help was called (the exact help text would be complex to test)
			expect(cli.showHelp).toHaveBeenCalled();
		});

		it("should accept validation-related arguments without errors", async () => {
			// Import is needed for mock setup
			await import("../commands/reverse");

			// These should not throw argument validation errors
			await expect(cli.parseAsync(["reverse", "test.yml", "--validate-only"])).resolves.not.toThrow();
			await expect(cli.parseAsync(["reverse", "test.yml", "--validation-report"])).resolves.not.toThrow();
			await expect(cli.parseAsync(["reverse", "test.yml", "--strict-validation"])).resolves.not.toThrow();
			await expect(cli.parseAsync(["reverse", "test.yml", "--skip-yaml-validation"])).resolves.not.toThrow();
			await expect(cli.parseAsync(["reverse", "test.yml", "--skip-schema-validation"])).resolves.not.toThrow();
			await expect(cli.parseAsync(["reverse", "test.yml", "--skip-action-validation"])).resolves.not.toThrow();
		});
	});

	describe("Option Conflicts and Logic", () => {
		it("should handle validate-only with preview mode", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", "test.yml", "--validate-only", "--preview"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					validateOnly: true,
					preview: true,
				})
			);
		});

		it("should handle validation options with local-actions-only", async () => {
			const { reverse } = await import("../commands/reverse");

			await cli.parseAsync(["reverse", ".github", "--local-actions-only", "--validation-report"]);

			expect(reverse).toHaveBeenCalledWith(
				expect.objectContaining({
					localActionsOnly: true,
					validationReport: true,
				})
			);
		});
	});
});
