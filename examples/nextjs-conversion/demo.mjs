#!/usr/bin/env node

import { WorkflowParser } from '../../packages/flughafen/dist/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

console.log('🚀 Next.js Workflow Conversion Demo\n');

// Create a workflow parser instance
const parser = new WorkflowParser();

// List of Next.js workflows to convert
const workflows = [
  'build_reusable.yml',
  'test_examples.yml'
];

console.log('📁 Converting Next.js workflows to TypeScript...\n');

for (const workflow of workflows) {
  try {
    const inputPath = `../real-world-examples/next-js/.github/workflows/${workflow}`;
    const outputPath = `./${workflow.replace('.yml', '.ts')}`;
    
    console.log(`🔄 Converting: ${workflow}`);
    
    // Read the YAML workflow
    const yamlContent = readFileSync(inputPath, 'utf8');
    
    // Use Flughafen's reverse engineering
    const result = await parser.reverseWorkflow(inputPath, {
      validateOnly: false,
      writeFiles: false
    });
    
    console.log('   📊 Result keys:', Object.keys(result));
    
    // Write the TypeScript output
    let tsContent;
    if (result.generatedFiles && result.generatedFiles.length > 0) {
      const workflowFile = result.generatedFiles.find(f => f.type === 'workflow');
      if (workflowFile) {
        tsContent = workflowFile.content;
      }
    }
    
    if (!tsContent) {
      console.log('   ⚠️  No workflow file generated, checking other content...');
      console.log('   📊 Generated files:', result.generatedFiles?.map(f => f.type));
      if (result.generatedFiles && result.generatedFiles.length > 0) {
        tsContent = result.generatedFiles[0].content;
      }
    }
    
    if (!tsContent) {
      throw new Error('No TypeScript code generated');
    }
    
    // Create directory if needed
    const dir = dirname(outputPath);
    if (dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(outputPath, tsContent, 'utf8');
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`   📏 YAML: ${yamlContent.split('\n').length} lines → TS: ${tsContent.split('\n').length} lines`);
    console.log(`   📝 First few lines:`)
    console.log(tsContent.split('\n').slice(0, 5).map(line => `      ${line}`).join('\n'));
    console.log('');
    
  } catch (error) {
    console.error(`❌ Error converting ${workflow}:`, error.message);
  }
}

console.log('🎉 Next.js workflow conversion complete!');