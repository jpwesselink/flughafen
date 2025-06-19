/**
 * Main workflow processing orchestrator
 * Combines TypeScript compilation, VM execution, and file writing into a cohesive workflow
 */

import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { compileTypeScriptFile, isTypeScriptFile, isJavaScriptFile } from './typescript-compiler';
import { executeWorkflowInSandbox, type SandboxOptions } from './workflow-sandbox';
import { writeWorkflowSynthResult, createWriteSummary, type WriteOptions } from './file-writer';

export interface ProcessWorkflowOptions {
  /**
   * Options for the VM sandbox
   */
  sandboxOptions?: SandboxOptions;
  
  /**
   * Options for writing files
   */
  writeOptions?: WriteOptions;
  
  /**
   * Options for synth() method
   */
  synthOptions?: {
    basePath?: string;
    workflowsDir?: string;
    actionsDir?: string;
    defaultFilename?: string;
  };
  
  /**
   * Whether to actually write files or just return the result
   * @default true
   */
  writeFiles?: boolean;
  
  /**
   * Whether to log processing steps
   * @default false
   */
  verbose?: boolean;
}

export interface ProcessResult {
  /**
   * The synth result from the workflow
   */
  synthResult: {
    workflow: {
      filename: string;
      content: string;
    };
    actions: Record<string, string>;
  };
  
  /**
   * Write result if files were written
   */
  writeResult?: {
    workflowPath: string;
    actionPaths: string[];
    filesWritten: number;
  };
  
  /**
   * Summary of what was processed
   */
  summary: {
    workflowPath: string;
    actionPaths: string[];
    totalFiles: number;
    totalSize: number;
  };
}

/**
 * Processes a workflow file from TypeScript/JavaScript to written files
 * 
 * @param filePath - Path to the workflow file (.ts or .js)
 * @param options - Processing options
 * @returns Promise resolving to process result
 * @throws Error if any step fails
 */
export async function processWorkflowFile(
  filePath: string,
  options: ProcessWorkflowOptions = {}
): Promise<ProcessResult> {
  const {
    sandboxOptions = {},
    writeOptions = {},
    synthOptions = {},
    writeFiles = true,
    verbose = false
  } = options;

  try {
    // Validate input file
    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    if (verbose) {
      console.log(`📝 Processing workflow file: ${resolvedPath}`);
    }

    // Step 1: Compile TypeScript to CommonJS (if needed)
    let compiledCode: string;
    
    if (isTypeScriptFile(resolvedPath)) {
      if (verbose) {
        console.log('🔧 Compiling TypeScript to CommonJS...');
      }
      compiledCode = compileTypeScriptFile(resolvedPath);
    } else if (isJavaScriptFile(resolvedPath)) {
      if (verbose) {
        console.log('📦 Loading JavaScript file...');
      }
      // For JS files, we might still need to process them through esbuild
      // to ensure CommonJS format and handle any ES modules
      compiledCode = compileTypeScriptFile(resolvedPath, {
        esbuildOptions: { loader: 'js' }
      });
    } else {
      throw new Error(`Unsupported file type: ${extname(resolvedPath)}. Only .ts and .js files are supported.`);
    }

    // Step 2: Execute in VM sandbox and call synth()
    if (verbose) {
      console.log('🔒 Executing workflow in secure sandbox and calling synth()...');
    }
    
    const { synthResult } = executeWorkflowInSandbox(compiledCode, resolvedPath, {
      ...sandboxOptions,
      synthOptions
    });

    // Step 3: Create summary
    const summary = createWriteSummary(synthResult, writeOptions.baseDir);

    if (verbose) {
      console.log(`📊 Synthesis complete: ${summary.totalFiles} files, ${summary.totalSize} bytes`);
    }

    // Step 4: Write files (if requested)
    let writeResult;
    if (writeFiles) {
      if (verbose) {
        console.log('💾 Writing files to disk...');
      }
      
      writeResult = await writeWorkflowSynthResult(synthResult, {
        ...writeOptions,
        verbose
      });
      
      if (verbose) {
        console.log(`✅ Successfully wrote ${writeResult.filesWritten} files`);
      }
    }

    return {
      synthResult,
      writeResult,
      summary
    };

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process workflow file '${filePath}': ${error.message}`);
    }
    throw new Error(`Failed to process workflow file '${filePath}': ${String(error)}`);
  }
}

/**
 * Processes a workflow file and returns only the YAML content (for CLI output)
 * 
 * @param filePath - Path to the workflow file
 * @param options - Processing options
 * @returns Promise resolving to workflow YAML content
 */
export async function getWorkflowYaml(
  filePath: string,
  options: ProcessWorkflowOptions = {}
): Promise<string> {
  const result = await processWorkflowFile(filePath, {
    ...options,
    writeFiles: false
  });
  
  return result.synthResult.workflow.content;
}

/**
 * Validates that a file can be processed as a workflow
 * 
 * @param filePath - Path to check
 * @returns Promise resolving to validation result
 */
export async function validateWorkflowFile(filePath: string): Promise<{
  valid: boolean;
  error?: string;
  fileType?: 'typescript' | 'javascript' | 'unsupported';
}> {
  try {
    const resolvedPath = resolve(filePath);
    
    if (!existsSync(resolvedPath)) {
      return {
        valid: false,
        error: `File not found: ${resolvedPath}`
      };
    }
    
    let fileType: 'typescript' | 'javascript' | 'unsupported';
    
    if (isTypeScriptFile(resolvedPath)) {
      fileType = 'typescript';
    } else if (isJavaScriptFile(resolvedPath)) {
      fileType = 'javascript';
    } else {
      return {
        valid: false,
        error: `Unsupported file type: ${extname(resolvedPath)}`,
        fileType: 'unsupported'
      };
    }
    
    // Try to compile (but don't execute)
    try {
      compileTypeScriptFile(resolvedPath, {
        esbuildOptions: fileType === 'javascript' ? { loader: 'js' } : {}
      });
    } catch (compileError) {
      return {
        valid: false,
        error: `Compilation failed: ${compileError instanceof Error ? compileError.message : String(compileError)}`,
        fileType
      };
    }
    
    return {
      valid: true,
      fileType
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
