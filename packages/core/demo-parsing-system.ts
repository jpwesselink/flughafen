#!/usr/bin/env tsx

import { ParsingSystem } from './src/parsing';

async function demo() {
  console.log('🚀 Flughafen New Parsing System Demo\n');

  // Create the parsing system with default configuration
  const system = ParsingSystem.createDefault();

  // Test with real-world examples directory
  const examplesDir = '/Users/jpwesselink/projects/flughafen/examples/real-world-examples';

  try {
    console.log(`📂 Processing files in: ${examplesDir}\n`);

    // ONLY process files officially supported by GitHub
    // Reference: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features
    const patterns = [
      // === GITHUB ACTIONS ===
      "**/.github/workflows/*.{yml,yaml}",           // GitHub Actions workflows (official)
      "**/.github/actions/*/action.{yml,yaml}",     // Local GitHub Actions (official)

      // === DEPENDENCY MANAGEMENT ===
      "**/.github/dependabot.{yml,yaml}",           // Dependabot configuration (official)

      // === COMMUNITY HEALTH ===
      "**/.github/FUNDING.{yml,yaml}",              // GitHub Sponsors funding (official)
      "**/.github/CODEOWNERS",                      // Code ownership (official, no extension)
      "**/CODEOWNERS",                              // Code ownership (root alternative)
      "**/CODE_OF_CONDUCT.{md,txt}",                // Code of conduct (official)
      "**/.github/CODE_OF_CONDUCT.{md,txt}",        // Code of conduct (.github alternative)
      "**/CONTRIBUTING.{md,txt}",                   // Contributing guidelines (official)
      "**/.github/CONTRIBUTING.{md,txt}",           // Contributing guidelines (.github alternative)
      "**/SECURITY.{md,txt}",                       // Security policy (official)
      "**/.github/SECURITY.{md,txt}",               // Security policy (.github alternative)
      "**/SUPPORT.{md,txt}",                        // Support resources (official)
      "**/.github/SUPPORT.{md,txt}",                // Support resources (.github alternative)
      "**/README.{md,txt,rst}",                     // Repository description (official)
      "**/LICENSE{,.md,.txt}",                      // License file (official)
      "**/COPYING{,.md,.txt}",                      // License file (alternative name)
      "**/CITATION.cff",                            // Citation file format (official)

      // === ISSUE & PR TEMPLATES ===
      "**/.github/ISSUE_TEMPLATE/*.{yml,yaml,md}", // Issue templates (official)
      "**/.github/ISSUE_TEMPLATE/config.yml",     // Issue template config (official)
      "**/.github/PULL_REQUEST_TEMPLATE{.md,/*.md}", // PR templates (official)
      "**/.github/DISCUSSION_TEMPLATE/*.{yml,yaml}", // Discussion templates (official)

      // === GITHUB PAGES ===
      "**/_config.yml",                           // Jekyll configuration (official)
      "**/CNAME",                                  // Custom domain (official, no extension)

      // === GITHUB RELEASES ===
      "**/.github/release.yml",                   // Release configuration (official)
    ];

    const allResults = [];
    for (const pattern of patterns) {
      const patternResults = await system.processDirectory(examplesDir, pattern);
      allResults.push(...patternResults);
    }

    const results = allResults;

    // Filter to only show successful results for cleaner output
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(`✅ Successfully processed ${successfulResults.length} officially GitHub-supported files (${failedResults.length} without parsers):\n`);

    for (const result of successfulResults) {
      console.log(`✅ ${result.file.relativePath}`);
      console.log(`   Kind: ${result.kind}`);
      console.log(`   Handler: ${result.handler}`);

      if (result.output) {
        const preview = result.output.split('\n').slice(0, 3).join('\n');
        console.log(`   Preview: ${preview}...`);
      }

      console.log();
    }

    if (failedResults.length > 0) {
      console.log(`\n⚠️ ${failedResults.length} officially GitHub-supported files that need parsers:\n`);

      // Group failed results by reason/pattern
      const groupedFailures = failedResults.reduce((acc, result) => {
        const reason = result.error || 'Unknown error';
        if (!acc[reason]) {
          acc[reason] = [];
        }
        acc[reason].push(result.file.relativePath);
        return acc;
      }, {} as Record<string, string[]>);

      // Display as a table
      console.log('┌─────────────────────────────────────────────────────────────────────┬───────┐');
      console.log('│ GitHub-Supported File Type (Parser Needed)                            │ Count │');
      console.log('├─────────────────────────────────────────────────────────────────────┼───────┤');

      Object.entries(groupedFailures).forEach(([reason, files]) => {
        console.log(`│ ${reason.padEnd(67)} │ ${files.length.toString().padStart(5)} │`);

        // Show first few examples
        const examples = files.slice(0, 3);
        examples.forEach(file => {
          const truncated = file.length > 65 ? file.substring(0, 62) + '...' : file;
          console.log(`│   ${truncated.padEnd(65)} │       │`);
        });

        if (files.length > 3) {
          console.log(`│   ... and ${(files.length - 3)} more files${' '.repeat(37)} │       │`);
        }
        console.log('├─────────────────────────────────────────────────────────────────────┼───────┤');
      });

      console.log('└─────────────────────────────────────────────────────────────────────┴───────┘');
    }

    // Summary
    const byKind = successfulResults.reduce((acc, r) => {
      acc[r.kind] = (acc[r.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`📊 Summary:`);
    console.log(`   Successfully processed: ${successfulResults.length}/${results.length}`);
    console.log(`   By type:`, byKind);

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Also demo in-memory processing
async function demoInMemory() {
  console.log('\n🧠 In-Memory Processing Demo\n');

  const system = ParsingSystem.createDefault();

  // Create some test files in memory
  const testFiles = [
    system.inMemory.createFile(
      {
        path: '.github/workflows/ci.yml',
        basename: 'ci.yml',
        name: 'ci',
        ext: '.yml',
        dir: '.github/workflows',
        relativePath: '.github/workflows/ci.yml'
      },
      {
        name: 'CI Pipeline',
        on: { push: { branches: ['main'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Test', run: 'npm test' }
            ]
          }
        }
      }
    ),
    system.inMemory.createFile(
      {
        path: '.github/FUNDING.yml',
        basename: 'FUNDING.yml',
        name: 'FUNDING',
        ext: '.yml',
        dir: '.github',
        relativePath: '.github/FUNDING.yml'
      },
      {
        github: 'flughafen',
        patreon: 'support-flughafen'
      }
    )
  ];

  const results = system.inMemory.processFiles(testFiles);

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.file.path} → ${result.kind} (${result.handler})`);

    if (result.success && result.output) {
      // Show first few lines of generated TypeScript
      const lines = result.output.split('\n').slice(0, 5);
      console.log(`   Generated TypeScript:`);
      lines.forEach(line => console.log(`     ${line}`));
      console.log(`     ...`);
    }
    console.log();
  }
}

// Run the demos
demo().then(() => demoInMemory());