import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { globSync } from "glob";
import yaml from "yaml";
import { CodeGenerator } from "./code-generator";
import { LocalActionAnalyzer } from "./local-action-analyzer";
import { LocalActionGenerator } from "./local-action-generator";
import type {
	ActionUsage,
	GeneratedFile,
	LocalActionAnalysis,
	ReverseError,
	ReverseOptions,
	ReverseResult,
	WorkflowAnalysis,
} from "./types";
import { ComprehensiveValidator } from "./validation";
import { YamlAnalyzer } from "./yaml-analyzer";

/**
 * Main orchestrator for reverse engineering GitHub workflows
 */
export class WorkflowParser {
	private yamlAnalyzer = new YamlAnalyzer();
	private codeGenerator = new CodeGenerator();
	private localActionAnalyzer = new LocalActionAnalyzer();
	private localActionGenerator = new LocalActionGenerator();
	private validator = new ComprehensiveValidator();

	/**
	 * Reverse engineer a single workflow file
	 */
	async reverseWorkflow(filePath: string, options: ReverseOptions = {}): Promise<ReverseResult> {
		const errors: ReverseError[] = [];
		const warnings: string[] = [];

		try {
			// Phase 1: Comprehensive validation
			const validationResult = await this.validator.validateWorkflowFile(filePath, {
				skipYamlValidation: options.skipYamlValidation,
				skipSchemaValidation: options.skipSchemaValidation,
				skipActionValidation: options.skipActionValidation,
			});

			// Convert validation errors to ReverseErrors
			for (const yamlError of validationResult.yamlErrors) {
				errors.push({
					file: filePath,
					message: yamlError.message,
					line: yamlError.line,
					column: yamlError.column,
					type: "validation",
				});
			}

			for (const schemaError of validationResult.schemaErrors) {
				errors.push({
					file: filePath,
					message: `${schemaError.path}: ${schemaError.message}`,
					type: "schema",
				});
			}

			for (const actionError of validationResult.actionErrors) {
				errors.push({
					file: filePath,
					message: `${actionError.location}: ${actionError.message} (action: ${actionError.action})`,
					type: "validation",
				});
			}

			// Convert validation warnings
			for (const warning of validationResult.warnings) {
				warnings.push(`${warning.path}: ${warning.message}`);
			}

			for (const actionWarning of validationResult.actionWarnings) {
				warnings.push(`${actionWarning.location}: ${actionWarning.message} (action: ${actionWarning.action})`);
			}

			// If strict validation is enabled, treat warnings as errors
			if (options.strictValidation) {
				for (const warning of validationResult.warnings) {
					errors.push({
						file: filePath,
						message: `${warning.path}: ${warning.message}`,
						type: "validation",
					});
				}
				for (const actionWarning of validationResult.actionWarnings) {
					errors.push({
						file: filePath,
						message: `${actionWarning.location}: ${actionWarning.message} (action: ${actionWarning.action})`,
						type: "validation",
					});
				}
			}

			// Show validation report if requested
			if (options.validationReport) {
				console.log(this.validator.formatValidationReport(validationResult, filePath));
			}

			// If validateOnly mode, return early
			if (options.validateOnly) {
				return {
					workflows: [],
					generatedFiles: [],
					actions: [],
					localActions: [],
					errors,
					warnings,
				};
			}

			// Stop processing if validation failed and we have critical errors
			if (!validationResult.valid) {
				return {
					workflows: [],
					generatedFiles: [],
					actions: [],
					localActions: [],
					errors,
					warnings,
				};
			}

			// Phase 2: Continue with standard workflow analysis
			const analysis = await this.yamlAnalyzer.analyzeWorkflow(filePath);

			// Generate TypeScript code using schema-driven approach
			const generatedFiles: GeneratedFile[] = [];
			if (!options.preview) {
				// Load and parse the workflow data for schema-driven generation
				const content = readFileSync(filePath, "utf-8");
				const workflowData = yaml.parse(content);
				const workflowFile = this.codeGenerator.generateWorkflowFromData(
					workflowData,
					this.codeGenerator.getWorkflowFileName(analysis),
					{ ...options, generateTypes: true }
				);
				generatedFiles.push(workflowFile);
			}

			return {
				workflows: [analysis],
				generatedFiles,
				actions: analysis.actions,
				localActions: [],
				errors,
				warnings,
			};
		} catch (error) {
			errors.push({
				file: filePath,
				message: error instanceof Error ? error.message : String(error),
				type: "yaml",
			});

			return {
				workflows: [],
				generatedFiles: [],
				actions: [],
				localActions: [],
				errors,
				warnings,
			};
		}
	}

