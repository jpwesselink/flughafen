# Workflow Call Examples

This directory contains examples specifically designed to demonstrate `workflow_call` functionality in GitHub Actions.

## Files

### `simple-reusable.yml`
A basic reusable workflow that demonstrates:
- **Inputs**: Required and optional parameters with defaults
- **Secrets**: Required deployment token
- **Outputs**: URL of the deployed application
- **Simple job logic**: Checkout, deploy, and output generation

### `caller-workflow.yml`
A workflow that calls the reusable workflow, demonstrating:
- **Multiple calls**: Staging and production deployments
- **Job dependencies**: Production depends on staging
- **Conditional execution**: Only deploy on main branch
- **Different inputs**: Same workflow, different environments
- **Secret passing**: Environment-specific secrets

## Testing with Flughafen

```bash
# Test the reusable workflow
npx flughafen reverse examples/real-world-examples/workflow-call-examples/simple-reusable.yml

# Test the caller workflow
npx flughafen reverse examples/real-world-examples/workflow-call-examples/caller-workflow.yml

# Test both together
npx flughafen reverse examples/real-world-examples/workflow-call-examples/
```

## Expected Output

The reverse engineering should generate TypeScript code that:

1. **For reusable workflow**: Uses `.on("workflow_call", { inputs: {...}, secrets: {...}, outputs: {...} })`
2. **For caller workflow**: Uses `.uses("./path/to/workflow.yml")` with `.with({...})` and `.secrets({...})`
3. **Preserves all parameters**: Types, defaults, descriptions, and requirements
4. **Converts expressions**: `${{ github.sha }}` becomes `${expr('github.sha')}`

This demonstrates the complete workflow_call ecosystem in a simple, understandable format.