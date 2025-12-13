# Funding Configuration

Flughafen provides comprehensive support for GitHub FUNDING.yml files, enabling type-safe configuration of sponsorship and donation options for your project.

## Quick Start

Create `flughafen/funding.ts`:

```typescript
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github(['sponsor1', 'sponsor2'])
  .patreon('creator')
  .openCollective('project');
```

Build to `.github/FUNDING.yml`:

```bash
npx flughafen build
```

## Supported Platforms

Flughafen supports all official GitHub funding platforms:

- **GitHub Sponsors** - `github()`
- **Patreon** - `patreon()`
- **Open Collective** - `openCollective()`
- **Ko-fi** - `kofi()`
- **Tidelift** - `tidelift()`
- **Community Bridge** - `communityBridge()`
- **Liberapay** - `liberapay()`
- **IssueHunt** - `issuehunt()`
- **Otechie** - `otechie()`
- **LFX Crowdfunding** - `lfxCrowdfunding()`
- **Polar** - `polar()`
- **Buy Me a Coffee** - `buyMeACoffee()`
- **Thanks.dev** - `thanksDev()`
- **Custom URLs** - `custom()`

## Examples

### Single Platform

```typescript
import { createFunding } from '@flughafen/core';

export default createFunding()
  .github('octocat');
```

### Multiple GitHub Sponsors

GitHub allows up to 4 sponsors:

```typescript
export default createFunding()
  .github(['sponsor1', 'sponsor2', 'sponsor3', 'sponsor4']);
```

### Multiple Platforms

```typescript
export default createFunding()
  .github('maintainer')
  .patreon('creator')
  .openCollective('project')
  .kofi('supporter');
```

### Custom Donation URLs

Support up to 4 custom URLs:

```typescript
export default createFunding()
  .github('sponsor')
  .custom([
    'https://donate.example.com',
    'https://support.example.org'
  ]);
```

### Real-World Example

Based on popular open-source projects:

```typescript
// tRPC funding configuration
export default createFunding()
  .github('trpc')
  .openCollective('trpc');

// Vitest funding configuration
export default createFunding()
  .github(['vitest-dev', 'sheremet-va', 'antfu', 'patak-dev'])
  .openCollective('vitest');
```

## Validation

### Schema Validation

All configurations are validated against GitHub's official FUNDING.yml schema:

```typescript
// ❌ This will fail - too many GitHub sponsors
export default createFunding()
  .github(['user1', 'user2', 'user3', 'user4', 'user5']); // Max 4 allowed

// ❌ This will fail - invalid username format
export default createFunding()
  .github('invalid username!'); // No spaces or special chars allowed
```

### Platform-Specific Validation

Each platform has specific validation rules:

```typescript
// ✅ Valid Tidelift format
export default createFunding()
  .tidelift('npm/package-name');

// ❌ Invalid Tidelift format
export default createFunding()
  .tidelift('invalid-format'); // Must be "platform/package"
```

## CLI Commands

### Analyze Existing Files

```bash
# Analyze a FUNDING.yml file
npx flughafen analyze .github/FUNDING.yml

# Output:
# ✓ Valid configuration
# ✓ 2 platforms configured: github, open_collective
# ✓ GitHub Sponsors: trpc
# ✓ Open Collective: trpc
# ✓ Total funding options: 2
```

### Generate TypeScript

Convert existing FUNDING.yml to TypeScript:

```bash
npx flughafen funding:generate .github/FUNDING.yml
# → flughafen/funding.ts
```

### Validate Configuration

```bash
npx flughafen funding:validate .github/FUNDING.yml
```

## Roundtrip Testing

Flughafen includes comprehensive roundtrip testing to ensure YAML ↔ TypeScript conversion accuracy:

1. **FUNDING.yml** → Parse with `FundingAnalyzer`
2. **FundingConfig** → Generate TypeScript with `generateTypeScript()`
3. **TypeScript** → Execute with `createFunding()` builder
4. **FundingBuilder** → Generate YAML with `.synth()`
5. **Result**: Original FUNDING.yml ≈ Generated FUNDING.yml (semantically equivalent)

This ensures that converting between formats preserves all configuration data and maintains compatibility with GitHub's funding system.

## API Reference

### `createFunding()`

Creates a new funding configuration builder.

```typescript
function createFunding(): FundingBuilder
```

### `FundingBuilder` Methods

All methods return `FundingBuilder` for chaining, except `build()` and `synth()`.

#### Platform Methods

- `.github(username | username[])` - GitHub Sponsors (max 4)
- `.patreon(username)` - Patreon creator
- `.openCollective(username)` - Open Collective project
- `.kofi(username)` - Ko-fi supporter
- `.tidelift(platform/package)` - Tidelift package
- `.communityBridge(project)` - Linux Foundation Community Bridge
- `.liberapay(username)` - Liberapay user
- `.issuehunt(username)` - IssueHunt user
- `.otechie(username)` - Otechie user
- `.lfxCrowdfunding(project)` - LFX Crowdfunding project
- `.polar(username)` - Polar user
- `.buyMeACoffee(username)` - Buy Me a Coffee user
- `.thanksDev(username)` - Thanks.dev user
- `.custom(url | url[])` - Custom donation URLs (max 4)

#### Build Methods

- `.build()` - Returns funding configuration object
- `.synth()` - Returns YAML file object with path and content

## Best Practices

### 1. Start Simple

Begin with essential platforms and expand as needed:

```typescript
// Start with GitHub Sponsors
export default createFunding()
  .github('maintainer');

// Add more platforms later
export default createFunding()
  .github('maintainer')
  .patreon('creator')
  .openCollective('project');
```

### 2. Use Arrays for Multiple Sponsors

When you have multiple GitHub sponsors or custom URLs:

```typescript
export default createFunding()
  .github(['primary-maintainer', 'core-contributor'])
  .custom([
    'https://company-donations.com',
    'https://foundation-support.org'
  ]);
```

### 3. Validate Before Committing

Always validate your configuration:

```bash
npx flughafen build
npx flughafen validate
```

### 4. Test with Real Examples

Study successful open-source projects' funding configurations in the [examples directory](https://github.com/jpwesselink/flughafen/tree/main/examples/real-world-examples).

## Migration from YAML

If you have an existing `.github/FUNDING.yml`, convert it easily:

```bash
# Generate TypeScript from existing FUNDING.yml
npx flughafen funding:generate .github/FUNDING.yml

# Review and customize the generated flughafen/funding.ts
# Then build to replace the YAML file
npx flughafen build
```

The generated TypeScript will be functionally equivalent to your original YAML configuration.