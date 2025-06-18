#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, basename, extname, dirname } from 'path';
import { createContext, runInContext } from 'vm';
import { transformSync } from 'esbuild';
import { validateWorkflowYAML, validateActionYAML, formatValidationErrors } from '../lib/validation';

interface WatchOptions {
  file: string;
  dir?: string; // Output directory
  silent?: boolean;
  format?: boolean;
  validate?: boolean;
}

interface WorkflowResult {
  workflow: any;
  yaml: string;
  filename?: string;
  workflowName?: string;
  localActions?: LocalActionFile[];
}

interface LocalActionFile {
  path: string;
  yaml: string;
}

/**
 * Generate output file path from input file path and optional output directory
 * @deprecated - Now using workflows subdirectory structure
 */
// function generateOutputPath(inputFile: string, outputDir?: string): string {
//   const inputBasename = basename(inputFile, extname(inputFile)); // Remove extension
//   const outputFilename = `${inputBasename}.yml`;
//   
//   if (outputDir) {
//     return join(outputDir, outputFilename);
//   }
//   
//   // Default to same directory as input file
//   return join(dirname(inputFile), outputFilename);
// }

/**
 * Convert a workflow name to a filename
 * Example: "Node.js CI Pipeline" → "node-js-ci-pipeline.yml"
 * @internal TODO: Use this for workflow name fallback in filename generation
 */
function nameToFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
    + '.yml';
}

// Suppress unused warning - TODO: integrate with filename generation
nameToFilename;

/**
 * Compile TypeScript code to JavaScript using esbuild
 */
