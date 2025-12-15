# GitHub-Supported Files Documentation

This document provides a comprehensive list of all files officially supported by GitHub, along with their official documentation references and current parser support status in Flughafen.

## File Support Status

✅ = Parser implemented and working
🔄 = Parser planned/in development
❌ = Parser not yet implemented

## GitHub Actions

### Workflows
**File Pattern**: `.github/workflows/*.{yml,yaml}`
**Purpose**: Define automated workflows for CI/CD, automation, and more
**Official Documentation**: https://docs.github.com/en/actions/using-workflows/about-workflows
**Flughafen Status**: ✅ `WorkflowHandler` - Full support with TypeScript generation

### Local Actions
**File Pattern**: `.github/actions/*/action.{yml,yaml}` or `action.{yml,yaml}` (root)
**Purpose**: Define reusable action components
**Official Documentation**: https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions
**Flughafen Status**: ✅ `ActionHandler` - Full support with TypeScript generation

## Dependency Management

### Dependabot Configuration
**File Pattern**: `.github/dependabot.{yml,yaml}`
**Purpose**: Configure automated dependency updates
**Official Documentation**: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
**Flughafen Status**: ✅ `DependabotHandler` - Basic support

## Community Health

### GitHub Sponsors Funding
**File Pattern**: `.github/FUNDING.{yml,yaml}`
**Purpose**: Display funding links in repository
**Official Documentation**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
**Flughafen Status**: ✅ `FundingHandler` - Full support with TypeScript generation

### Code Ownership
**File Pattern**: `.github/CODEOWNERS` or `CODEOWNERS` (root)
**Purpose**: Define code review assignments
**Official Documentation**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
**Flughafen Status**: ❌ Parser needed

### Code of Conduct
**File Pattern**: `CODE_OF_CONDUCT.{md,txt}` (root) or `.github/CODE_OF_CONDUCT.{md,txt}`
**Purpose**: Define community standards and behavior expectations
**Official Documentation**: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project
**Flughafen Status**: ❌ Parser needed

### Contributing Guidelines
**File Pattern**: `CONTRIBUTING.{md,txt}` (root) or `.github/CONTRIBUTING.{md,txt}`
**Purpose**: Provide contribution instructions for project collaborators
**Official Documentation**: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors
**Flughafen Status**: ❌ Parser needed

### Security Policy
**File Pattern**: `SECURITY.{md,txt}` (root) or `.github/SECURITY.{md,txt}`
**Purpose**: Define security vulnerability reporting process
**Official Documentation**: https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository
**Flughafen Status**: ❌ Parser needed

### Support Resources
**File Pattern**: `SUPPORT.{md,txt}` (root) or `.github/SUPPORT.{md,txt}`
**Purpose**: Provide support contact information and resources
**Official Documentation**: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-support-resources-to-your-project
**Flughafen Status**: ❌ Parser needed

### Repository Description
**File Pattern**: `README.{md,txt,rst}` (root)
**Purpose**: Repository description, usage instructions, and documentation
**Official Documentation**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
**Flughafen Status**: ❌ Parser needed

### License
**File Pattern**: `LICENSE{,.md,.txt}` (root) or `COPYING{,.md,.txt}` (root)
**Purpose**: Define legal terms for code usage and distribution
**Official Documentation**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
**Flughafen Status**: ❌ Parser needed

### Citation File Format
**File Pattern**: `CITATION.cff` (root)
**Purpose**: Provide citation information for academic projects
**Official Documentation**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files
**Flughafen Status**: ❌ Parser needed

## Issue and Pull Request Templates

### Issue Template Configuration
**File Pattern**: `.github/ISSUE_TEMPLATE/config.yml`
**Purpose**: Configure issue template selection and external links
**Official Documentation**: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms#top-level-syntax
**Flughafen Status**: ❌ Parser needed

### Issue Templates (YAML Forms)
**File Pattern**: `.github/ISSUE_TEMPLATE/*.{yml,yaml}`
**Purpose**: Define structured issue forms with various input types
**Official Documentation**: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema
**Flughafen Status**: ❌ Parser needed

### Issue Templates (Markdown)
**File Pattern**: `.github/ISSUE_TEMPLATE/*.md`
**Purpose**: Define markdown-based issue templates
**Official Documentation**: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/manually-creating-a-single-issue-template-for-your-repository
**Flughafen Status**: ❌ Parser needed

### Pull Request Templates
**File Pattern**: `.github/PULL_REQUEST_TEMPLATE.md` or `.github/PULL_REQUEST_TEMPLATE/*.md`
**Purpose**: Define default pull request description templates
**Official Documentation**: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
**Flughafen Status**: ❌ Parser needed

