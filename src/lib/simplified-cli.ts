/**
 * Updated CLI using the new workflow processor library
 * This shows how much cleaner the CLI becomes
 */

import { processWorkflowModuleWithStandaloneActions, writeWorkflowFiles } from '../lib/workflow-processor';
import chalk from 'chalk';
import { resolve } from 'path';

interface SimplifiedCLIOptions {
  file: string;
  dir?: string;
  silent?: boolean;
}

/**
 * Simplified workflow generation using the processor library
 */
export async function generateWorkflowSimplified(options: SimplifiedCLIOptions): Promise<void> {
  try {
    if (!options.silent) {
      process.stdout.write(chalk.blue('⚡ Processing workflow... '));
    }

    // Import the workflow file
    const absolutePath = resolve(options.file);
    const workflowModule = await import(`file://${absolutePath}`);
    
    // Process using the library
    const result = processWorkflowModuleWithStandaloneActions(workflowModule, {
      workflowsDir: options.dir || '.github/workflows',
      actionsDir: options.dir ? `${options.dir}/actions` : '.github/actions'
    });

    if (options.dir) {
      // Write files to directory
      await writeWorkflowFiles(result, '.');
      
      if (!options.silent) {
        console.log(chalk.green('✅ Generated files:'));
        console.log(chalk.cyan(`  📄 ${result.workflow.filename}`));
        
        for (const actionPath of Object.keys(result.actions)) {
          console.log(chalk.cyan(`  📦 ${actionPath}`));
        }
        
        const totalFiles = 1 + Object.keys(result.actions).length;
        console.log(chalk.blue(`\n🎉 Generation complete! (${totalFiles} files)`));
      }
    } else {
      // Console output mode
      if (!options.silent) {
        console.log(chalk.green('✅ Generated workflow:'));
        console.log(chalk.gray('─'.repeat(50)));
      }
      
      // Show local actions first
      for (const [actionPath, actionContent] of Object.entries(result.actions)) {
        if (!options.silent) {
          console.log(chalk.blue(`\n📦 ${actionPath}`));
          console.log(chalk.gray('─'.repeat(30)));
        }
        console.log(actionContent);
      }
      
      if (!options.silent) {
        console.log(chalk.blue(`\n📄 ${result.workflow.filename}`));
        console.log(chalk.gray('─'.repeat(50)));
      }
      console.log(result.workflow.content);
      
      if (!options.silent) {
        console.log(chalk.gray('─'.repeat(50)));
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!options.silent) {
      console.log(chalk.red(`❌ Error: ${errorMessage}`));
    } else {
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
    throw error;
  }
}

// Example usage comparison
export function showCLIComparison() {
  console.log('=== CLI Comparison ===\n');
  
  console.log('OLD CLI (complex):');
  console.log('- executeWorkflowFile()');
  console.log('- Extract workflow');
  console.log('- Extract local actions via multiple methods');
  console.log('- Generate output paths');
  console.log('- Write files with complex logic');
  console.log('- Handle errors');
  
  console.log('\nNEW CLI (simple):');
  console.log('- Import workflow module');
  console.log('- processWorkflowModuleWithStandaloneActions()');
  console.log('- writeWorkflowFiles()');
  console.log('- Done! ✨');
  
  console.log('\nBenefits:');
  console.log('✅ Separation of concerns');
  console.log('✅ Reusable library');
  console.log('✅ Easier testing');
  console.log('✅ Cleaner CLI code');
  console.log('✅ Consistent file structure');
}

export default generateWorkflowSimplified;
