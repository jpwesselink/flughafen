import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig, getConfigPath, isValidConfig, loadConfig } from "../utils/config";

describe("Config Loader", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "flughafen-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("loadConfig", () => {
		it("should return default config when no config file exists", async () => {
			const config = await loadConfig(tempDir);
			expect(config.input).toMatch(/workflows$/);
			expect(config.output).toMatch(/\.github\/workflows$/);
			expect(config.validation?.strict).toBe(true);
			expect(config.types?.includeJSDoc).toBe(true);
		});

		it("should load JSON config file", async () => {
			const configData = {
				input: "./custom-workflows",
				output: "./custom-output",
				githubToken: "test-token",
			};
			await writeFile(join(tempDir, "flughafen.config.json"), JSON.stringify(configData));

			const config = await loadConfig(tempDir);
			expect(config.input).toMatch(/custom-workflows$/);
			expect(config.output).toMatch(/custom-output$/);
			expect(config.githubToken).toBe("test-token");
		});

		it("should load .flughafenrc file", async () => {
			const configData = {
				input: "./src/workflows",
				validation: { strict: false },
			};
			await writeFile(join(tempDir, ".flughafenrc"), JSON.stringify(configData));

			const config = await loadConfig(tempDir);
			expect(config.input).toMatch(/src\/workflows$/);
			expect(config.validation?.strict).toBe(false);
		});

		it("should merge with default config", async () => {
			const configData = {
				input: "./custom-input",
			};
			await writeFile(join(tempDir, "flughafen.config.json"), JSON.stringify(configData));

			const config = await loadConfig(tempDir);
			expect(config.input).toMatch(/custom-input$/);
			expect(config.output).toMatch(/\.github\/workflows$/); // from default
			expect(config.validation?.strict).toBe(true); // from default
		});

		it("should resolve relative paths", async () => {
			const configData = {
				input: "./relative/workflows",
				output: "./relative/output",
				types: { output: "./relative/types.d.ts" },
			};
			await writeFile(join(tempDir, "flughafen.config.json"), JSON.stringify(configData));

			const config = await loadConfig(tempDir);
			expect(config.input).toBe(join(tempDir, "relative/workflows"));
			expect(config.output).toBe(join(tempDir, "relative/output"));
			expect(config.types?.output).toBe(join(tempDir, "relative/types.d.ts"));
		});

		it("should not resolve absolute paths", async () => {
			const configData = {
				input: "/absolute/workflows",
				output: "/absolute/output",
			};
			await writeFile(join(tempDir, "flughafen.config.json"), JSON.stringify(configData));

			const config = await loadConfig(tempDir);
			expect(config.input).toBe("/absolute/workflows");
			expect(config.output).toBe("/absolute/output");
		});
	});

	describe("getConfigPath", () => {
		it("should return null when no config file exists", async () => {
			const path = await getConfigPath(tempDir);
			expect(path).toBeNull();
		});

		it("should return path to config file when it exists", async () => {
			await writeFile(join(tempDir, "flughafen.config.json"), "{}");

			const path = await getConfigPath(tempDir);
			expect(path).toBe(join(tempDir, "flughafen.config.json"));
		});

		it("should find first available config file", async () => {
			await writeFile(join(tempDir, "flughafen.config.json"), "{}");

			const path = await getConfigPath(tempDir);
			expect(path).toBe(join(tempDir, "flughafen.config.json"));
		});
	});

	describe("isValidConfig", () => {
		it("should validate correct config", () => {
			const validConfig = {
				input: "./workflows",
				output: "./.github/workflows",
			};
			expect(isValidConfig(validConfig)).toBe(true);
		});

		it("should reject config without required fields", () => {
			const invalidConfig = {
				input: "./workflows",
				// missing output
			};
			expect(isValidConfig(invalidConfig)).toBe(false);
		});

		it("should reject non-object config", () => {
			expect(isValidConfig(null)).toBe(false);
			expect(isValidConfig("string")).toBe(false);
			expect(isValidConfig(123)).toBe(false);
		});
	});

	describe("defaultConfig", () => {
		it("should have all required fields", () => {
			expect(isValidConfig(defaultConfig)).toBe(true);
			expect(defaultConfig.input).toBe("./workflows");
			expect(defaultConfig.output).toBe("./.github/workflows");
			expect(defaultConfig.validation?.strict).toBe(true);
			expect(defaultConfig.types?.includeJSDoc).toBe(true);
		});

		it("should return resolved paths when loaded", async () => {
			const config = await loadConfig(tempDir);
			expect(config.input).toMatch(/workflows$/);
			expect(config.output).toMatch(/\.github\/workflows$/);
		});
	});
});
