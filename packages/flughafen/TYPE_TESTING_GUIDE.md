# Type Testing in Flughafen

This guide shows the different approaches we use for testing TypeScript types in our codebase.

## 1. Basic Type Assertions with `expectTypeOf`

```typescript
if (import.meta.vitest) {
    const { expectTypeOf } = await import("vitest");
    
    describe("Basic Type Tests", () => {
        it("should verify type structure", () => {
            expectTypeOf<Builder<string>>().toBeObject();
            expectTypeOf<Builder<string>>().toHaveProperty("build").toBeFunction();
            expectTypeOf<Builder<string>['build']>().returns.toEqualTypeOf<string>();
        });
    });
}
```

## 2. Type Error Testing with `@ts-expect-error`

The most reliable approach for testing type errors is using TypeScript's built-in `@ts-expect-error` directive:

```typescript
it("should catch type errors", () => {
    // ✅ Valid code should work
    const valid: Builder<string> = {
        build: () => "test"
    };
    
    // ❌ Invalid code should cause TypeScript errors
    // @ts-expect-error - Missing build method
    const invalid1: Builder<string> = {};
    
    // @ts-expect-error - Wrong return type
    const invalid2: Builder<string> = {
        build: () => 42
    };
    
    // @ts-expect-error - Build must be a function
    const invalid3: Builder<string> = {
        build: "not a function"
    };
});
```

## 3. Generic Type Testing

```typescript
it("should work with generics", () => {
    // Test that generics work correctly
    expectTypeOf<Builder<string>>().toBeObject();
    expectTypeOf<Builder<number>>().toBeObject();
    expectTypeOf<Builder<{ foo: string }>>().toBeObject();
    
    // Test return type inference
    const stringBuilder: Builder<string> = { build: () => "test" };
    expectTypeOf(stringBuilder.build()).toEqualTypeOf<string>();
    
    // Test with complex types
    type ComplexType = { users: string[]; config: { enabled: boolean } };
    const complexBuilder: Builder<ComplexType> = {
        build: () => ({ users: ["admin"], config: { enabled: true } })
    };
    expectTypeOf(complexBuilder.build()).toEqualTypeOf<ComplexType>();
});
```

## 4. Function Type Constraints

```typescript
it("should enforce function constraints", () => {
    function processBuilder<T>(builder: Builder<T>): T {
        return builder.build();
    }
    
    // These should work with type inference
    const stringResult = processBuilder({ build: () => "hello" });
    expectTypeOf(stringResult).toEqualTypeOf<string>();
    
    const numberResult = processBuilder({ build: () => 42 });
    expectTypeOf(numberResult).toEqualTypeOf<number>();
});
```

## 5. Advanced Type Error Testing (Optional)

For more complex scenarios, you can use the TypeScript compiler API:

```typescript
it("should catch compilation errors", async () => {
    const { compileTypeScriptSource } = await import("../../processing/compiler/typescript-compiler");
    
    // Test invalid TypeScript code
    const invalidCode = `
        interface Builder<T> { build(): T; }
        const invalid: Builder<string> = { build: () => 42 };
    `;
    
    expect(() => {
        compileTypeScriptSource(invalidCode, "test.ts");
    }).toThrow(); // Will throw due to type mismatch
});
```

## Best Practices

1. **Use `@ts-expect-error` for testing type errors** - This is the most reliable approach
2. **Use `expectTypeOf` for positive type assertions** - Verifies that types work as expected
3. **Test both positive and negative cases** - Ensure types work correctly AND fail when they should
4. **Keep type tests close to type definitions** - Co-locate tests with the code they test
5. **Test generic constraints** - Ensure generic types work with various type parameters
6. **Test type inference** - Verify that TypeScript can infer types correctly

## Why This Approach Works

- **Compile-time checking**: `@ts-expect-error` leverages TypeScript's own type checker
- **CI/CD integration**: Type errors will fail the build in CI/CD pipelines
- **IDE support**: Developers see type errors immediately in their IDE
- **Documentation**: Type tests serve as living documentation of type contracts