	/**
	 * Reverse engineer an entire .github directory
	 */
	async reverseGithub(githubPath: string, options: ReverseOptions = {}): Promise<ReverseResult> {
		const resolvedPath = resolve(githubPath);

		if (!existsSync(resolvedPath)) {
			throw new Error(`Path does not exist: ${githubPath}`);
		}

		const workflows: WorkflowAnalysis[] = [];
		const allActions: ActionUsage[] = [];
		const actionMap = new Map<string, ActionUsage>(); // O(1) lookup for deduplication
		const localActions: LocalActionAnalysis[] = [];
		const generatedFiles: GeneratedFile[] = [];
		const errors: ReverseError[] = [];
		const warnings: string[] = [];

		// Find all workflow files (skip if localActionsOnly)
		const workflowFiles = options.localActionsOnly ? [] : this.findWorkflowFiles(resolvedPath);

		if (!options.localActionsOnly && workflowFiles.length === 0) {
			warnings.push(`No workflow files found in ${githubPath}`);
		}

		// Process each workflow file
		for (const workflowFile of workflowFiles) {
			try {
				// Phase 1: Comprehensive validation
				const validationResult = await this.validator.validateWorkflowFile(workflowFile, {
					skipYamlValidation: options.skipYamlValidation,
					skipSchemaValidation: options.skipSchemaValidation,
					skipActionValidation: options.skipActionValidation,
				});

				// Convert validation errors to ReverseErrors
				for (const yamlError of validationResult.yamlErrors) {
					errors.push({
						file: workflowFile,
						message: yamlError.message,
						line: yamlError.line,
						column: yamlError.column,
						type: "validation",
					});
				}

				for (const schemaError of validationResult.schemaErrors) {
					errors.push({
						file: workflowFile,
						message: `${schemaError.path}: ${schemaError.message}`,
						type: "schema",
					});
				}

				for (const actionError of validationResult.actionErrors) {
					errors.push({
						file: workflowFile,
						message: `${actionError.location}: ${actionError.message} (action: ${actionError.action})`,
						type: "validation",
					});
				}

				// Convert validation warnings
				for (const warning of validationResult.warnings) {
					warnings.push(`${warning.path}: ${warning.message}`);
				}

				for (const actionWarning of validationResult.actionWarnings) {
					warnings.push(`${actionWarning.location}: ${actionWarning.message} (action: ${actionWarning.action})`);
				}

				// If strict validation is enabled, treat warnings as errors
				if (options.strictValidation) {
					for (const warning of validationResult.warnings) {
						errors.push({
							file: workflowFile,
							message: `${warning.path}: ${warning.message}`,
							type: "validation",
						});
					}
					for (const actionWarning of validationResult.actionWarnings) {
						errors.push({
							file: workflowFile,
							message: `${actionWarning.location}: ${actionWarning.message} (action: ${actionWarning.action})`,
							type: "validation",
						});
					}
				}

				// Show validation report if requested
				if (options.validationReport) {
					console.log(this.validator.formatValidationReport(validationResult, workflowFile));
				}

				// Skip processing if validation failed and not in validateOnly mode
				if (!validationResult.valid && !options.validateOnly) {
					continue;
				}

				// Phase 2: Continue with standard workflow analysis (skip if validateOnly)
				if (!options.validateOnly) {
					const analysis = await this.yamlAnalyzer.analyzeWorkflow(workflowFile);

					workflows.push(analysis);

					// Generate TypeScript code using schema-driven approach (skip if localActionsOnly)
					if (!options.preview && !options.localActionsOnly) {
						// Load and parse the workflow data for schema-driven generation
						const content = readFileSync(workflowFile, "utf-8");
						const workflowData = yaml.parse(content);
						const generatedWorkflowFile = this.codeGenerator.generateWorkflowFromData(
							workflowData,
							this.codeGenerator.getWorkflowFileName(analysis),
							{ ...options, generateTypes: true }
						);
						generatedFiles.push(generatedWorkflowFile);
					}

					// Collect actions using Map for O(1) lookup
					for (const action of analysis.actions) {
						const existing = actionMap.get(action.action);
						if (existing) {
							existing.count += action.count;
							existing.inputs.push(...action.inputs);
						} else {
							const copy = { ...action };
							actionMap.set(action.action, copy);
							allActions.push(copy);
						}
					}
				}
			} catch (error) {
				errors.push({
					file: workflowFile,
					message: error instanceof Error ? error.message : String(error),
					type: "yaml",
				});
			}
		}

		// Extract local actions if requested or if localActionsOnly mode
		if (options.extractLocalActions || options.localActionsOnly) {
			try {
				const foundLocalActions = await this.analyzeLocalActions(resolvedPath, options);
				localActions.push(...foundLocalActions.actions);
				generatedFiles.push(...foundLocalActions.generatedFiles);
				errors.push(...foundLocalActions.errors);
			} catch (error) {
				errors.push({
					file: resolvedPath,
					message: `Failed to analyze local actions: ${error instanceof Error ? error.message : String(error)}`,
					type: "parsing",
				});
			}
		}

		return {
			workflows,
			generatedFiles,
			actions: allActions,
			localActions,
			errors,
			warnings,
		};
	}

