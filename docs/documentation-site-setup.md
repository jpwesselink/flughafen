# Documentation Site Setup Guide

Complete guide to setting up and deploying the Flughafen documentation site.

## 🎯 Overview

The documentation site uses:

- **VitePress** - Fast, Vue-powered static site generator
- **GitHub Pages** - Free hosting
- **Flughafen** - Deployment workflow (dogfooded!)

## 📁 Architecture

```
flughafen/                              # Monorepo root
├── docs/                               # 📚 VitePress documentation site
│   ├── .vitepress/
│   │   └── config.ts                   # VitePress configuration
│   ├── index.md                        # Homepage
│   ├── tutorial.md                     # Tutorial
│   ├── api.md                          # API reference
│   ├── examples.md                     # Examples overview
│   ├── faq.md                          # FAQ
│   ├── public/                         # Static assets
│   └── dist/                           # Built site (not committed)
├── examples/                           # 💡 Example workflows
├── workflows/                          # 🔧 Workflow definitions
│   └── deploy-docs.ts                  # Deployment workflow (Flughafen)
├── .github/workflows/
│   └── deploy-docs.yml                 # Generated from deploy-docs.ts
└── packages/
    ├── flughafen/                      # Core library
    │   └── src/                        # Source for API docs
    └── cli/                            # CLI package
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# From monorepo root
pnpm install
```

### 2. Local Development

```bash
# From docs directory
pnpm --filter docs dev
```

Opens at `http://localhost:5173`

### 3. Build Production Site

```bash
pnpm build
```

### 4. Preview Production Build

```bash
pnpm preview
```

## 🔧 Configuration

### VitePress Configuration

Edit `docs/.vitepress/config.ts`:

```typescript
export default defineConfig({
  title: 'Flughafen',
  description: 'Type-Safe GitHub Actions Workflow Builder',

  // Output to dist directory
  outDir: './dist',

  // Clean URLs
  cleanUrls: true,

  themeConfig: {
    nav: [...],
    sidebar: [...],
    socialLinks: [...]
  }
});
```

**Key Settings:**

- `outDir: './dist'` - Build output directory
- `cleanUrls: true` - Pretty URLs without .html

### TypeDoc Configuration (Optional)

If you want to generate API documentation from source code, create `docs/typedoc.json`:

```json
{
  "entryPoints": ["../packages/flughafen/src/index.ts"],
  "out": "./api",
  "plugin": ["typedoc-plugin-markdown"],
  "excludePrivate": true,
  "categorizeByGroup": true
}
```

> **Note**: TypeDoc integration is optional. The current documentation is hand-written.

## 🚀 Deployment

### GitHub Pages Setup

1. **Enable GitHub Pages**:
   - Go to repository **Settings → Pages**
   - **Source**: GitHub Actions
   - Save

2. **The workflow handles everything else automatically!**

### Deployment Workflow

The deployment workflow is written in Flughafen (dogfooding):

**Source**: `/workflows/deploy-docs.ts`

**Generated**: `/.github/workflows/deploy-docs.yml`

**Triggers**:
- Push to `main` branch
- Changes to:
  - `docs/**` (documentation and VitePress config)
  - `packages/flughafen/src/**` (API source code)
  - `examples/**` (example workflows)
- Manual trigger via `workflow_dispatch`

**Pipeline**:

1. **Build Job**:
   - Checkout repository
   - Setup Node.js 20 + pnpm
   - Install dependencies
   - Build documentation site (VitePress)
   - Upload Pages artifact

2. **Deploy Job**:
   - Deploy to GitHub Pages
   - Returns deployment URL

### Updating the Deployment Workflow

Since the workflow is written in Flughafen:

```bash
# 1. Edit the TypeScript workflow
vim workflows/deploy-docs.ts

# 2. Build it
flughafen build workflows/deploy-docs.ts

# 3. Commit both files
git add workflows/deploy-docs.ts .github/workflows/deploy-docs.yml
git commit -m "Update deployment workflow"
```

## 📝 Adding Content

### Add Markdown Documentation

1. Create `.md` file in `/docs/`:

```bash
echo "# Advanced Topics" > docs/ADVANCED.md
```

2. Add to sidebar in `.vitepress/config.ts`:

```typescript
sidebar: [
  {
    text: 'Advanced',
    items: [
      { text: 'Advanced Topics', link: '/ADVANCED' }
    ]
  }
]
```

3. Commit and push - auto-deploys!

### Update API Documentation

API documentation is maintained in `docs/api.md`. When updating the API:

1. Edit `docs/api.md` directly
2. Push to `main` - site rebuilds automatically!

