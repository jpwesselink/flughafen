import { describe, expect, it } from "vitest";
import type { ActionSchema } from "../../fetchers/ActionSchemaFetcher";
import { type LocalActionSchema, TypeGenerator } from "../TypeGenerator";

describe("TypeGenerator - Local Actions", () => {
	const mockLocalAction: LocalActionSchema = {
		name: "docker-build",
		description: "Build a Docker image",
		inputs: {
			"image-name": {
				description: "Name of the Docker image",
				required: true,
				type: "string",
			},
			dockerfile: {
				description: "Path to Dockerfile",
				required: false,
				default: "Dockerfile",
				type: "string",
			},
			"build-args": {
				description: "Build arguments",
				required: false,
				type: "string",
			},
		},
		outputs: {
			"image-id": {
				description: "ID of the built image",
			},
		},
	};

	it("should generate interface for local action", () => {
		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(mockLocalAction);

		expect(result.actionName).toBe("docker-build");
		expect(result.interfaceName).toBe("DockerBuildInputs");
		expect(result.interfaceCode).toContain("export interface DockerBuildInputs {");
		expect(result.interfaceCode).toContain("imageName: string;");
		expect(result.interfaceCode).toContain("dockerfile?: string;");
		expect(result.interfaceCode).toContain("buildArgs?: string;");
	});

	it("should include local action JSDoc comments", () => {
		const generator = new TypeGenerator({ includeJSDoc: true });
		const result = generator.generateLocalActionInterface(mockLocalAction);

		expect(result.interfaceCode).toContain("/**");
		expect(result.interfaceCode).toContain("* Inputs for local action: docker-build");
		expect(result.interfaceCode).toContain("* Build a Docker image");
		expect(result.interfaceCode).toContain("* @local This is a local composite action");
		expect(result.interfaceCode).toContain("* Name of the Docker image");
		expect(result.interfaceCode).toContain('* @default "Dockerfile"');
	});

	it("should handle local action without inputs", () => {
		const emptyAction: LocalActionSchema = {
			name: "empty-action",
			description: "An action with no inputs",
			inputs: {},
		};

		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(emptyAction);

		expect(result.interfaceName).toBe("EmptyActionInputs");
		expect(result.interfaceCode).toContain("// This local action has no inputs");
	});

	it("should handle local action with boolean inputs", () => {
		const actionWithBoolean: LocalActionSchema = {
			name: "test-action",
			inputs: {
				"enable-cache": {
					description: "Enable caching",
					required: false,
					type: "boolean",
					default: true,
				},
			},
		};

		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(actionWithBoolean);

		expect(result.interfaceCode).toContain("enableCache?: boolean | string;");
	});

	it("should handle local action with number inputs", () => {
		const actionWithNumber: LocalActionSchema = {
			name: "test-action",
			inputs: {
				"retry-count": {
					description: "Number of retries",
					required: false,
					type: "number",
					default: 3,
				},
			},
		};

		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(actionWithNumber);

		expect(result.interfaceCode).toContain("retryCount?: number;");
		expect(result.interfaceCode).toContain("* @default 3");
	});

	it("should handle local action with choice inputs", () => {
		const actionWithChoice: LocalActionSchema = {
			name: "test-action",
			inputs: {
				"log-level": {
					description: "Logging level",
					required: true,
					type: "choice",
					options: ["debug", "info", "warn", "error"],
				},
			},
		};

		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(actionWithChoice);

		expect(result.interfaceCode).toContain("logLevel: 'debug' | 'info' | 'warn' | 'error';");
	});

	it("should handle local action with choice inputs without options", () => {
		const actionWithChoice: LocalActionSchema = {
			name: "test-action",
			inputs: {
				"custom-choice": {
					description: "Custom choice",
					required: false,
					type: "choice",
				},
			},
		};

		const generator = new TypeGenerator();
		const result = generator.generateLocalActionInterface(actionWithChoice);

		expect(result.interfaceCode).toContain("customChoice?: string;");
	});

	it("should generate interfaces for multiple local actions", () => {
		const actions: LocalActionSchema[] = [
			{
				name: "action-one",
				inputs: { input1: { required: true, type: "string" } },
			},
			{
				name: "action-two",
				inputs: { input2: { required: false, type: "boolean" } },
			},
		];

		const generator = new TypeGenerator();
		const results = generator.generateLocalActionInterfaces(actions);

		expect(results).toHaveLength(2);
		expect(results[0].interfaceName).toBe("ActionOneInputs");
		expect(results[1].interfaceName).toBe("ActionTwoInputs");
	});

	it("should respect optionalDefaults for local actions", () => {
		const actionWithDefaults: LocalActionSchema = {
			name: "test-action",
			inputs: {
				"with-default": {
					description: "Input with default",
					required: false,
					type: "string",
					default: "value",
				},
			},
		};

		const generatorOptional = new TypeGenerator({ optionalDefaults: true });
		const resultOptional = generatorOptional.generateLocalActionInterface(actionWithDefaults);
		expect(resultOptional.interfaceCode).toContain("withDefault?: string;");

		const generatorRequired = new TypeGenerator({ optionalDefaults: false });
		const resultRequired = generatorRequired.generateLocalActionInterface(actionWithDefaults);
		// With optionalDefaults: false, non-required inputs should still be optional
		expect(resultRequired.interfaceCode).toContain("withDefault?: string;");
	});
});

