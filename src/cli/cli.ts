#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { processWorkflowFile, validateWorkflowFile, type ProcessWorkflowOptions } from '../utils';
import { SchemaManager } from '../lib/schema/SchemaManager';

interface SynthOptions {
  file: string;
  dir?: string;
  output?: string;
  silent?: boolean;
  verbose?: boolean;
  'dry-run'?: boolean;
}

interface GenerateTypesOptions {
  'workflow-dir'?: string;
  'output'?: string;
  'github-token'?: string;
  'include-jsdoc'?: boolean;
  'silent'?: boolean;
  'verbose'?: boolean;
}

/**
 * Synth command: compile TypeScript, execute in sandbox, call synth(), write files
 */
async function synthCommand(options: SynthOptions): Promise<void> {
  try {
    const { file, dir, output, silent = false, verbose = false } = options;
    const dryRun = options['dry-run'] || false;
    
    if (!silent && !dryRun) {
      console.log(chalk.blue('🚀 Synthesizing workflow...'));
    }

    // Validate file first
    if (verbose) {
      console.log(chalk.gray('🔍 Validating workflow file...'));
    }
    
    const validation = await validateWorkflowFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Workflow file validation failed');
    }

    if (verbose) {
      console.log(chalk.green(`✅ File validation passed (${validation.fileType})`));
    }

    // Pre-load flughafen module for sandbox
    let flughavenModule: any;
    try {
      // Use dynamic import to load our own module
      flughavenModule = await import('../index.js');
    } catch (error) {
      if (verbose) {
        console.log(chalk.yellow('⚠️  Could not pre-load flughafen module, using fallback'));
      }
    }

    // Process the workflow
    const processOptions: ProcessWorkflowOptions = {
      writeFiles: !dryRun,
      verbose,
      writeOptions: {
        // Don't set baseDir when using custom basePath to avoid double prefixing
        verbose
      },
      synthOptions: (dir || output) ? {
        basePath: dir || output
      } : {},
      sandboxOptions: {
        additionalGlobals: flughavenModule ? { __preloadedFlughafen: flughavenModule } : {}
      }
    };

    const result = await processWorkflowFile(file, processOptions);

    if (dryRun) {
      // In dry-run mode, just output the workflow YAML to console
      if (!silent) {
        console.log(chalk.blue('\n📄 Generated workflow YAML:'));
        console.log(chalk.gray('─'.repeat(50)));
      }
      console.log(result.synthResult.workflow.content);
      
      if (Object.keys(result.synthResult.actions).length > 0) {
        if (!silent) {
          console.log(chalk.blue('\n📦 Generated action files:'));
          console.log(chalk.gray('─'.repeat(50)));
        }
        
        for (const [actionPath, actionContent] of Object.entries(result.synthResult.actions)) {
          if (!silent) {
            console.log(chalk.cyan(`\n→ ${actionPath}:`));
          }
          console.log(actionContent);
        }
      }
      
      if (!silent) {
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.yellow('ℹ️  Dry run - no files written to disk'));
      }
    } else {
      // Files were written
      if (!silent) {
        const { summary, writeResult } = result;
        console.log(chalk.green('\n✅ Synthesis complete!'));
        console.log(chalk.gray(`Generated ${summary.totalFiles} files (${summary.totalSize} bytes)`));
        
        if (writeResult) {
          console.log(chalk.cyan(`📄 Workflow: ${writeResult.workflowPath}`));
          if (writeResult.actionPaths.length > 0) {
            console.log(chalk.cyan(`📦 Actions: ${writeResult.actionPaths.length} files`));
            if (verbose) {
              writeResult.actionPaths.forEach(actionPath => {
                console.log(chalk.gray(`   → ${actionPath}`));
              });
            }
          }
        }
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!options.silent) {
      console.log(chalk.red(`❌ Error: ${errorMessage}`));
    } else {
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
    process.exit(1);
  }
}

/**
 * Generate types command: scan workflows and generate TypeScript interfaces
 */
