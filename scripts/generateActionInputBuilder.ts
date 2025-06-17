import fetch from 'node-fetch';
import * as yaml from 'js-yaml';
import { writeFileSync } from 'fs';

/**
 * Generates a TypeScript builder class for the inputs of a given GitHub-hosted action.
 * @param actionRef e.g. "actions/checkout@v4" or "aws-actions/configure-aws-credentials@v4"
 * @param outputPath Path to write the generated .ts file
 */
export async function generateActionInputBuilder(actionRef: string, outputPath: string) {
  // Parse actionRef like "actions/checkout@v4" or "aws-actions/configure-aws-credentials@v4"
  const match = actionRef.match(/^([^/]+)\/(.+)@(.+)$/);
  if (!match) throw new Error('Invalid action reference');
  const [, owner, repo, version] = match;

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${version}/action.yml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch action.yml: ${res.statusText}`);
  const yml = await res.text();
  const action = yaml.load(yml) as any;

  const inputs = action.inputs || {};
  const className = `${repo.replace(/[^a-zA-Z0-9]/g, '_').replace(/(^|_)([a-z])/g, (_, p1, p2) => p2.toUpperCase())}InputsBuilder`;

  let builder = `// Auto-generated builder for ${actionRef} inputs\n`;
  builder += `export class ${className} {\n  private _inputs: Record<string, any> = {};\n`;

  for (const [input, schema] of Object.entries(inputs)) {
    // Convert hyphenated names to camelCase for valid method names
    const methodName = input.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    builder += `  /** ${(schema as any).description || ''} */\n`;
    builder += `  ${methodName}(value: string) {\n    this._inputs['${input}'] = value;\n    return this;\n  }\n`;
  }

  builder += `  build() { return { ...this._inputs }; }\n`;
  builder += `}\n`;

  writeFileSync(outputPath, builder, 'utf8');
  console.log(`Builder written to ${outputPath}`);
}

// CLI usage - accept action reference as command line argument
const actionRef = process.argv[2];
if (!actionRef) {
  console.error('Usage: tsx generateActionInputBuilder.ts <action-ref>');
  console.error('Example: tsx generateActionInputBuilder.ts actions/checkout@v4');
  process.exit(1);
}

// Generate class name and output file from action reference
const match = actionRef.match(/^([^/]+)\/(.+)@(.+)$/);
if (!match) {
  console.error('Invalid action reference. Use format: owner/repo@version');
  process.exit(1);
}

const [, owner, repo] = match;
const className = `${repo.replace(/[^a-zA-Z0-9]/g, '_').replace(/(^|_)([a-z])/g, (_, p1, p2) => p2.toUpperCase())}InputsBuilder`;
const version = match[3].replace(/[^a-zA-Z0-9]/g, '_'); // Clean version for filename
const outputPath = `./generated/${className}_${version}.ts`;

generateActionInputBuilder(actionRef, outputPath)
  .catch(error => {
    console.error('Error generating builder:', error.message);
    process.exit(1);
  });