describe("TypeGenerator - Type File Generation", () => {
	const mockExternalAction: ActionSchema = {
		action: "actions/checkout@v4",
		name: "Checkout",
		description: "Checkout repository",
		inputs: {
			ref: {
				description: "The branch, tag or SHA to checkout",
				required: false,
				type: "string",
			},
		},
		outputs: {},
	};

	const mockLocalAction: LocalActionSchema = {
		name: "custom-action",
		description: "Custom local action",
		inputs: {
			input1: {
				description: "First input",
				required: true,
				type: "string",
			},
		},
	};

	it("should generate type file with local and external actions", () => {
		const generator = new TypeGenerator();
		const externalInterfaces = generator.generateInterfaces([mockExternalAction]);
		const localInterfaces = generator.generateLocalActionInterfaces([mockLocalAction]);

		const typeFile = generator.generateTypeFileWithLocalActions(externalInterfaces, localInterfaces);

		expect(typeFile).toContain("// This file is auto-generated by Flughafen");
		expect(typeFile).toContain("// ===== Common GitHub Actions (Built-in) =====");
		expect(typeFile).toContain("// ===== External GitHub Actions =====");
		expect(typeFile).toContain("// ===== Local Actions =====");
		expect(typeFile).toContain("export interface ActionsCheckoutV4Inputs");
		expect(typeFile).toContain("export interface CustomActionInputs");
		expect(typeFile).toContain("declare module '@flughafen/core'");
	});

	it("should include hardcoded common action interfaces", () => {
		const generator = new TypeGenerator();
		const typeFile = generator.generateTypeFileWithLocalActions([], []);

		// Check for hardcoded common actions
		expect(typeFile).toContain("export interface ActionsCheckoutV4Inputs");
		expect(typeFile).toContain("export interface ActionsSetupNodeV3Inputs");
		expect(typeFile).toContain("export interface ActionsSetupNodeV4Inputs");
		expect(typeFile).toContain("export interface AwsActionsConfigureAwsCredentialsV2Inputs");
		expect(typeFile).toContain("export interface ActionsUploadArtifactV3Inputs");
		expect(typeFile).toContain("export interface ActionsUploadArtifactV4Inputs");
		expect(typeFile).toContain("export interface ActionsDownloadArtifactV3Inputs");
		expect(typeFile).toContain("export interface ActionsDownloadArtifactV4Inputs");
		expect(typeFile).toContain("export interface ActionsCacheV3Inputs");
	});

	it("should include common action properties", () => {
		const generator = new TypeGenerator();
		const typeFile = generator.generateTypeFileWithLocalActions([], []);

		// Check ActionsCheckoutV4Inputs properties
		expect(typeFile).toContain("repository?: string;");
		expect(typeFile).toContain("ref?: string;");
		expect(typeFile).toContain("token?: string;");
		expect(typeFile).toContain("fetchDepth?: number;");

		// Check ActionsSetupNodeV4Inputs properties
		expect(typeFile).toContain("nodeVersion?: string;");
		expect(typeFile).toContain("cache?: string;");

		// Check ActionsCacheV3Inputs required properties
		expect(typeFile).toContain("path: string;");
		expect(typeFile).toContain("key: string;");
	});

	it("should generate type file with only external actions", () => {
		const generator = new TypeGenerator();
		const externalInterfaces = generator.generateInterfaces([mockExternalAction]);

		const typeFile = generator.generateTypeFileWithLocalActions(externalInterfaces, []);

		expect(typeFile).toContain("// ===== External GitHub Actions =====");
		expect(typeFile).toContain("export interface ActionsCheckoutV4Inputs");
		expect(typeFile).not.toContain("// ===== Local Actions =====");
	});

	it("should generate type file with only local actions", () => {
		const generator = new TypeGenerator();
		const localInterfaces = generator.generateLocalActionInterfaces([mockLocalAction]);

		const typeFile = generator.generateTypeFileWithLocalActions([], localInterfaces);

		expect(typeFile).toContain("// ===== Local Actions =====");
		expect(typeFile).toContain("export interface CustomActionInputs");
		expect(typeFile).not.toContain("// ===== External GitHub Actions =====");
	});

	it("should include module augmentation with all actions", () => {
		const generator = new TypeGenerator();
		const externalInterfaces = generator.generateInterfaces([mockExternalAction]);
		const localInterfaces = generator.generateLocalActionInterfaces([mockLocalAction]);

		const typeFile = generator.generateTypeFileWithLocalActions(externalInterfaces, localInterfaces);

		expect(typeFile).toContain("export interface Uses<TInputs");
		expect(typeFile).toContain("type ActionInputMap");
		expect(typeFile).toContain("interface StepBuilder");
		expect(typeFile).toContain("interface JobBuilder");
	});
});