async function generateTypesCommand(options: GenerateTypesOptions): Promise<void> {
  try {
    const { 
      'workflow-dir': workflowDir, 
      output,
      'github-token': githubToken,
      'include-jsdoc': includeJSDoc = true,
      silent = false,
      verbose = false 
    } = options;
    
    if (!silent) {
      console.log(chalk.blue('🔍 Generating types for GitHub Actions...'));
    }

    const manager = new SchemaManager({
      workflowDir,
      typesFilePath: output,
      githubToken,
      includeJSDoc,
    });

    if (verbose) {
      console.log(chalk.gray(`📁 Scanning directory: ${workflowDir || process.cwd()}`));
      console.log(chalk.gray(`📄 Output file: ${output || './flughafen-actions.d.ts'}`));
    }

    // Generate types from workflow files
    const result = await manager.generateTypesFromWorkflowFiles();

    if (!silent) {
      console.log(chalk.green('✅ Type generation completed!\n'));
      console.log(`📊 Results:`);
      console.log(`   - Actions processed: ${result.actionsProcessed}`);
      console.log(`   - Schemas fetched: ${result.schemasFetched}`);
      console.log(`   - Interfaces generated: ${result.interfacesGenerated}`);
      console.log(`   - Types file: ${result.typesFilePath}`);
      
      if (result.failedActions.length > 0) {
        console.log(chalk.yellow(`   - Failed actions: ${result.failedActions.join(', ')}`));
      }
      
      if (verbose) {
        console.log('\n📋 Generated Interfaces:');
        result.interfaces.forEach((iface) => {
          console.log(`   - ${iface.actionName} -> ${iface.interfaceName}`);
        });
      }
      
      console.log(chalk.green('\n🎉 Types are now available for type-safe .with() calls!'));
      console.log(chalk.gray('No imports needed - TypeScript will automatically discover the types.'));
    }

  } catch (error) {
    if (!options.silent) {
      console.error(chalk.red('❌ Type generation failed:'), error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}

/**
 * Main CLI function
 */
export function main(): void {
  yargs(hideBin(process.argv))
    .command(
      'synth <file>',
      'Synthesize GitHub Actions workflow and actions from TypeScript/JavaScript',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Workflow file to synthesize (.ts or .js)',
            type: 'string',
            demandOption: true
          })
          .option('dir', {
            alias: 'd',
            describe: 'Base output directory (workflow goes to {dir}/workflows/, actions to {dir}/actions/)',
            type: 'string'
          })
          .option('output', {
            alias: 'o',
            describe: 'Output directory (alias for --dir)',
            type: 'string'
          })
          .option('dry-run', {
            describe: 'Show what would be generated without writing files',
            type: 'boolean',
            default: false
          })
          .option('silent', {
            alias: 's',
            describe: 'Silent mode - minimal output',
            type: 'boolean',
            default: false
          })
          .option('verbose', {
            describe: 'Verbose mode - detailed output',
            type: 'boolean',
            default: false
          });
      },
      async (argv) => {
        try {
          await synthCommand(argv as SynthOptions);
        } catch (error) {
          console.error(chalk.red('CLI Error:'), error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      }
    )
    .command(
      'generate-types',
      'Generate TypeScript types for GitHub Actions from workflow files',
      (yargs) => {
        return yargs
          .option('workflow-dir', {
            alias: 'w',
            describe: 'Directory containing workflow files',
            type: 'string',
            default: process.cwd()
          })
          .option('output', {
            alias: 'o',
            describe: 'Output file for generated types',
            type: 'string',
            default: './flughafen-actions.d.ts'
          })
          .option('github-token', {
            describe: 'GitHub token for accessing private repos and actions',
            type: 'string'
          })
          .option('include-jsdoc', {
            describe: 'Include JSDoc comments in the generated types',
            type: 'boolean',
            default: true
          })
          .option('silent', {
            alias: 's',
            describe: 'Silent mode - minimal output',
            type: 'boolean',
            default: false
          })
          .option('verbose', {
            describe: 'Verbose mode - detailed output',
            type: 'boolean',
            default: false
          });
      },
      async (argv) => {
        try {
          await generateTypesCommand(argv as GenerateTypesOptions);
        } catch (error) {
          console.error(chalk.red('CLI Error:'), error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'You need to specify a command')
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .example('$0 synth my-workflow.ts', 'Synthesize workflow and output to console')
    .example('$0 synth my-workflow.ts -d .github', 'Synthesize and save to .github/workflows/ and .github/actions/')
    .example('$0 synth my-workflow.ts --dry-run', 'Preview what would be generated')
    .example('$0 synth my-workflow.ts -v', 'Verbose output showing all processing steps')
    .example('$0 generate-types', 'Generate types for all actions in current directory')
    .example('$0 generate-types -w ./workflows', 'Generate types from specific workflow directory')
    .example('$0 generate-types -o ./types/actions.d.ts', 'Generate types to custom output file')
    .example('$0 generate-types --github-token $TOKEN', 'Use GitHub token for private repos')
    .epilogue('For more information, visit: https://github.com/your-repo/flughafen')
    .argv;
}

// Run the CLI (check if this file is being run directly)
// For CommonJS builds, check require.main
const isMainModule = typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
// For ES module builds, we'll check if this file is being run directly
if (isMainModule) {
  main();
}
