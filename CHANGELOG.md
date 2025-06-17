# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-17

### Added
- Initial release of Flughafen - TypeScript chainable API for GitHub Actions workflows
- WorkflowBuilder with fluent, type-safe builder pattern
- JobBuilder for configuring jobs with dependencies, matrix strategies, and more
- StepBuilder for creating steps with conditional execution, timeouts, and error handling
- TriggerBuilder for configuring workflow triggers (push, pull_request, schedule, etc.)
- Factory functions for common workflow patterns (CI workflows)
- Comprehensive test suite with vitest
- TypeScript type generation from GitHub Actions JSON schema
- YAML output generation with proper validation
- Support for all major GitHub Actions workflow features:
  - Jobs with dependencies and matrix strategies
  - Steps with conditions, timeouts, and continue-on-error
  - Environment variables and secrets
  - Permissions configuration
  - Workflow dispatch with inputs
  - Scheduled workflows with cron expressions
