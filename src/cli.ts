#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { watch } from 'fs';
import { resolve, basename, extname } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';

interface WatchOptions {
  file: string;
  output?: string;
  silent?: boolean;
}

async function watchWorkflow(options: WatchOptions) {
  const { file, output, silent } = options;
  const filePath = resolve(file);
  
  if (!existsSync(filePath)) {
    console.error(chalk.red(`❌ File not found: ${filePath}`));
    process.exit(1);
  }

  if (!silent) {
    console.log(chalk.blue('🚀 Flughafen Workflow Watcher'));
    console.log(chalk.gray(`Watching: ${filePath}`));
    if (output) {
      console.log(chalk.gray(`Output: ${output}`));
    }
    console.log(chalk.gray('Press Ctrl+C to stop watching\n'));
  }

  // Generate initial YAML
  await generateYAML(filePath, output, silent);

  // Watch for changes
  const watcher = watch(filePath, { persistent: true }, async (eventType) => {
    if (eventType === 'change') {
      if (!silent) {
        console.log(chalk.yellow(`📝 File changed, regenerating YAML...`));
      }
      await generateYAML(filePath, output, silent);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.green('\n👋 Watcher stopped. Goodbye!'));
    process.exit(0);
  });
}

async function generateYAML(filePath: string, outputPath?: string, silent?: boolean) {
  try {
    // Clear require cache to get fresh module
    delete require.cache[require.resolve(filePath)];
    
    // Import the workflow file
    const workflowModule = await import(filePath + '?t=' + Date.now());
    
    // Look for default export or named exports
    let workflow = workflowModule.default || workflowModule.workflow;
    
    if (!workflow) {
      // Try to find any exported workflow builder
      const exports = Object.values(workflowModule);
      workflow = exports.find((exp: any) => 
        exp && typeof exp === 'object' && typeof exp.toYAML === 'function'
      );
    }

    if (!workflow || typeof workflow.toYAML !== 'function') {
      throw new Error('No workflow builder found. Make sure to export a WorkflowBuilder instance.');
    }

    const yaml = workflow.toYAML();
    
    if (outputPath) {
      const fs = await import('fs/promises');
      await fs.writeFile(outputPath, yaml, 'utf8');
      if (!silent) {
        console.log(chalk.green(`✅ YAML saved to: ${outputPath}`));
      }
    } else {
      if (!silent) {
        console.log(chalk.cyan('📄 Generated YAML:'));
        console.log(chalk.gray('─'.repeat(50)));
      }
      console.log(yaml);
      if (!silent) {
        console.log(chalk.gray('─'.repeat(50)));
      }
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error generating YAML: ${error instanceof Error ? error.message : error}`));
    if (error instanceof Error && error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
  }
}

// CLI setup
yargs(hideBin(process.argv))
  .command(
    'watch <file>',
    'Watch a workflow file and generate YAML on changes',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to the workflow TypeScript/JavaScript file',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path for the generated YAML',
          type: 'string',
        })
        .option('silent', {
          alias: 's',
          describe: 'Run in silent mode (only output YAML)',
          type: 'boolean',
          default: false,
        });
    },
    async (argv) => {
      await watchWorkflow({
        file: argv.file,
        output: argv.output,
        silent: argv.silent,
      });
    }
  )
  .command(
    'generate <file>',
    'Generate YAML from a workflow file (one-time)',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to the workflow TypeScript/JavaScript file',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path for the generated YAML',
          type: 'string',
        })
        .option('silent', {
          alias: 's',
          describe: 'Run in silent mode (only output YAML)',
          type: 'boolean',
          default: false,
        });
    },
    async (argv) => {
      const filePath = resolve(argv.file);
      if (!existsSync(filePath)) {
        console.error(chalk.red(`❌ File not found: ${filePath}`));
        process.exit(1);
      }
      await generateYAML(filePath, argv.output, argv.silent);
    }
  )
  .option('version', {
    alias: 'v',
    describe: 'Show version number',
  })
  .help()
  .alias('help', 'h')
  .demandCommand(1, 'You need to specify a command')
  .strict()
  .argv;
