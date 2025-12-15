import { FundingAnalyzer } from './packages/core/src/funding/funding-analyzer';

// Create analyzer instance
const analyzer = new FundingAnalyzer();

// Test YAML content
const fundingYaml = `# Sample FUNDING.yml
github: [octocat, sponsor2]
patreon: username
open_collective: projectname
ko_fi: kofiname
custom: ['https://example.com/donate', 'https://paypal.me/user']`;

console.log('🔍 Analyzing FUNDING.yml content...\n');
console.log('Input YAML:');
console.log(fundingYaml);
console.log('\n' + '='.repeat(50) + '\n');

// Analyze the content
const analysis = analyzer.analyzeFundingFromContent(fundingYaml, 'FUNDING.yml');

console.log('📊 Analysis Results:');
console.log('├── Platforms detected:', analysis.platforms);
console.log('├── Total platforms:', analysis.totalPlatforms);
console.log('├── Has GitHub Sponsors:', analysis.hasGitHubSponsors);
console.log('├── Has custom URLs:', analysis.hasCustomUrls);
console.log('└── Configuration:');
console.log(JSON.stringify(analysis.config, null, 4));

console.log('\n' + '='.repeat(50) + '\n');

// Generate TypeScript code
console.log('🚀 Generated TypeScript:');
const tsCode = analyzer.generateTypeScript(analysis.config);
console.log(tsCode);