import * as fs from "node:fs/promises";
import * as path from "node:path";
import { compileTypeScriptFile } from "../../processing/compiler/typescript-compiler";
import { extractModuleExports } from "../../processing/file/module-extractor";
import { type ActionSchema, ActionSchemaFetcher } from "../fetchers/ActionSchemaFetcher";
import { type GeneratedInterface, type LocalActionSchema, TypeGenerator } from "../generators/TypeGenerator";
import { type ActionReference, WorkflowScanner } from "./WorkflowScanner";

/**
 * Represents an object that has a build() method (like WorkflowBuilder or LocalActionBuilder)
 */
interface WorkflowBuilderLike {
	build(): unknown;
}

/**
 * Configuration for the schema manager
 */
export interface SchemaManagerConfig {
	/** Directory to scan for workflow files */
	workflowDir?: string;
	/** Output path for the generated types file */
	typesFilePath?: string;
	/** Whether to watch for changes and auto-regenerate */
	watch?: boolean;
	/** GitHub token for API access */
	githubToken?: string;
	/** Whether to include JSDoc comments */
	includeJSDoc?: boolean;
	/** Cache directory for schemas */
	cacheDir?: string;
}

/**
 * Result of a schema generation operation
 */
export interface GenerationResult {
	/** Number of actions processed */
	actionsProcessed: number;
	/** Number of schemas fetched successfully */
	schemasFetched: number;
	/** Number of interfaces generated */
	interfacesGenerated: number;
	/** Path to the generated types file */
	typesFilePath: string;
	/** List of actions that failed to fetch */
	failedActions: string[];
	/** Generated interfaces for external actions */
	interfaces: GeneratedInterface[];
	/** Number of local actions processed */
	localActionsProcessed: number;
	/** Generated interfaces for local actions */
	localActionInterfaces: GeneratedInterface[];
}

/**
 * Orchestrates the entire schema-to-types workflow
 */
export class SchemaManager {
	private config: Required<SchemaManagerConfig>;
	private scanner: WorkflowScanner;
	private fetcher: ActionSchemaFetcher;
	private generator: TypeGenerator;

	constructor(config: SchemaManagerConfig = {}) {
		this.config = {
			workflowDir: config.workflowDir || process.cwd(),
			typesFilePath: config.typesFilePath || "./flughafen-actions.d.ts",
			watch: config.watch || false,
			githubToken: config.githubToken || process.env.GITHUB_TOKEN || "",
			includeJSDoc: config.includeJSDoc ?? true,
			cacheDir: config.cacheDir || ".flughafen-cache",
		};

		this.scanner = new WorkflowScanner();
		this.fetcher = new ActionSchemaFetcher({
			githubToken: this.config.githubToken,
			cacheDir: this.config.cacheDir,
		});
		this.generator = new TypeGenerator({
			includeJSDoc: this.config.includeJSDoc,
		});
	}

	/**
	 * Generate types from workflow files in the specified directory
	 */
	async generateTypesFromWorkflowFiles(): Promise<GenerationResult> {
		const workflowFiles = await this.findWorkflowFiles();
		const { actionRefs, localActions } = await this.scanWorkflowFilesComplete(workflowFiles);

		return this.generateTypesFromActionsAndLocal(actionRefs, localActions);
	}

	/**
	 * Generate types from a list of action references (backward compatible)
	 */
	async generateTypesFromActions(actionRefs: ActionReference[]): Promise<GenerationResult> {
		return this.generateTypesFromActionsAndLocal(actionRefs, []);
	}

	/**
	 * Generate types from both external actions and local actions
	 */
	async generateTypesFromActionsAndLocal(
		actionRefs: ActionReference[],
		localActions: LocalActionSchema[]
	): Promise<GenerationResult> {
		const uniqueActions = this.deduplicateActions(actionRefs);
		const uniqueLocalActions = this.deduplicateLocalActions(localActions);

		console.log(
			`🔍 Processing ${uniqueActions.length} external actions and ${uniqueLocalActions.length} local actions...`
		);

		// Fetch schemas for external actions
		const schemas: ActionSchema[] = [];
		const failedActions: string[] = [];

		for (const actionRef of uniqueActions) {
			try {
				const schema = await this.fetcher.fetchSchema(actionRef);
				if (schema) {
					schemas.push(schema);
					console.log(`✅ Fetched schema for ${actionRef.action}`);
				} else {
					failedActions.push(actionRef.action);
					console.log(`❌ Failed to fetch schema for ${actionRef.action}`);
				}
			} catch (error) {
				failedActions.push(actionRef.action);
				console.log(`❌ Error fetching ${actionRef.action}:`, error);
			}
		}

		// Generate interfaces for external actions
		const externalInterfaces = this.generator.generateInterfaces(schemas);
		console.log(`🏗️  Generated ${externalInterfaces.length} external action interfaces`);

		// Generate interfaces for local actions
		const localInterfaces = this.generator.generateLocalActionInterfaces(uniqueLocalActions);
		if (localInterfaces.length > 0) {
			console.log(`🏠 Generated ${localInterfaces.length} local action interfaces`);
		}

		// Write types file with both external and local action types
		await this.writeTypesFileWithLocal(externalInterfaces, localInterfaces);
		console.log(`📄 Types written to ${this.config.typesFilePath}`);

		return {
			actionsProcessed: uniqueActions.length,
			schemasFetched: schemas.length,
			interfacesGenerated: externalInterfaces.length + localInterfaces.length,
			typesFilePath: this.config.typesFilePath,
			failedActions,
			interfaces: externalInterfaces,
			localActionsProcessed: uniqueLocalActions.length,
			localActionInterfaces: localInterfaces,
		};
	}