### Add Examples

1. Add example to `/examples/`:

```typescript
// examples/my-example.ts
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('My Example')
  // ...
```

2. Reference in documentation:

````markdown
## Example

```typescript
// examples/my-example.ts
import { createWorkflow } from '@flughafen/core';

export default createWorkflow()
  .name('My Example')
  // ...
```
````

## 🎨 Customization

### Change Theme Colors

Edit `.vitepress/config.ts`:

```typescript
markdown: {
  theme: {
    light: 'github-light',
    dark: 'github-dark'
  }
}
```

### Add Logo

1. Add `docs/public/logo.svg`
2. Reference in config:

```typescript
themeConfig: {
  logo: '/logo.svg'
}
```

### Custom Navigation

```typescript
nav: [
  { text: 'Home', link: '/' },
  { text: 'Docs', link: '/tutorial' },
  {
    text: 'v1.0.0',
    items: [
      { text: 'Changelog', link: '/changelog' },
      { text: 'Contributing', link: '/contributing' }
    ]
  }
]
```

## 🔍 Features

### Built-in Search

VitePress includes local search - no configuration needed!

```typescript
search: {
  provider: 'local'  // Free, fast, private
}
```

### Dark Mode

Automatic dark mode toggle - no configuration needed!

### Code Highlighting

Supports 100+ languages with automatic syntax highlighting:

````markdown
```typescript
// Automatically highlighted
const workflow = createWorkflow();
```

```yaml
# Also works with YAML
name: My Workflow
```
````

### Edit Links

Direct links to GitHub for editing:

```typescript
editLink: {
  pattern: 'https://github.com/jpwesselink/flughafen/edit/main/docs/:path',
  text: 'Edit this page on GitHub'
}
```

## 🐛 Troubleshooting

### Build Fails Locally

**Problem**: `Cannot find module 'flughafen'`

**Solution**: Build packages first:
```bash
cd ../..
pnpm build
```


### Deployment Fails

**Problem**: GitHub Pages deployment fails

**Solution**: Check GitHub Pages settings:
- Settings → Pages → Source: **GitHub Actions**

### Links Broken in Production

**Problem**: Links work locally but not on GitHub Pages

**Solution**: Use relative links without leading `/`:
```markdown
✅ [Tutorial](./tutorial.md)
❌ [Tutorial](/docs/tutorial.md)
```

### Search Not Working

**Problem**: Local search doesn't find content

**Solution**:
1. Rebuild the site: `pnpm build`
2. Search index is generated during build
3. Preview with `pnpm preview`

## 📊 Performance Tips

### Optimize Images

Use optimized formats:
- SVG for logos and icons
- WebP for photos
- Compress images before adding

### Lazy Load Heavy Content

Use VitePress dynamic imports:

```typescript
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(
  () => import('./HeavyComponent.vue')
);
```

### Monitor Build Times

```bash
# Build with timing
time pnpm build

# Optimize slow pages
vitepress build --debug
```

## 🎯 Best Practices

### 1. Keep Docs Close to Code

- API docs from JSDoc in source
- Examples in `/examples/`
- Tutorials in `/docs/`

### 2. Use Meaningful Titles

```markdown
❌ # Advanced
✅ # Advanced Workflow Patterns
```

### 3. Add Examples

Every feature should have a code example!

### 4. Link Between Docs

Create a documentation web:
```markdown
See [API Reference](./api.md) for details.
```

### 5. Update on Changes

When API changes, update:
1. JSDoc in source code
2. Tutorial examples
3. api.md if needed

## 📚 Resources

- [VitePress Documentation](https://vitepress.dev/)
- [TypeDoc Documentation](https://typedoc.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Markdown Guide](https://www.markdownguide.org/)

## ✅ Checklist

- [ ] GitHub Pages enabled (Settings → Pages → Source: GitHub Actions)
- [ ] Dependencies installed (`pnpm install`)
- [ ] Packages built (`pnpm build`)
- [ ] Local dev works (`pnpm dev`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Deployment workflow updated (if needed)
- [ ] Committed and pushed to `main`
- [ ] Deployment succeeds
- [ ] Site accessible at GitHub Pages URL

## 🎉 Success!

Once configured, documentation updates are completely automatic:

1. ✍️ Edit markdown in `/docs/`
2. 🚀 Push to `main`
3. ⚙️ Workflow runs automatically
4. 🌐 Site deploys to GitHub Pages
5. ✅ Live in ~2 minutes!

---

**Documentation powered by VitePress. Deployment powered by Flughafen. ❤️**
