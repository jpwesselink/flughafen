/**
 * Generic builder interface that enables automatic building
 * This pattern allows builders to be automatically converted to their built types
 * when passed to utility functions, improving code readability and reducing
 * explicit .build() calls in internal workflow construction.
 */
export interface Builder<T> {
	build(): T;
}

/**
 * Utility function to extract built value from a builder
 */
export function buildValue<T>(builder: Builder<T>): T {
	return builder.build();
}

// In-source tests
if (import.meta.vitest) {
	const { it, expect, describe, expectTypeOf } = import.meta.vitest;

	describe("Builder utilities", () => {
		it("should extract built value from a builder", () => {
			// Create a mock builder
			const mockBuilder: Builder<string> = {
				build: () => "test-value",
			};

			const result = buildValue(mockBuilder);
			expect(result).toBe("test-value");
		});

		it("should work with complex objects", () => {
			const mockConfig = { name: "test", value: 42 };
			const mockBuilder: Builder<typeof mockConfig> = {
				build: () => mockConfig,
			};

			const result = buildValue(mockBuilder);
			expect(result).toEqual(mockConfig);
			expect(result).toBe(mockConfig); // Should return the exact same object
		});
	});

	describe("Builder Types", () => {
		it("should export Builder interface correctly", () => {
			expectTypeOf<Builder<any>>().toBeObject();
			expectTypeOf<Builder<any>>().toHaveProperty("build").toBeFunction();
		});

		it("should enforce correct Builder implementation", () => {
			// ✅ Valid builder should compile
			const validBuilder: Builder<string> = {
				build: () => "test",
			};
			expectTypeOf(validBuilder).toMatchTypeOf<Builder<string>>();

			// ❌ These would cause TypeScript errors if uncommented:
			// const invalidBuilder1: Builder<string> = {}; // Missing build method
			// const invalidBuilder2: Builder<string> = { build: () => 42 }; // Wrong return type
			// const invalidBuilder3: Builder<string> = { build: "not a function" }; // Build not a function
		});

		it("should enforce generic type constraints", () => {
			// ✅ Should work with any type
			expectTypeOf<Builder<string>>().toBeObject();
			expectTypeOf<Builder<number>>().toBeObject();
			expectTypeOf<Builder<{ foo: string }>>().toBeObject();

			// Test that build() returns the correct type
			const stringBuilder: Builder<string> = { build: () => "test" };
			expectTypeOf(stringBuilder.build()).toEqualTypeOf<string>();

			const objectBuilder: Builder<{ name: string }> = {
				build: () => ({ name: "test" }),
			};
			expectTypeOf(objectBuilder.build()).toEqualTypeOf<{ name: string }>();		});

		it("should demonstrate type safety with runtime validation", () => {
			// ✅ Valid builder implementations should work
			const validBuilder1: Builder<string> = {
				build: () => "test"
			};
			expect(validBuilder1.build()).toBe("test");

			const validBuilder2: Builder<number> = {
				build: () => 42
			};
			expect(validBuilder2.build()).toBe(42);

			// Test generic type inference
			function testBuilder<T>(builder: Builder<T>): T {
				return builder.build();
			}

			expect(testBuilder(validBuilder1)).toBe("test");
			expect(testBuilder(validBuilder2)).toBe(42);
			
			// Test that the interface is properly typed
			expectTypeOf(validBuilder1.build()).toEqualTypeOf<string>();
			expectTypeOf(validBuilder2.build()).toEqualTypeOf<number>();
		});
	});
}