	/**
	 * Deduplicate local actions by name
	 */
	private deduplicateLocalActions(localActions: LocalActionSchema[]): LocalActionSchema[] {
		const seen = new Map<string, LocalActionSchema>();
		for (const action of localActions) {
			if (!seen.has(action.name)) {
				seen.set(action.name, action);
			}
		}
		return Array.from(seen.values());
	}

	/**
	 * Generate types from workflow builders (in-memory)
	 */
	async generateTypesFromWorkflows(workflows: WorkflowBuilderLike[]): Promise<GenerationResult> {
		const allActionRefs: ActionReference[] = [];
		const allLocalActions: LocalActionSchema[] = [];

		for (const workflow of workflows) {
			const result = this.scanner.scanWorkflowComplete(workflow);
			allActionRefs.push(...result.externalActions);
			allLocalActions.push(...result.localActions);
		}

		return this.generateTypesFromActionsAndLocal(allActionRefs, allLocalActions);
	}

	/**
	 * Generate types from specific workflow files
	 */
	async generateTypesFromSpecificFiles(files: string[]): Promise<GenerationResult> {
		// Resolve file paths relative to current working directory
		const resolvedFiles = files.map((file) => path.resolve(file));

		// Check that all files exist
		for (const file of resolvedFiles) {
			try {
				await fs.access(file);
			} catch {
				throw new Error(`File not found: ${file}`);
			}
		}

		const { actionRefs, localActions } = await this.scanWorkflowFilesComplete(resolvedFiles);
		return this.generateTypesFromActionsAndLocal(actionRefs, localActions);
	}

	/**
	 * Find all workflow files in the configured directory
	 */
	private async findWorkflowFiles(): Promise<string[]> {
		const workflowFiles: string[] = [];

		// Common workflow directories
		const searchPaths = [
			path.join(this.config.workflowDir, ".github/workflows"),
			path.join(this.config.workflowDir, "workflows"),
			path.join(this.config.workflowDir, "src"),
			this.config.workflowDir,
		];

		for (const searchPath of searchPaths) {
			try {
				const exists = await fs
					.access(searchPath)
					.then(() => true)
					.catch(() => false);
				if (!exists) continue;

				const entries = await fs.readdir(searchPath, { withFileTypes: true });

				for (const entry of entries) {
					if (entry.isFile()) {
						const filePath = path.join(searchPath, entry.name);

						// Look for TypeScript/JavaScript files that might contain workflows
						if (/\.(ts|js|yml|yaml)$/.test(entry.name)) {
							workflowFiles.push(filePath);
						}
					}
				}
			} catch (_error) {
				// Ignore directories that don't exist or can't be read
			}
		}

		return workflowFiles;
	}

