# API Documentation Coverage Analysis

This document analyzes what's documented vs. what's available in the codebase, and identifies gaps.

## ✅ Fully Documented

### Core Builders
- [x] **WorkflowBuilder** - Complete documentation with all methods
- [x] **JobBuilder** - Complete documentation with all methods
- [x] **StepBuilder** - Complete documentation with all methods
- [x] **ActionBuilder** - Complete documentation
- [x] **LocalActionBuilder** - Complete documentation with all methods

### Factory Functions
- [x] `createWorkflow()` - Documented
- [x] `createLocalAction()` - Documented

### Operations
- [x] `synth()` - Documented
- [x] `validate()` - Documented
- [x] `generateTypes()` - Documented

## ⚠️ Partially Documented

### Advanced Features

1. **Container Configuration** (JobBuilder)
   - ✅ Basic usage documented
   - ⚠️ Missing: Advanced container options (credentials, volumes)

2. **Service Configuration** (JobBuilder)
   - ✅ Basic usage documented
   - ⚠️ Missing: Service health checks, credentials

3. **Strategy Configuration** (JobBuilder)
   - ✅ Matrix documented
   - ✅ Include/exclude documented
   - ⚠️ Missing: fail-fast behavior details
   - ⚠️ Missing: max-parallel examples

### Validation System

- ✅ Basic validation documented
- ⚠️ Missing: Individual validator details
  - `TypeScriptValidator`
  - `StructureValidator`
  - `SecurityValidator`
  - `BestPracticesValidator`
  - `SyntaxValidator`

### Schema System

- ✅ Basic type generation documented
- ⚠️ Missing: Schema fetching details
- ⚠️ Missing: Custom schema sources
- ⚠️ Missing: Schema caching

## ❌ Not Documented

### Internal/Advanced APIs

1. **ActionStepBuilder** (for local action steps)
   - Not documented (used internally by LocalActionBuilder)
   - Methods similar to StepBuilder but for action.yml steps

2. **TypedActionConfigBuilder**
   - Not documented (used internally for type-safe local actions)
   - Provides type-safe `.with()` for local actions

3. **TypedStepBuilderImpl**
   - Not documented (used internally)
   - Implementation detail of type-safe step building

4. **Builder Interface**
   - Not documented (infrastructure)
   - Generic `build()` pattern used by all builders

### Processing System

1. **WorkflowProcessor**
   - ✅ Basic usage documented
   - ❌ Missing: Sandbox security details
   - ❌ Missing: Timeout handling
   - ❌ Missing: Error recovery

2. **MultiWorkflowProcessor**
   - ❌ Not documented
   - Processes multiple workflow files at once

### Utility Functions

1. **String Utilities**
   - ✅ `toKebabCase()` documented
   - ✅ `toCamelCase()` documented
   - ✅ `normalizeToKebabCase()` documented
   - ❌ Missing: Other utility functions

2. **Error Classes**
   - ✅ Basic error types documented
   - ❌ Missing: `FileSystemError`
   - ❌ Missing: `NetworkError`
   - ❌ Missing: `SandboxExecutionError`
   - ❌ Missing: Error helper functions

### Schema System Internals

1. **ActionSchemaFetcher**
   - ⚠️ Basic usage documented
   - ❌ Missing: Rate limiting
   - ❌ Missing: Caching strategy
   - ❌ Missing: GitHub token handling

2. **TypeGenerator**
   - ⚠️ Basic usage documented
   - ❌ Missing: Type generation options
   - ❌ Missing: JSDoc generation
   - ❌ Missing: Custom type mappings

3. **Expression Validation**
   - ❌ Not documented
   - Validates GitHub Actions expressions like `${{ }}

`

## 📝 Recommendations

### High Priority (Add to API docs)

1. **Container & Services Advanced Options**
   ```typescript
   job.container({
     image: 'node:20',
     credentials: {
       username: '${{ github.actor }}',
       password: '${{ secrets.GITHUB_TOKEN }}'
     },
     volumes: ['/data:/data'],
     options: '--cpus 2 --memory 4g'
   })

   job.services({
     postgres: {
       image: 'postgres:15',
       credentials: { ... },
       options: '--health-cmd pg_isready --health-interval 10s'
     }
   })
   ```