	/**
	 * Find all workflow YAML files in a .github directory
	 */
	private findWorkflowFiles(githubPath: string): string[] {
		const workflowsDir = join(githubPath, "workflows");

		if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory()) {
			return [];
		}

		// Find all .yml and .yaml files in workflows directory
		const patterns = [join(workflowsDir, "*.yml"), join(workflowsDir, "*.yaml")];

		const files: string[] = [];
		for (const pattern of patterns) {
			files.push(...globSync(pattern));
		}

		return files;
	}

	/**
	 * Analyze local actions in .github/actions directory
	 */
	private async analyzeLocalActions(
		githubPath: string,
		options: ReverseOptions
	): Promise<{
		actions: LocalActionAnalysis[];
		generatedFiles: GeneratedFile[];
		errors: ReverseError[];
	}> {
		const actionsDir = join(githubPath, "actions");

		if (!existsSync(actionsDir) || !statSync(actionsDir).isDirectory()) {
			return { actions: [], generatedFiles: [], errors: [] };
		}

		const localActions: LocalActionAnalysis[] = [];
		const generatedFiles: GeneratedFile[] = [];
		const errors: ReverseError[] = [];

		// Find all action.yml files in subdirectories
		const actionFiles = globSync(join(actionsDir, "**/action.{yml,yaml}"));

		for (const actionFile of actionFiles) {
			try {
				// Parse the action.yml file
				const analysis = await this.localActionAnalyzer.analyzeLocalAction(actionFile);

				// Validate the action structure
				const validationIssues = this.localActionAnalyzer.validateLocalActionStructure(analysis);
				for (const issue of validationIssues) {
					if (issue.type === "error") {
						errors.push({
							file: actionFile,
							message: issue.message,
							type: "parsing",
						});
					}
					// Warnings are handled differently - could be logged or collected separately
				}

				localActions.push(analysis);

				// Generate TypeScript code if not in preview mode
				if (!options.preview && analysis.config) {
					const generatedFile = this.localActionGenerator.generateLocalAction(analysis, options);
					generatedFiles.push(generatedFile);
				}
			} catch (error) {
				errors.push({
					file: actionFile,
					message: `Failed to parse local action: ${error instanceof Error ? error.message : String(error)}`,
					type: "parsing",
				});
			}
		}

		return { actions: localActions, generatedFiles, errors };
	}

	/**
	 * Get summary statistics for the reverse engineering result
	 */
	getSummary(result: ReverseResult): string {
		const { workflows, actions, localActions, errors, warnings } = result;

		const lines = [
			`## Reverse Engineering Summary:`,
			`   - Workflows processed: ${workflows.length}`,
			`   - GitHub Actions found: ${actions.length}`,
			`   - Local actions found: ${localActions.length}`,
			`   - Errors: ${errors.length}`,
			`   - Warnings: ${warnings.length}`,
		];

		if (actions.length > 0) {
			lines.push("", "-- Most used actions:");
			const sortedActions = actions.sort((a, b) => b.count - a.count).slice(0, 5);

			for (const action of sortedActions) {
				lines.push(`   - ${action.action} (${action.count}x)`);
			}
		}

		return lines.join("\n");
	}
}