function compileTypeScript(code: string, filePath: string): string {
  try {
    const result = transformSync(code, {
      loader: 'ts',
      target: 'node18',
      format: 'cjs',
      sourcefile: filePath,
      platform: 'node',
      // Keep require/module.exports for VM compatibility
      define: {
        'import.meta': 'undefined'
      }
    });
    
    return result.code;
  } catch (error) {
    throw new Error(`TypeScript compilation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a sandboxed context for executing workflow files
 */
function createSandboxContext() {
  // Pre-load the flughafen module outside the VM context
  let flughavenModule: any;
  try {
    const flughavenRoot = process.env.FLUGHAFEN_ROOT || process.cwd();
    const mainPath = resolve(flughavenRoot, 'dist/index.js');
    flughavenModule = require(mainPath);
  } catch (err) {
    console.warn('Warning: Could not pre-load flughafen module:', err);
  }
  
  const context = {
    // Essential globals
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Buffer,
    process: {
      env: process.env,
      cwd: process.cwd,
      version: process.version,
      versions: process.versions
    },
    
    // Module system - handle both JS and compiled TS modules
    require: (id: string) => {
      // Only allow specific modules to be required
      const allowedModules = [
        'path', 'fs', 'util', 'crypto', 'os',
        // Allow flughafen modules - need to resolve to actual paths
        '../index.js', './index.js', '../lib', './lib', 
        '../../index.js', '../../../index.js',
        '../dist/index.js', '../../dist/index.js', '../../../dist/index.js',
        // Allow importing from current working directory
        'flughafen'
      ];
      
      // For relative imports, resolve them relative to the current file
      if (id.startsWith('./') || id.startsWith('../')) {
        let resolvedPath = resolve(context.__dirname || '.', id);
        
        
        // Try multiple extensions for TypeScript compatibility
        const extensions = ['.js', '.ts', '.json'];
        const tryPaths = [resolvedPath];
        
        // If no extension, try with common extensions
        if (!extname(resolvedPath)) {
          extensions.forEach(ext => tryPaths.push(resolvedPath + ext));
          // Also try index files
          tryPaths.push(resolve(resolvedPath, 'index.js'), resolve(resolvedPath, 'index.ts'));
        }
        
        for (const tryPath of tryPaths) {
          try {
            if (existsSync(tryPath)) {
              // If it's a TypeScript file, compile it first
              if (tryPath.endsWith('.ts')) {
                const tsCode = readFileSync(tryPath, 'utf-8');
                const jsCode = compileTypeScript(tsCode, tryPath);
                
                // Create a mini VM context to execute the TS module
                const moduleContext = createSandboxContext();
                moduleContext.__dirname = dirname(tryPath);
                moduleContext.__filename = tryPath;
                
                runInContext(jsCode, moduleContext);
                return moduleContext.module.exports || moduleContext.exports;
              } else {
                return require(tryPath);
              }
            }
          } catch (err) {
            // Continue to next path
            continue;
          }
        }
        
        throw new Error(`Cannot resolve module '${id}' from ${context.__dirname}`);
      }
      
      if (allowedModules.includes(id)) {
        try {
          return require(id);
        } catch (err) {
          throw new Error(`Cannot require '${id}': ${err}`);
        }
      }
      
      // Special handling for 'flughafen' module
      if (id === 'flughafen') {
        if (flughavenModule) {
          return flughavenModule;
        } else {
          throw new Error(`Cannot require 'flughafen': module not pre-loaded`);
        }
      }
      
      throw new Error(`Module '${id}' is not allowed in sandbox`);
    },
    
    // Common globals
    global: undefined,
    __dirname: undefined,
    __filename: undefined,
    
    // Exports handling
    exports: {},
    module: { exports: {} }
  };
  
  return createContext(context);
}

/**
 * Dynamically import and execute a workflow file in a VM sandbox
 */
async function executeWorkflowFile(filePath: string): Promise<WorkflowResult> {
  try {
    const absolutePath = resolve(filePath);
    let code = readFileSync(absolutePath, 'utf-8');
    
    // Compile TypeScript to JavaScript if needed
    if (absolutePath.endsWith('.ts')) {
      code = compileTypeScript(code, absolutePath);
    }
    
    // Check for ES module patterns that would break in VM sandbox
    // For TypeScript files, esbuild should handle ES modules -> CommonJS conversion
    if (absolutePath.endsWith('.ts')) {
      // For TypeScript files, check if the compiled code has module.exports (CommonJS)
      // If so, we can safely run it in the sandbox
      if (!code.includes('module.exports')) {
        // If compilation didn't produce CommonJS, fallback to unsafe import
        return await executeWorkflowFileUnsafe(absolutePath);
      }
      // Compiled TypeScript with module.exports can run in sandbox
    } else {
      // For JavaScript files, check for ES module patterns
      if (code.includes('import.meta') || 
          code.includes('import ') || 
          code.includes('export ')) {
        // For JS ES modules, fallback to unsafe import
        return await executeWorkflowFileUnsafe(absolutePath);
      }
    }
    
    const context = createSandboxContext();
    
    // Set up module context
    context.__dirname = dirname(absolutePath);
    context.__filename = absolutePath;
    
    // Execute the code in sandbox
    runInContext(code, context);
    
    // Extract the module exports
    const workflowModule = context.module.exports || context.exports;
    
    // Look for common export patterns
    let workflow;
    if (workflowModule.default) {
      workflow = workflowModule.default;
    } else if (workflowModule.workflow) {
      workflow = workflowModule.workflow;
    } else if (typeof workflowModule.toYAML === 'function') {
      // Direct export (module.exports = workflow)
      workflow = workflowModule;
    } else if (typeof workflowModule === 'object') {
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
    
    return await processWorkflow(workflow, workflowModule);
  } catch (error) {
    throw new Error(`Failed to execute workflow file (sandboxed): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fallback: Execute TypeScript files using dynamic import (less secure)
 */
async function executeWorkflowFileUnsafe(absolutePath: string): Promise<WorkflowResult> {
  try {
    // Import the module
    const workflowModule = await import(`file://${absolutePath}`);
    
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
    
    return await processWorkflow(workflow, workflowModule);
  } catch (error) {
    throw new Error(`Failed to execute workflow file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process workflow and extract metadata
 */
async function processWorkflow(workflow: any, workflowModule: any): Promise<WorkflowResult> {
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
  
  // Extract local actions from the workflow
  let localActions: LocalActionFile[] = [];
  
  // Method 1: Try getLocalActions method if available
  if (typeof workflow.getLocalActions === 'function') {
    const localActionBuilders = workflow.getLocalActions();
    localActions = localActionBuilders.map((action: any) => ({
      path: action.getPath ? action.getPath() : `actions/${action.getName() || 'unnamed'}/action.yml`,
      yaml: action.toYAML()
    }));
  }
  
  // Method 2: Scan module exports for LocalActionBuilder instances
  if (localActions.length === 0 && workflowModule && typeof workflowModule === 'object') {
    for (const key of Object.keys(workflowModule)) {
      const exported = workflowModule[key];
      if (exported && 
          typeof exported.toYAML === 'function' && 
          typeof exported.getReference === 'function' &&
          typeof exported.getName === 'function') {
        // This looks like a LocalActionBuilder
        const actionName = exported.getName();
        const actionFilename = exported.getFilename();
        const actionPath = actionFilename ? 
          `${actionFilename}/action.yml` :
          `actions/${actionName}/action.yml`;
        localActions.push({
          path: actionPath,
          yaml: exported.toYAML()
        });
      }
    }
  }
  
  // Method 3: Extract from workflow configuration by traversing steps
  if (localActions.length === 0) {
    const config = workflow.build();
    const usedLocalActions = new Set<string>();
    
    if (config.jobs) {
      for (const job of Object.values(config.jobs)) {
        if (job && typeof job === 'object' && 'steps' in job && Array.isArray(job.steps)) {
          for (const step of job.steps) {
            if (step && typeof step === 'object' && 'uses' in step && typeof step.uses === 'string') {
              // Check if it's a local action reference (starts with ./)
              if (step.uses.startsWith('./')) {
                usedLocalActions.add(step.uses);
              }
            }
          }
        }
      }
    }
    
    // If we found local action references but no builders, warn user
    if (usedLocalActions.size > 0) {
      console.warn('⚠️  Found local action references but no LocalActionBuilder exports. Please export your local actions from the workflow file.');
      for (const actionRef of usedLocalActions) {
        console.warn(`   Reference found: ${actionRef}`);
      }
    }
  }
  
  // Extract workflow name for filename generation fallback
  let workflowName: string | undefined;
  if (typeof workflow.build === 'function') {
    const config = workflow.build();
    workflowName = config.name;
  }
  
  return {
    workflow,
    yaml,
    filename,
    workflowName,
    localActions
  };
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
    
    // Validate generated YAML if requested
    if (options.validate !== false) { // Default to true, allow explicit false
      // Validate workflow YAML
      const workflowValidation = validateWorkflowYAML(result.yaml);
      if (!workflowValidation.valid) {
        if (!options.silent) {
          console.log(chalk.red('\n' + formatValidationErrors(workflowValidation, 'workflow')));
        }
        throw new Error('Workflow validation failed');
      } else if (!options.silent) {
        console.log(chalk.green('✅ Workflow validation passed'));
      }
      
      // Validate local action YAMLs
      if (result.localActions && result.localActions.length > 0) {
        for (const [index, localAction] of result.localActions.entries()) {
          const actionValidation = validateActionYAML(localAction.yaml);
          if (!actionValidation.valid) {
            if (!options.silent) {
              console.log(chalk.red(`\n❌ Local action ${index + 1} (${localAction.path}) validation failed:`));
              console.log(formatValidationErrors(actionValidation, 'action'));
            }
            throw new Error(`Local action validation failed: ${localAction.path}`);
          } else if (!options.silent) {
            console.log(chalk.green(`✅ Local action ${index + 1} validation passed`));
          }
        }
      }
    }
    
    // Determine output path
    let outputPath: string | undefined;
    if (options.dir || result.filename) {
      if (result.filename) {
        // Use filename from workflow builder, put in workflows subdirectory
        outputPath = options.dir 
          ? resolve(options.dir, 'workflows', result.filename)
          : resolve('workflows', result.filename);
      } else if (options.dir) {
        // Use generateOutputPath but put in workflows subdirectory
        const baseName = basename(filePath, extname(filePath));
        outputPath = resolve(options.dir, 'workflows', `${baseName}.yml`);
      }
    }
    
    if (outputPath) {
      // Ensure the output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      // STEP 1: Write local action files FIRST (bottom-up generation)
      if (result.localActions && result.localActions.length > 0) {
        if (!options.silent) {
          console.log(chalk.blue(`📦 Generating ${result.localActions.length} local action(s)...`));
        }
        
        for (const localAction of result.localActions) {
          // Convert action path to use actions/ format (not .github/actions/)
          const actionBaseName = localAction.path.replace(/^actions\//, '').replace(/\/action\.yml$/, '');
          const actionPath = options.dir 
            ? resolve(options.dir, 'actions', actionBaseName, 'action.yml')
            : resolve(dirname(outputPath), '..', 'actions', actionBaseName, 'action.yml');
          
          const actionDir = dirname(actionPath);
          if (!existsSync(actionDir)) {
            mkdirSync(actionDir, { recursive: true });
          }
          
          writeFileSync(actionPath, localAction.yaml, 'utf-8');
          if (!options.silent) {
            console.log(chalk.green(`✅ Local action written to ${chalk.cyan(actionPath)}`));
          }
        }
        
        if (!options.silent) {
          console.log(chalk.blue('📄 Generating workflow...'));
        }
      }
      
      // STEP 2: Write workflow file AFTER actions are in place
      // Update workflow YAML to use relative action references
      let updatedYaml = result.yaml;
      if (result.localActions && result.localActions.length > 0) {
        for (const localAction of result.localActions) {
          const oldPath = localAction.path.replace(/\/action\.yml$/, '');
          const actionBaseName = oldPath.replace(/^actions\//, '');
          const newPath = options.dir 
            ? `./${basename(options.dir)}/actions/${actionBaseName}`
            : `./actions/${actionBaseName}`;
          
          // Replace all occurrences of the old path with the new path
          updatedYaml = updatedYaml.replace(new RegExp(`\\./${oldPath}`, 'g'), newPath);
        }
      }
      
      writeFileSync(outputPath, updatedYaml, 'utf-8');
      if (!options.silent) {
        console.log(chalk.green(`✅ Workflow written to ${chalk.cyan(outputPath)}`));
      }
      
      // Summary
      if (!options.silent && result.localActions && result.localActions.length > 0) {
        console.log(chalk.blue('\n🎉 Generation complete!'));
        console.log(chalk.gray(`Generated ${result.localActions.length} local action(s) and 1 workflow`));
      }
    } else {
      // Console output mode
      if (result.localActions && result.localActions.length > 0) {
        if (!options.silent) {
          console.log(chalk.green(`✅ Generated workflow with ${result.localActions.length} local action(s):`));
          console.log(chalk.gray('─'.repeat(50)));
        }
        
        // Show local actions first
        for (const [index, localAction] of result.localActions.entries()) {
          if (!options.silent) {
            console.log(chalk.blue(`\n📦 Local Action ${index + 1}: ${localAction.path}`));
            console.log(chalk.gray('─'.repeat(30)));
          }
          console.log(localAction.yaml);
        }
        
        if (!options.silent) {
          console.log(chalk.blue('\n📄 Workflow YAML:'));
          console.log(chalk.gray('─'.repeat(50)));
        }
        console.log(result.yaml);
        
        if (!options.silent) {
          console.log(chalk.gray('─'.repeat(50)));
        }
      } else {
        // No local actions, show workflow only
        if (!options.silent) {
          console.log(chalk.green('✅ Generated YAML:'));
          console.log(chalk.gray('─'.repeat(50)));
        }
        console.log(result.yaml);
        if (!options.silent) {
          console.log(chalk.gray('─'.repeat(50)));
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
          })
          .option('validate', {
            describe: 'Validate generated YAML against GitHub Actions schema',
            type: 'boolean',
            default: true
          });
      },
      (argv) => {
        try {
          watchWorkflowFile(argv.file, argv as WatchOptions);
        } catch (error) {
          console.error(chalk.red('CLI Error:'), error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
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
          })
          .option('validate', {
            describe: 'Validate generated YAML against GitHub Actions schema',
            type: 'boolean',
            default: true
          });
      },
      async (argv) => {
        try {
          await generateYaml(argv.file, argv as WatchOptions);
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
    .example('$0 watch my-workflow.ts', 'Watch my-workflow.ts and output YAML to console')
    .example('$0 watch my-workflow.ts -d .github/workflows', 'Watch and save to directory (uses workflow.filename())')
    .example('$0 watch my-workflow.ts --no-validate', 'Watch without schema validation')
    .example('$0 generate my-workflow.ts', 'Generate YAML once and output to console')
    .example('$0 generate my-workflow.ts -d .github/workflows', 'Generate and save to GitHub Actions directory')
    .example('$0 generate my-workflow.ts --no-validate', 'Generate without schema validation')
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

export { main, watchWorkflowFile, generateYaml };
