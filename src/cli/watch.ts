#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename, extname, join, dirname } from 'path';

interface WatchOptions {
  file: string;
  dir?: string; // Output directory
  silent?: boolean;
  format?: boolean;
}

interface WorkflowResult {
  workflow: any;
  yaml: string;
  filename?: string;
}

/**
 * Generate output file path from input file path and optional output directory
 */
function generateOutputPath(inputFile: string, outputDir?: string): string {
  const inputBasename = basename(inputFile, extname(inputFile)); // Remove extension
  const outputFilename = `${inputBasename}.yml`;
  
  if (outputDir) {
    return join(outputDir, outputFilename);
  }
  
  // Default to same directory as input file
  return join(dirname(inputFile), outputFilename);
}

/**
 * Dynamically import and execute a workflow file
 */
async function executeWorkflowFile(filePath: string): Promise<WorkflowResult> {
  try {
    // Clear the module cache to ensure fresh execution
    const absolutePath = resolve(filePath);
    delete require.cache[absolutePath];
    
    // Import the module
    const workflowModule = await import(absolutePath);
    
    // Look for common export patterns
    let workflow;
    if (workflowModule.default) {
      workflow = workflowModule.default;
    } else if (workflowModule.workflow) {
      workflow = workflowModule.workflow;
    } else {
      // Look for the first exported function or object with a toYAML method
      for (const key of Object.keys(workflowModule)) {
        const exported = workflowModule[key];
        if (exported && typeof exported.toYAML === 'function') {
          workflow = exported;
          break;
        }
        if (typeof exported === 'function') {
          try {
            const result = exported();
            if (result && typeof result.toYAML === 'function') {
              workflow = result;
              break;
            }
          } catch {
            // Ignore execution errors, continue searching
          }
        }
      }
    }
    
    if (!workflow) {
      throw new Error('No workflow found. Export a workflow with toYAML() method as default export, workflow export, or any named export.');
    }
    
    // If it's a function, call it
    if (typeof workflow === 'function') {
      workflow = workflow();
    }
    
    // Check if it has toYAML method
    if (!workflow || typeof workflow.toYAML !== 'function') {
      throw new Error('Exported workflow must have a toYAML() method.');
    }

    const yaml = workflow.toYAML();
    const filename = typeof workflow.getFilename === 'function' ? workflow.getFilename() : undefined;
    
    return {
      workflow,
      yaml,
      filename
    };
  } catch (error) {
    throw new Error(`Failed to execute workflow file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate YAML from workflow file
 */
async function generateYaml(filePath: string, options: WatchOptions): Promise<void> {
  try {
    if (!options.silent) {
      process.stdout.write(chalk.blue('⚡ Generating workflow YAML... '));
    }
    
    const result = await executeWorkflowFile(filePath);
    
    // Determine output path
    let outputPath: string | undefined;
    if (options.dir || result.filename) {
      if (result.filename) {
        // Use filename from workflow builder
        outputPath = options.dir 
          ? resolve(options.dir, result.filename)
          : resolve(result.filename);
      } else if (options.dir) {
        // Use generateOutputPath for backward compatibility
        outputPath = generateOutputPath(filePath, options.dir);
      }
    }
    
    if (outputPath) {
      // Ensure the output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      writeFileSync(outputPath, result.yaml, 'utf-8');
      if (!options.silent) {
        console.log(chalk.green(`✅ YAML written to ${chalk.cyan(outputPath)}`));
      }
    } else {
      if (!options.silent) {
        console.log(chalk.green('✅ Generated YAML:'));
        console.log(chalk.gray('─'.repeat(50)));
      }
      console.log(result.yaml);
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
  }
}

/**
 * Watch a workflow file for changes
 */
function watchWorkflowFile(filePath: string, options: WatchOptions): void {
  const absolutePath = resolve(filePath);
  
  if (!existsSync(absolutePath)) {
    console.error(chalk.red(`Error: File ${absolutePath} does not exist.`));
    process.exit(1);
  }
  
  console.log(chalk.blue(`🔍 Watching ${chalk.cyan(absolutePath)} for changes...`));
  console.log(chalk.gray(`Press ${chalk.white('Ctrl+C')} to stop watching\n`));
  
  // Generate initial YAML
  generateYaml(absolutePath, options);
  
  // Watch for changes
  const watcher = chokidar.watch(absolutePath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  
  watcher.on('change', () => {
    if (!options.silent) {
      console.log(chalk.yellow(`\n📝 File changed at ${new Date().toLocaleTimeString()}`));
    }
    generateYaml(absolutePath, options);
  });
  
  watcher.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Watcher error: ${errorMessage}`));
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.blue('\n\n👋 Stopping file watcher...'));
    watcher.close();
    process.exit(0);
  });
}

/**
 * Main CLI function
 */
function main() {
  yargs(hideBin(process.argv))
    .command(
      'watch <file>',
      'Watch a workflow file and generate YAML on changes',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Workflow file to watch (.ts or .js)',
            type: 'string',
            demandOption: true
          })
          .option('dir', {
            alias: 'd',
            describe: 'Output directory for generated YAML (uses workflow.filename() or derives from input)',
            type: 'string'
          })
          .option('silent', {
            alias: 's',
            describe: 'Silent mode - minimal output',
            type: 'boolean',
            default: false
          })
          .option('format', {
            alias: 'f',
            describe: 'Format the output YAML',
            type: 'boolean',
            default: true
          });
      },
      (argv) => {
        watchWorkflowFile(argv.file, argv as WatchOptions);
      }
    )
    .command(
      'generate <file>',
      'Generate YAML from a workflow file (one-time)',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Workflow file to process (.ts or .js)',
            type: 'string',
            demandOption: true
          })
          .option('dir', {
            alias: 'd',
            describe: 'Output directory for generated YAML (uses workflow.filename() or derives from input)',
            type: 'string'
          })
          .option('silent', {
            alias: 's',
            describe: 'Silent mode - minimal output',
            type: 'boolean',
            default: false
          });
      },
      async (argv) => {
        await generateYaml(argv.file, argv as WatchOptions);
      }
    )
    .demandCommand(1, 'You need to specify a command')
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .example('$0 watch my-workflow.ts', 'Watch my-workflow.ts and output YAML to console')
    .example('$0 watch my-workflow.ts -d .github/workflows', 'Watch and save to directory (uses workflow.filename())')
    .example('$0 generate my-workflow.ts', 'Generate YAML once and output to console')
    .example('$0 generate my-workflow.ts -d .github/workflows', 'Generate and save to GitHub Actions directory')
    .epilogue('For more information, visit: https://github.com/your-repo/flughafen')
    .argv;
}

// Run the CLI
if (require.main === module) {
  main();
}

export { main, watchWorkflowFile, generateYaml };
