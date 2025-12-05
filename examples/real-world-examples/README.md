# Real-World GitHub Actions Examples

This directory contains real `.github` folders from popular open-source projects, providing a comprehensive collection of GitHub Actions workflows for testing and learning purposes.

## Projects Included

### 🔥 Next.js (`next-js/`)
**Source**: https://github.com/vercel/next.js

The Next.js repository includes sophisticated reusable workflows and complex build/test pipelines:

- **`build_reusable.yml`** - Reusable workflow with extensive inputs for build customization
- **`integration_tests_reusable.yml`** - Parameterized integration testing workflow
- **`build_and_test.yml`** - Complex multi-matrix testing with workflow_call
- Matrix strategies, conditional builds, and artifact management

### 🎨 VS Code (`vs-code/`)
**Source**: https://github.com/microsoft/vscode

Microsoft's VS Code repository demonstrates enterprise-grade workflows:

- Platform-specific testing (Darwin, Linux, Windows)
- Complex dependency management and caching
- Monaco Editor publishing workflows
- Sophisticated build and test matrices

### ⚛️ React (`react/`)
**Source**: https://github.com/facebook/react

Facebook's React repository showcases advanced React ecosystem workflows:

- Compiler playground deployments
- TypeScript integration testing  
- DevTools regression testing
- Pre-release automation
- Discord notifications and social integrations

### 📝 TypeScript (`typescript/`)
**Source**: https://github.com/microsoft/TypeScript

Microsoft's TypeScript repository features language tooling workflows:

- Compiler testing across Node.js versions
- Language service integration tests
- Performance benchmarking
- NPM publishing automation

### ☸️ Kubernetes (`kubernetes/`)
**Source**: https://github.com/kubernetes/kubernetes

The Kubernetes project demonstrates massive-scale testing and validation:

- Multi-architecture builds
- End-to-end testing clusters
- Security scanning and validation
- Complex dependency verification
- Release automation

## Workflow Patterns Found

### 🔄 Reusable Workflows (`workflow_call`)

Many of these repositories use reusable workflows extensively:

- **Next.js**: `build_reusable.yml`, `integration_tests_reusable.yml`
- **Complex parameterization** with inputs, secrets, and outputs
- **Matrix strategies** for parallel execution
- **Conditional execution** based on inputs

### 🏗️ Build and Test Patterns

- **Multi-platform builds** (Linux, macOS, Windows)
- **Node.js version matrices** for compatibility testing
- **Dependency caching** strategies (npm, yarn, pnpm)
- **Artifact management** and cross-job sharing

### 🚀 Deployment Workflows

- **Staging and production** environments
- **Progressive deployment** strategies
- **Rollback mechanisms**
- **Environment-specific configurations**

### 🔒 Security and Validation

- **Dependency scanning** and vulnerability checks
- **Code quality** enforcement (linting, formatting)
- **Security policies** and permissions
- **Secrets management** best practices

## Testing with Flughafen

Use these examples to test Flughafen's reverse engineering capabilities:

```bash
# Test workflow_call support
npx flughafen reverse examples/real-world-examples/next-js/.github/workflows/build_reusable.yml

# Test complex builds
npx flughafen reverse examples/real-world-examples/vs-code/.github/workflows/pr-linux-test.yml

# Reverse engineer entire repository
npx flughafen reverse examples/real-world-examples/react/.github/

# Test with validation
npx flughafen reverse examples/real-world-examples/typescript/.github/ --validation-report
```

## Workflow Complexity Levels

### 🟢 Beginner
- Simple push/PR triggers
- Basic build and test jobs
- Minimal dependencies

### 🟡 Intermediate  
- Matrix strategies
- Conditional execution
- Artifact sharing
- Basic reusable workflows

### 🔴 Advanced
- Complex reusable workflows with many inputs
- Multi-repository deployments
- Enterprise security patterns
- Massive parallel execution

## Learning Opportunities

These real-world examples demonstrate:

1. **Best Practices** from industry-leading teams
2. **Common Patterns** across different project types
3. **Scalability Strategies** for large codebases
4. **Error Handling** and resilience patterns
5. **Performance Optimization** techniques

## Contributing

To add more examples:

1. Clone a repository with interesting workflows
2. Copy the `.github` folder to a new directory
3. Update this README with project details
4. Test with Flughafen to ensure compatibility

---

*Last updated: July 2025*
*Generated for Flughafen reverse engineering testing*