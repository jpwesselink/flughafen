# Examples

Browse real-world examples of Flughafen workflows in the [examples directory](https://github.com/jpwesselink/flughafen/tree/main/examples).

## Available Examples

### Basic Examples

- **[Basic Workflow Reference](https://github.com/jpwesselink/flughafen/blob/main/examples/basic-workflow-reference-example.ts)** - Simple workflow with job references
- **[Enhanced Workflow References](https://github.com/jpwesselink/flughafen/blob/main/examples/enhanced-workflow-references.ts)** - Advanced workflow composition patterns
- **[Clean Workflow](https://github.com/jpwesselink/flughafen/blob/main/examples/clean-workflow.ts)** - Minimal example showing core concepts

### Comment Demos

- **[Job Comments](https://github.com/jpwesselink/flughafen/blob/main/examples/job-comments-demo.ts)** - Adding documentation to jobs
- **[Step Comments](https://github.com/jpwesselink/flughafen/blob/main/examples/step-comments-demo.ts)** - Documenting individual steps
- **[Local Action Comments](https://github.com/jpwesselink/flughafen/blob/main/examples/local-action-comments-demo.ts)** - Custom action documentation

### Validation Examples

- **[Demo Validation](https://github.com/jpwesselink/flughafen/blob/main/examples/demo-validation.ts)** - Showcasing validation features
- **[Simple Validation](https://github.com/jpwesselink/flughafen/blob/main/examples/simple-validation.ts)** - Basic validation patterns
- **[TypeScript Errors](https://github.com/jpwesselink/flughafen/blob/main/examples/typescript-errors.ts)** - Type-safety demonstrations

### Real-World Examples

Real `.github` folders from popular open-source projects in the [real-world-examples](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples) directory:

- **[Next.js](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples/next-js)** - Reusable workflows and complex build/test pipelines from Vercel
- **[VS Code](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples/vs-code)** - Enterprise-grade workflows from Microsoft
- **[React](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples/react)** - Advanced React ecosystem workflows from Facebook
- **[TypeScript](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples/typescript)** - Language tooling workflows from Microsoft
- **[Kubernetes](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples/kubernetes)** - Massive-scale testing and validation workflows

These examples demonstrate industry best practices for:
- Reusable workflows (`workflow_call`)
- Multi-platform builds and matrix strategies
- Deployment patterns and security workflows
- Complex dependency management

## Running Examples

You can run any example using the Flughafen CLI:

```bash
# Validate an example
flughafen validate examples/clean-workflow.ts

# Build an example to YAML
flughafen build examples/clean-workflow.ts

# Generate types for actions used
flughafen generate types examples/clean-workflow.ts
```

See the CLI Documentation (link available in repository) for all available commands.
