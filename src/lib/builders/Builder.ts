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
	const { it, expect, describe } = import.meta.vitest;

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
}