describe("TypeGenerator - Convenience Methods", () => {
	it("should generate convenience methods for actions", () => {
		const mockSchema: ActionSchema = {
			action: "actions/checkout@v4",
			name: "Checkout",
			description: "Checkout repository",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesCheckout(inputs?: ActionsCheckoutV4Inputs): StepBuilder;");
	});

	it("should handle action names with special characters", () => {
		const mockSchema: ActionSchema = {
			action: "codecov/codecov-action@v3",
			name: "Codecov",
			description: "Upload coverage",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesCodecovCodecovAction(");
	});

	it("should handle aws-actions", () => {
		const mockSchema: ActionSchema = {
			action: "aws-actions/configure-aws-credentials@v2",
			name: "Configure AWS Credentials",
			description: "Configure AWS credentials",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesAwsActionsConfigureAwsCredentials(");
	});

	it("should handle setup-python action", () => {
		const mockSchema: ActionSchema = {
			action: "actions/setup-python@v4",
			name: "Setup Python",
			description: "Setup Python",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesSetupPython(");
	});

	it("should handle upload-artifact action", () => {
		const mockSchema: ActionSchema = {
			action: "actions/upload-artifact@v3",
			name: "Upload Artifact",
			description: "Upload artifact",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesUploadArtifact(");
	});

	it("should handle download-artifact action", () => {
		const mockSchema: ActionSchema = {
			action: "actions/download-artifact@v3",
			name: "Download Artifact",
			description: "Download artifact",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesDownloadArtifact(");
	});

	it("should handle cache action", () => {
		const mockSchema: ActionSchema = {
			action: "actions/cache@v3",
			name: "Cache",
			description: "Cache dependencies",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		expect(convenience).toContain("usesCache(");
	});

	it("should handle actions with single-part names", () => {
		const mockSchema: ActionSchema = {
			action: "invalid-action",
			name: "Invalid",
			description: "Invalid action",
			inputs: {},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const interfaces = generator.generateInterfaces([mockSchema]);
		const convenience = generator.generateConvenienceMethods(interfaces);

		// Single-part action names shouldn't generate convenience methods
		expect(convenience).toBe(
			"// Type-safe convenience methods for known GitHub Actions\n// These methods provide IntelliSense and type checking for action inputs\n"
		);
	});
});

describe("TypeGenerator - Choice Type Handling", () => {
	it("should generate union types for choice inputs", () => {
		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				level: {
					description: "Log level",
					required: true,
					type: "choice",
					options: ["debug", "info", "warn"],
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const result = generator.generateInterface(mockSchema);

		expect(result.interfaceCode).toContain("level: 'debug' | 'info' | 'warn';");
	});

	it("should fallback to string for choice without options", () => {
		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				level: {
					description: "Log level",
					required: true,
					type: "choice",
					options: [],
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const result = generator.generateInterface(mockSchema);

		expect(result.interfaceCode).toContain("level: string;");
	});
});

describe("TypeGenerator - Property Name Sanitization", () => {
	it("should handle property names that need quoting", () => {
		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				"invalid.property.name": {
					description: "Property with dots",
					required: true,
					type: "string",
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const result = generator.generateInterface(mockSchema);

		expect(result.interfaceCode).toContain("'invalid.property.name': string;");
	});

	it("should handle normal property names without quoting", () => {
		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				"valid-property": {
					description: "Valid property",
					required: true,
					type: "string",
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator();
		const result = generator.generateInterface(mockSchema);

		expect(result.interfaceCode).toContain("validProperty: string;");
		expect(result.interfaceCode).not.toContain("'valid-property'");
	});
});

describe("TypeGenerator - Text Wrapping", () => {
	it("should wrap long descriptions", () => {
		const longDescription =
			"This is a very long description that should be wrapped to multiple lines because it exceeds the maximum line width that is configured for JSDoc comments";

		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				input1: {
					description: longDescription,
					required: true,
					type: "string",
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator({ includeJSDoc: true });
		const result = generator.generateInterface(mockSchema);

		// Should contain multiple comment lines
		const commentLines = result.interfaceCode
			.split("\n")
			.filter((line) => line.trim().startsWith("*") && !line.includes("/**") && !line.includes("*/"));
		expect(commentLines.length).toBeGreaterThan(1);
	});

	it("should handle single-word descriptions", () => {
		const mockSchema: ActionSchema = {
			action: "test/action@v1",
			name: "Test",
			description: "Test action",
			inputs: {
				input1: {
					description: "Short",
					required: true,
					type: "string",
				},
			},
			outputs: {},
		};

		const generator = new TypeGenerator({ includeJSDoc: true });
		const result = generator.generateInterface(mockSchema);

		expect(result.interfaceCode).toContain("* Short");
	});
});