### Discussion Templates
**File Pattern**: `.github/DISCUSSION_TEMPLATE/*.{yml,yaml}`
**Purpose**: Define structured discussion category templates
**Official Documentation**: https://docs.github.com/en/discussions/managing-discussions-for-your-community/creating-discussion-category-forms
**Flughafen Status**: ❌ Parser needed

## GitHub Pages

### Jekyll Configuration
**File Pattern**: `_config.yml` (root)
**Purpose**: Configure Jekyll site generation for GitHub Pages
**Official Documentation**: https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll
**Flughafen Status**: ❌ Parser needed

### Custom Domain
**File Pattern**: `CNAME` (root, no extension)
**Purpose**: Configure custom domain for GitHub Pages
**Official Documentation**: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
**Flughafen Status**: ❌ Parser needed

## GitHub Releases

### Release Configuration
**File Pattern**: `.github/release.yml`
**Purpose**: Configure automatic release note generation
**Official Documentation**: https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
**Flughafen Status**: ❌ Parser needed

## Third-Party Integrations (Common but not GitHub-official)

**Note**: These files are commonly used with GitHub but are not officially part of GitHub's feature set. They are included for completeness but marked as third-party.

### Auto-labeler Configuration (Third-party)
**File Pattern**: `.github/labeler.{yml,yaml}`
**Purpose**: Configure automatic label assignment for pull requests
**Documentation**: https://github.com/actions/labeler (GitHub Action, not GitHub feature)
**Flughafen Status**: 🔄 Consider for third-party extensions

### Repository Settings (Third-party)
**File Pattern**: `.github/settings.{yml,yaml}`
**Purpose**: Configure repository settings via Probot Settings app
**Documentation**: https://github.com/repository-settings/app (Third-party app)
**Flughafen Status**: 🔄 Consider for third-party extensions

### Stale Bot Configuration (Third-party)
**File Pattern**: `.github/stale.{yml,yaml}`
**Purpose**: Configure automatic issue/PR staling
**Documentation**: https://github.com/actions/stale (GitHub Action, not GitHub feature)
**Flughafen Status**: 🔄 Consider for third-party extensions

### Codecov Configuration (Third-party)
**File Pattern**: `.github/codecov.{yml,yaml}` or `codecov.{yml,yaml}` (root)
**Purpose**: Configure Codecov.io integration
**Documentation**: https://docs.codecov.com/docs/codecovyml-reference (Third-party service)
**Flughafen Status**: 🔄 Consider for third-party extensions

## Implementation Priority

### High Priority (Core GitHub Features)
1. **Issue Templates** - Widely used, official GitHub feature
2. **Pull Request Templates** - Essential for project governance
3. **Community Health Files** - Important for open source projects
4. **Release Configuration** - Growing adoption for automated releases

### Medium Priority (GitHub Pages & Documentation)
1. **Jekyll Configuration** - For projects using GitHub Pages
2. **README/License** - Universal but complex due to format variations
3. **Citation Files** - Important for academic/research projects

### Low Priority (Specialized Use Cases)
1. **Discussion Templates** - Newer feature, less adoption
2. **Custom Domain** - Simple file, limited processing needs

### Third-Party Considerations
- Evaluate demand for third-party integrations
- Consider plugin/extension architecture
- Maintain clear separation from official GitHub features

## Development Guidelines

### For New Parsers
1. **Reference Official Documentation**: Always link to official GitHub docs
2. **Follow Schema Patterns**: Use JSON Schema for validation when possible
3. **Test with Real Examples**: Use examples from `/examples/real-world-examples/`
4. **Generate TypeScript**: Provide typed interfaces and builder patterns
5. **Validate Thoroughly**: Ensure compliance with GitHub's requirements

### File Detection Patterns
```typescript
// Path-based detection (highest confidence)
".github/workflows/*.yml" → "gha-workflow"
".github/FUNDING.yml" → "github-funding"

// Basename detection (medium confidence)
"CONTRIBUTING.md" → "contributing"
"LICENSE" → "license"

// Schema validation (fallback)
// Use JSON Schema to validate content structure
```

### Handler Implementation Template
```typescript
export class [FileType]Handler implements KindHandler {
  readonly name = "[file-type]";
  readonly officialDocs = "https://docs.github.com/...";

  schema = {
    // JSON Schema for validation
  };

  emit(ast: unknown, context: FileContext): string {
    // Generate TypeScript interfaces and utilities
  }
}
```

## Validation Strategy

### Official vs Third-Party
- **Official GitHub files**: Include in core parsing system
- **Third-party integrations**: Consider separate plugin system
- **Deprecated features**: Note deprecation status and migration paths

### Documentation Updates
- Keep this document updated when GitHub adds/changes file support
- Monitor GitHub's changelog and blog for new file types
- Validate against GitHub's official documentation regularly

## References

- [GitHub Documentation](https://docs.github.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Community Health Files](https://docs.github.com/en/communities)
- [Repository Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)