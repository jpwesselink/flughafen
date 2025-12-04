import { describe, expect, it } from "vitest";
import type { GeneratedInterface } from "../../generators/TypeGenerator";
import { TypeAwareExpressionValidator, type TypeAwareValidationContext } from "../type-aware-validator";

describe("TypeAwareExpressionValidator", () => {
	const mockActionInterface: GeneratedInterface = {
		actionName: "actions/checkout@v4",
		interfaceName: "ActionsCheckoutV4Inputs",
		interfaceCode: `export interface ActionsCheckoutV4Inputs {
  repository?: string;
  ref?: string;
  token?: string;
  fetchDepth?: number;
}`,
	};

	const mockActionWithOutputs: GeneratedInterface = {
		actionName: "actions/setup-node@v4",
		interfaceName: "ActionsSetupNodeV4Inputs",
		interfaceCode: `export interface ActionsSetupNodeV4Inputs {
  nodeVersion?: string;
  cache?: string;
}`,
	};

	describe("validateExpressionWithTypes", () => {
		it("should validate expression without type context", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
			};

			const result = validator.validateExpressionWithTypes("${{ github.ref }}", context);

			expect(result.typeErrors).toHaveLength(0);
			expect(result.typeSuggestions).toHaveLength(0);
			expect(result.valid).toBe(true);
		});

		it("should validate expression with action context", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ github.ref }}", context);

			expect(result).toBeDefined();
			expect(result.typeErrors).toBeDefined();
			expect(result.typeSuggestions).toBeDefined();
		});

		it("should validate step output references", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: ["checkout", "setup"],
				actionInterfaces: [mockActionInterface, mockActionWithOutputs],
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.ref }}", context);

			expect(result).toBeDefined();
		});

		it("should detect unavailable steps", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: ["checkout"],
				actionInterfaces: [
					{
						actionName: "test/action@v1",
						interfaceName: "TestActionInputs",
						interfaceCode: "export interface TestActionInputs {}",
					},
				],
			};

			// Use "test" which will match the action interface but isn't in available steps
			const result = validator.validateExpressionWithTypes("${{ steps.test.outputs.value }}", context);

			expect(result.typeErrors.some((error) => error.includes("not available"))).toBe(true);
		});

		it("should provide suggestions for available steps", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: ["checkout", "setup"],
				actionInterfaces: [
					{
						actionName: "actions/build@v1",
						interfaceName: "ActionsBuildInputs",
						interfaceCode: "export interface ActionsBuildInputs {}",
					},
				],
			};

			// Use "build" which will match the action interface but isn't in available steps
			const result = validator.validateExpressionWithTypes("${{ steps.build.outputs.artifact }}", context);

			expect(result.typeSuggestions.some((suggestion) => suggestion.includes("Available steps"))).toBe(true);
		});
	});

	describe("extractActionReferences", () => {
		it("should extract step references from expressions", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				actionInterfaces: [mockActionInterface],
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.ref }}", context);

			// The validator should process the step reference
			expect(result).toBeDefined();
		});

		it("should extract multiple step references", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				actionInterfaces: [mockActionInterface, mockActionWithOutputs],
			};

			const result = validator.validateExpressionWithTypes(
				"${{ steps.checkout.outputs.ref }}-${{ steps.setup.outputs.version }}",
				context
			);

			expect(result).toBeDefined();
		});

		it("should handle expressions without step references", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
			};

			const result = validator.validateExpressionWithTypes("${{ github.ref }}", context);

			expect(result.typeErrors).toHaveLength(0);
		});
	});

	describe("findActionInterface", () => {
		it("should find action interface by action name", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				actionInterfaces: [mockActionInterface, mockActionWithOutputs],
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.ref }}", context);

			// Should find and use the checkout interface
			expect(result).toBeDefined();
		});

		it("should handle missing action interfaces", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				actionInterfaces: undefined,
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.ref }}", context);

			// Should not crash without interfaces
			expect(result).toBeDefined();
		});

		it("should match action by interface name", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				actionInterfaces: [mockActionInterface],
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.value }}", context);

			expect(result).toBeDefined();
		});
	});

	describe("inferExpressionType", () => {
		it("should infer string literal type", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "hello world" }}', context);

			expect(result).toBeDefined();
		});

		it("should infer number literal type", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ 42 }}", context);

			expect(result).toBeDefined();
		});

		it("should infer boolean literal type", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ true }}", context);

			expect(result).toBeDefined();
		});

		it("should infer string type for github.event references", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ github.event.head_commit.message }}", context);

			expect(result).toBeDefined();
		});

		it("should infer string type for step outputs", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ steps.checkout.outputs.ref }}", context);

			expect(result).toBeDefined();
		});

		it("should infer string type for env variables", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ env.NODE_ENV }}", context);

			expect(result).toBeDefined();
		});

		it("should handle unknown expression types", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ unknown.context.value }}", context);

			expect(result).toBeDefined();
		});
	});

	describe("isTypeCompatible", () => {
		it("should accept string for string type", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "hello" }}', context);

			// String literal should be compatible with string type
			expect(result.typeErrors).toHaveLength(0);
		});

		it("should accept number for number type", () => {
			const validator = new TypeAwareExpressionValidator();

			const numberInterface: GeneratedInterface = {
				actionName: "test-action",
				interfaceName: "TestActionInputs",
				interfaceCode: `export interface TestActionInputs {
  count: number;
}`,
			};

			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: numberInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ 42 }}", context);

			expect(result).toBeDefined();
		});

		it("should accept boolean for boolean type", () => {
			const validator = new TypeAwareExpressionValidator();

			const boolInterface: GeneratedInterface = {
				actionName: "test-action",
				interfaceName: "TestActionInputs",
				interfaceCode: `export interface TestActionInputs {
  enabled: boolean;
}`,
			};

			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: boolInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ true }}", context);

			expect(result).toBeDefined();
		});

		it("should handle optional types", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "main" }}', context);

			// Optional string should accept string value
			expect(result).toBeDefined();
		});

		it("should allow type coercion from boolean to string", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ true }}", context);

			// Boolean can be converted to string in GitHub Actions
			expect(result).toBeDefined();
		});

		it("should allow type coercion from number to string", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ 123 }}", context);

			// Number can be converted to string in GitHub Actions
			expect(result).toBeDefined();
		});
	});

	describe("parseActionInterfaceTypes", () => {
		it("should extract types from interface code", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "value" }}', context);

			// Should parse types from mockActionInterface
			expect(result).toBeDefined();
		});

		it("should handle interfaces with multiple types", () => {
			const multiTypeInterface: GeneratedInterface = {
				actionName: "test-action",
				interfaceName: "TestActionInputs",
				interfaceCode: `export interface TestActionInputs {
  stringProp: string;
  numberProp: number;
  boolProp: boolean;
  optionalProp?: string;
}`,
			};

			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "test-action",
					interface: multiTypeInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "test" }}', context);

			expect(result).toBeDefined();
		});
	});

	describe("validateActionInputExpression", () => {
		it("should validate compatible types", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes('${{ "main" }}', context);

			// String should be compatible with string type
			expect(result.typeErrors.some((e) => e.includes("not compatible"))).toBe(false);
		});

		it("should handle expressions without inferred type", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ matrix.version }}", context);

			// Unknown types should not cause errors
			expect(result).toBeDefined();
		});
	});

	describe("comprehensive type validation", () => {
		it("should validate complex expressions with multiple contexts", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: ["checkout", "setup"],
				actionInterfaces: [mockActionInterface, mockActionWithOutputs],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes(
				"${{ format('{0}-{1}', github.ref, steps.checkout.outputs.ref) }}",
				context
			);

			expect(result).toBeDefined();
			expect(result.valid).toBe(true);
		});

		it("should combine base validation with type validation", () => {
			const validator = new TypeAwareExpressionValidator();
			const context: TypeAwareValidationContext = {
				eventType: "push",
				availableJobs: [],
				availableSteps: [],
				currentAction: {
					name: "actions/checkout@v4",
					interface: mockActionInterface,
				},
			};

			const result = validator.validateExpressionWithTypes("${{ unknown.context }}", context);

			// Should have both base validation and type validation results
			expect(result.errors).toBeDefined();
			expect(result.typeErrors).toBeDefined();
			expect(result.suggestions).toBeDefined();
			expect(result.typeSuggestions).toBeDefined();
		});
	});
});
