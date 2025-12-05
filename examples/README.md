# Enhanced Workflow Reference Examples

This directory contains examples demonstrating the new **Enhanced Workflow Reference System** that allows using `.uses(otherWorkflow)` instead of string paths for type-safe workflow references.

## Examples

### 1. **Basic Example** (`basic-workflow-reference-example.ts`)
A simple before/after comparison showing the core concept:

```typescript
// ❌ Old way (string-based)
.job('test', createJob()
  .uses('./.github/workflows/test.yml')  // No type safety
)

// ✅ New way (type-safe)
const testWorkflow = createWorkflow().on('workflow_call');
.job('test', createJob()
  .uses(testWorkflow)  // Type-safe reference!
)
```

### 2. **Comprehensive Example** (`enhanced-workflow-references.ts`)
A complete CI/CD pipeline demonstrating:
- Multiple reusable workflows with inputs, outputs, and secrets
- Type-safe workflow references
- Job dependencies and conditional execution
- Mixed usage of local and external references
- Comparison between old and new approaches

## Key Benefits

### 🔒 **Type Safety**
- Compile-time validation of workflow references
- Prevents broken workflows due to typos or missing files

### 🧠 **IDE Support**
- IntelliSense for workflow methods and properties
- Go-to-definition for referenced workflows
- Better code navigation

### 🔄 **Refactoring**
- Rename workflows safely across entire codebase
- Find all usages of a workflow easily
- Automated refactoring tools work correctly

### 📝 **Documentation**
- Clear dependency relationships between workflows
- Self-documenting workflow architecture
- Better understanding of workflow reuse patterns

### 🔙 **Backward Compatibility**
- String-based paths still work for external workflows
- Gradual migration path for existing codebases
- No breaking changes

## Usage Patterns

### Basic Workflow Reference
```typescript
const reusableWorkflow = createWorkflow().on('workflow_call');

const mainWorkflow = createWorkflow()
  .on('push')
  .job('call-reusable', createJob()
    .uses(reusableWorkflow)  // Type-safe!
  );
```

### With Inputs and Secrets
```typescript
const deployWorkflow = createWorkflow()
  .on('workflow_call', {
    inputs: { environment: { type: 'string', required: true } },
    secrets: { DEPLOY_TOKEN: { required: true } }
  });

const pipeline = createWorkflow()
  .on('push')
  .job('deploy', createJob()
    .uses(deployWorkflow)
    .with({ environment: 'production' })
    .secrets({ DEPLOY_TOKEN: '${{ secrets.PROD_TOKEN }}' })
  );
```

### Mixed Local and External References
```typescript
const workflow = createWorkflow()
  .on('push')
  .job('local', createJob()
    .uses(localWorkflow)  // Type-safe local reference
  )
  .job('external', createJob()
    .runsOn('ubuntu-latest')
    .step(step => step
      .uses('owner/repo/.github/workflows/shared.yml@v1')  // String for external
    )
  );
```

## Implementation Details

The enhanced system works by:

1. **ReusableWorkflow Interface**: Workflows implement `getWorkflowPath()` method
2. **Union Types**: `WorkflowReference = string | ReusableWorkflow` supports both approaches
3. **Type Resolution**: `resolveWorkflowReference()` handles conversion at build time
4. **Path Generation**: Automatic `.github/workflows/` path generation for local workflows

This provides a smooth transition from string-based references to type-safe workflow objects while maintaining full backward compatibility.