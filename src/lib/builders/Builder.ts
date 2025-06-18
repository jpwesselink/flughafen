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