2. **Validation System Details**
   - Document each validator individually
   - Show how to register custom validators
   - Explain validation result structure

3. **Error Handling Guide**
   - Show all error types
   - Best practices for error handling
   - Error context and suggestions

### Medium Priority (Separate advanced docs)

1. **Processing System Deep Dive**
   - Sandbox security model
   - Timeout and resource limits
   - Multi-file processing

2. **Schema System Guide**
   - Custom schema sources
   - Schema caching
   - Type generation options

3. **Expression Validation**
   - How expression validation works
   - Supported expression syntax
   - Common validation errors

### Low Priority (Internal APIs)

These are implementation details that most users don't need:

1. **Builder Pattern Internals**
   - `Builder<T>` interface
   - `buildValue()` utility

2. **Type-Safe Wrappers**
   - `TypedActionConfigBuilder`
   - `TypedStepBuilderImpl`

## 🔧 How to Fix

### 1. Expand api.md

Add these sections:

```markdown
## Advanced Job Configuration

### Container Credentials
### Service Health Checks
### Matrix Strategy Details

## Validation System

### TypeScriptValidator
### SecurityValidator
### BestPracticesValidator
### Custom Validators

## Error Handling

### Error Types
### Error Context
### Recovery Strategies
```

### 2. Create Separate Guides

Create these new documentation files:

1. **`docs/VALIDATION.md`**
   - Complete validation system guide
   - All validators documented
   - Custom validator examples

2. **`docs/SCHEMA-SYSTEM.md`**
   - Schema fetching
   - Type generation
   - Caching and performance

3. **`docs/ERROR-HANDLING.md`**
   - All error types
   - Best practices
   - Recovery patterns

4. **`docs/PROCESSING.md`**
   - Workflow processing
   - Sandbox security
   - Multi-file workflows

### 3. Add Examples

Create example files showing:

1. `examples/container-services.ts` - Advanced container/service usage
2. `examples/custom-validation.ts` - Custom validators
3. `examples/error-handling.ts` - Comprehensive error handling
4. `examples/multi-workflow.ts` - Multi-file workflows

## 📊 Coverage Statistics

### Current Documentation Coverage

| Category | Documented | Total | Coverage |
|----------|-----------|-------|----------|
| Core Builders | 5/5 | 5 | 100% |
| Factory Functions | 2/2 | 2 | 100% |
| High-Level Operations | 3/3 | 3 | 100% |
| Validation System | 1/6 | 6 | 17% |
| Schema System | 2/5 | 5 | 40% |
| Processing System | 1/3 | 3 | 33% |
| Error Handling | 4/10 | 10 | 40% |
| Utility Functions | 3/8 | 8 | 38% |
| **Overall** | **21/42** | **42** | **50%** |

### User-Facing API Coverage

| Category | Documented | Total | Coverage |
|----------|-----------|-------|----------|
| Essential APIs | 13/13 | 13 | 100% |
| Common Use Cases | 8/10 | 10 | 80% |
| Advanced Features | 5/12 | 12 | 42% |
| **User-Facing Total** | **26/35** | **35** | **74%** |

## ✅ Action Items

### Immediate (Week 1)

- [ ] Add container credentials documentation to api.md
- [ ] Add service health checks documentation to api.md
- [ ] Document matrix strategy options in detail
- [ ] Add validation system overview to api.md

### Short-term (Week 2-3)

- [ ] Create VALIDATION.md with complete validation guide
- [ ] Create ERROR-HANDLING.md with all error types
- [ ] Add advanced container/service examples
- [ ] Document expression validation

### Medium-term (Month 1-2)

- [ ] Create SCHEMA-SYSTEM.md
- [ ] Create PROCESSING.md
- [ ] Add custom validator examples
- [ ] Comprehensive error handling examples

### Long-term (Future)

- [ ] Interactive documentation site (like TypeDoc)
- [ ] Video tutorials for common workflows
- [ ] API playground/sandbox
- [ ] Comprehensive migration guides

## 🎯 Goal

Target: **95% coverage of user-facing APIs** by end of next month.

Priority order:
1. Core builders and operations (✅ 100% - Complete)
2. Common use cases (🟡 80% - Almost there)
3. Advanced features (🔴 42% - Needs work)
4. Internal/advanced APIs (⚪ Optional - As needed)