	/**
	 * Scan workflow files for both external actions and local actions
	 */
	private async scanWorkflowFilesComplete(
		filePaths: string[]
	): Promise<{ actionRefs: ActionReference[]; localActions: LocalActionSchema[] }> {
		const allActionRefs: ActionReference[] = [];
		const allLocalActions: LocalActionSchema[] = [];

		for (const filePath of filePaths) {
			try {
				if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
					const result = await this.scanTypeScriptWorkflowFileComplete(filePath);
					allActionRefs.push(...result.externalActions);
					allLocalActions.push(...result.localActions);
				} else if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
					// YAML files don't have local actions, only external
					const content = await fs.readFile(filePath, "utf-8");
					const actionRefs = this.scanner.scanWorkflowYaml(content);
					allActionRefs.push(...actionRefs);
				}
			} catch (error) {
				console.warn(`⚠️  Failed to scan ${filePath}:`, error);
			}
		}

		return { actionRefs: allActionRefs, localActions: allLocalActions };
	}

	/**
	 * Scan a TypeScript workflow file for both external actions and local actions
	 */
	private async scanTypeScriptWorkflowFileComplete(
		filePath: string
	): Promise<{ externalActions: ActionReference[]; localActions: LocalActionSchema[] }> {
		try {
			// Compile TypeScript to CommonJS
			const compiledCode = compileTypeScriptFile(filePath);

			// Execute in sandbox to get the workflow instance
			const flughafenModule = await this.loadFlughafenModule();
			const { moduleExports } = extractModuleExports(compiledCode, filePath, {
				additionalGlobals: {
					__preloadedFlughafen: flughafenModule,
				},
			});

			// Find all workflow builders in exports
			const workflows: WorkflowBuilderLike[] = [];

			if (moduleExports.default && this.isWorkflowBuilder(moduleExports.default)) {
				workflows.push(moduleExports.default);
			}

			for (const [key, value] of Object.entries(moduleExports)) {
				if (key !== "default" && this.isWorkflowBuilder(value)) {
					workflows.push(value);
				}
			}

			if (workflows.length === 0) {
				console.warn(`⚠️  No workflow found in ${filePath}`);
				return { externalActions: [], localActions: [] };
			}

			// Scan all workflows
			const allExternalActions: ActionReference[] = [];
			const allLocalActions: LocalActionSchema[] = [];

			for (const workflow of workflows) {
				const result = this.scanner.scanWorkflowComplete(workflow);
				allExternalActions.push(...result.externalActions);
				allLocalActions.push(...result.localActions);
			}

			return { externalActions: allExternalActions, localActions: allLocalActions };
		} catch (error) {
			console.warn(`⚠️  Failed to process TypeScript workflow ${filePath}:`, error);
			return { externalActions: [], localActions: [] };
		}
	}

	/**
	 * Check if an object is a workflow builder
	 */
	private isWorkflowBuilder(value: unknown): value is WorkflowBuilderLike {
		return (
			value !== null &&
			typeof value === "object" &&
			"build" in value &&
			typeof (value as WorkflowBuilderLike).build === "function"
		);
	}

	/**
	 * Load the flughafen module dynamically with proper path resolution
	 */
	private async loadFlughafenModule(): Promise<Record<string, unknown>> {
		try {
			// Try different import paths depending on the environment
			const importPaths = [
				"../index.js", // From dist/cli/cli.mjs to dist/index.mjs
				"../../index.js", // From src to src/index.ts
				"@flughafen/core", // Package import (if available)
			];

			for (const importPath of importPaths) {
				try {
					return await import(importPath);
				} catch (_error) {
					// Ignore import errors and try the next path
				}
			}

			throw new Error("Could not find flughafen module");
		} catch (error) {
			throw new Error(`Failed to load flughafen module: ${error}`);
		}
	}

	/**
	 * Deduplicate action references
	 */
	private deduplicateActions(actionRefs: ActionReference[]): ActionReference[] {
		const seen = new Set<string>();
		const unique: ActionReference[] = [];

		for (const actionRef of actionRefs) {
			if (!seen.has(actionRef.action)) {
				seen.add(actionRef.action);
				unique.push(actionRef);
			}
		}

		return unique;
	}

	/**
	 * Write the generated types file with both external and local action types
	 */
	private async writeTypesFileWithLocal(
		externalInterfaces: GeneratedInterface[],
		localInterfaces: GeneratedInterface[]
	): Promise<void> {
		const dtsContent = this.generator.generateTypeFileWithLocalActions(externalInterfaces, localInterfaces);

		// Ensure the directory exists
		const dir = path.dirname(this.config.typesFilePath);
		await fs.mkdir(dir, { recursive: true });

		// Write the file
		await fs.writeFile(this.config.typesFilePath, dtsContent, "utf-8");
	}

	/**
	 * Clear the schema cache
	 */
	clearCache(): void {
		this.fetcher.clearCache();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return this.fetcher.getCacheStats();
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<SchemaManagerConfig>): void {
		Object.assign(this.config, newConfig);

		// Update sub-components if needed
		if (newConfig.githubToken !== undefined) {
			this.fetcher = new ActionSchemaFetcher({
				githubToken: newConfig.githubToken,
				cacheDir: this.config.cacheDir,
			});
		}

		if (newConfig.includeJSDoc !== undefined) {
			this.generator = new TypeGenerator({
				includeJSDoc: newConfig.includeJSDoc,
			});
		}
	}
}

// Export convenience instance
export const schemaManager = new SchemaManager();
