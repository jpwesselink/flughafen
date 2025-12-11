import { join } from "node:path";
import { kebabToCamel } from "../../utils/property-mapper";
import { TypeScriptCodegenVisitor } from "./schema-codegen-visitor";
import { SchemaWalker } from "./schema-walker";
import type {
	GeneratedFile,
	JobAnalysis,
	ReverseOptions,
	StepAnalysis,
	WorkflowAnalysis,
	WorkflowTrigger,
} from "./types";

/**
 * Generates TypeScript code from analyzed workflows
 */
export class CodeGenerator {
	/**
	 * Generate TypeScript workflow builder from analysis
	 */
	generateWorkflow(analysis: WorkflowAnalysis, options: ReverseOptions = {}): GeneratedFile {
		const fileName = this.getWorkflowFileName(analysis);
		const content = this.generateWorkflowContent(analysis, options);

		return {
			path: join(options.outputDir || "flughafen", "workflows", fileName),
			content,
			type: "workflow",
		};
	}

	/**
	 * Generate TypeScript workflow builder from raw workflow data using schema-driven approach
	 * This is a simpler, more maintainable approach that uses the JSON Schema directly
	 */
	generateWorkflowFromData(
		workflowData: Record<string, unknown>,
		fileName: string,
		options: ReverseOptions = {}
	): GeneratedFile {
		const walker = new SchemaWalker();
		const visitor = new TypeScriptCodegenVisitor(options);

		// Walk the workflow data using schema to generate code
		walker.walk(workflowData, visitor);

		return {
			path: join(options.outputDir || "flughafen", "workflows", fileName),
			content: visitor.getGeneratedCode(),
			type: "workflow",
		};
	}

	/**
	 * Generate the main workflow TypeScript content
	 */
	private generateWorkflowContent(analysis: WorkflowAnalysis, options: ReverseOptions): string {
		const imports = this.generateImports(analysis, options);
		const comments = this.generateComments(analysis, options);
		const workflow = this.generateWorkflowBuilder(analysis, options);

		return [imports, "", comments, workflow].filter(Boolean).join("\n");
	}

	/**
	 * Generate import statements
	 */
	private generateImports(analysis: WorkflowAnalysis, options?: ReverseOptions): string {
		const imports = ["createWorkflow"];

		// Check if we need expr helper
		const needsExpr = this.hasGitHubExpressions(analysis);
		if (needsExpr) {
			imports.push("expr");
		}

		// Add type imports for builder callbacks (only if actually used)
		const typeImports: string[] = [];

		// JobBuilder is needed if there are any jobs
		const hasJobs = analysis.jobs.length > 0;
		if (hasJobs) {
			typeImports.push("JobBuilder");
		}

		// StepBuilder is needed if any job has steps
		const hasSteps = analysis.jobs.some((job) => job.steps.length > 0);
		if (hasSteps) {
			typeImports.push("StepBuilder");
		}

		// ActionBuilder is needed if any step uses actions with configuration
		const hasActionWithConfig = analysis.jobs.some((job) =>
			job.steps.some((step) => step.uses && (step.with || step.env))
		);
		if (hasActionWithConfig) {
			if (options?.generateTypes) {
				typeImports.push("TypedActionConfigBuilder");
			} else {
				typeImports.push("ActionBuilder");
			}
		}

		let result = `import { ${imports.join(", ")} } from "@flughafen/core";`;
		if (typeImports.length > 0) {
			result += `\nimport type { ${typeImports.join(", ")} } from "@flughafen/core";`;
		}
		return result;
	}

	/**
	 * Generate JSDoc comments from workflow
	 */
	private generateComments(analysis: WorkflowAnalysis, options: ReverseOptions): string {
		if (!options.preserveComments || !analysis.comments.length) {
			return "";
		}

		const comments = ["/**", ` * ${analysis.name}`, ...analysis.comments.map((comment) => ` * ${comment}`), " */"];

		return comments.join("\n");
	}

	/**
	 * Generate the workflow builder code
	 */
	private generateWorkflowBuilder(analysis: WorkflowAnalysis, options?: ReverseOptions): string {
		const lines: string[] = [];

		lines.push("export default createWorkflow()");
		lines.push(`\t.name("${this.escapeString(analysis.name)}")`);

		// Add workflow-level env if present
		if (analysis.env) {
			lines.push(`\t.env(${JSON.stringify(analysis.env, null, 2).replace(/\n/g, "\n\t")})`);
		}

		// Add workflow-level permissions if present
		if (analysis.permissions) {
			lines.push(`\t.permissions(${JSON.stringify(analysis.permissions, null, 2).replace(/\n/g, "\n\t")})`);
		}

		// Add workflow-level concurrency if present
		if (analysis.concurrency) {
			lines.push(`\t.concurrency(${JSON.stringify(analysis.concurrency, null, 2).replace(/\n/g, "\n\t")})`);
		}

		// Add workflow-level defaults if present
		if (analysis.defaults) {
			lines.push(`\t.defaults(${JSON.stringify(analysis.defaults, null, 2).replace(/\n/g, "\n\t")})`);
		}

		// Generate triggers
		for (const trigger of analysis.triggers) {
			lines.push(this.generateTrigger(trigger));
		}

		// Generate jobs
		for (const job of analysis.jobs) {
			lines.push("");
			lines.push(this.generateJob(job, options));
		}

		lines.push(";");

		return lines.join("\n");
	}

	/**
	 * Generate trigger/event configuration
	 */
	private generateTrigger(trigger: WorkflowTrigger): string {
		if (!trigger.config || trigger.config === null) {
			return `\t.on("${trigger.event}")`;
		}

		// Handle workflow_call specifically
		if (trigger.event === "workflow_call") {
			return this.generateWorkflowCallTrigger(trigger.config);
		}

		const config = JSON.stringify(trigger.config, null, 2)
			.split("\n")
			.map((line, index) => (index === 0 ? line : `\t${line}`))
			.join("\n");

		return `\t.on("${trigger.event}", ${config})`;
	}

	/**
	 * Generate workflow_call trigger configuration
	 */
	private generateWorkflowCallTrigger(config: Record<string, unknown>): string {
		const lines: string[] = [];

		// Handle minimal workflow_call (config is undefined)
		if (!config) {
			return `\t.on("workflow_call")`;
		}

		lines.push(`\t.on("workflow_call", {`);

		// Generate inputs
		if (config.inputs && typeof config.inputs === "object") {
			lines.push(`\t\tinputs: {`);
			for (const [inputName, inputConfig] of Object.entries(config.inputs as Record<string, unknown>)) {
				lines.push(`\t\t\t${inputName}: {`);

				const input = inputConfig as Record<string, unknown>;
				if (input.description) {
					lines.push(`\t\t\t\tdescription: "${input.description}",`);
				}
				if (input.required !== undefined) {
					lines.push(`\t\t\t\trequired: ${input.required},`);
				}
				if (input.type) {
					lines.push(`\t\t\t\ttype: "${input.type}",`);
				}
				if (input.default !== undefined) {
					let defaultValue: string;
					if (typeof input.default === "string") {
						// Try to parse as JSON first (for arrays/objects in string format)
						try {
							const parsed = JSON.parse(input.default);
							// For arrays and objects, output the parsed value directly
							if (Array.isArray(parsed) || typeof parsed === "object") {
								defaultValue = JSON.stringify(parsed);
							} else {
								defaultValue = `"${input.default}"`;
							}
						} catch {
							// If not valid JSON, treat as string
							defaultValue = `"${input.default}"`;
						}
					} else {
						defaultValue = JSON.stringify(input.default);
					}
					lines.push(`\t\t\t\tdefault: ${defaultValue},`);
				}

				lines.push(`\t\t\t},`);
			}
			lines.push(`\t\t},`);
		}

		// Generate secrets
		if (config.secrets && typeof config.secrets === "object") {
			lines.push(`\t\tsecrets: {`);
			for (const [secretName, secretConfig] of Object.entries(config.secrets as Record<string, unknown>)) {
				lines.push(`\t\t\t${secretName}: {`);

				const secret = secretConfig as Record<string, unknown>;
				if (secret.description) {
					lines.push(`\t\t\t\tdescription: "${secret.description}",`);
				}
				if (secret.required !== undefined) {
					lines.push(`\t\t\t\trequired: ${secret.required},`);
				}

				lines.push(`\t\t\t},`);
			}
			lines.push(`\t\t},`);
		}

		// Generate outputs
		if (config.outputs && typeof config.outputs === "object") {
			lines.push(`\t\toutputs: {`);
			for (const [outputName, outputConfig] of Object.entries(config.outputs as Record<string, unknown>)) {
				lines.push(`\t\t\t${outputName}: {`);

				const output = outputConfig as Record<string, unknown>;
				if (output.description) {
					lines.push(`\t\t\t\tdescription: "${output.description}",`);
				}
				if (output.value) {
					const value = this.convertExpressions(output.value as string);
					lines.push(`\t\t\t\tvalue: "${value}",`);
				}

				lines.push(`\t\t\t},`);
			}
			lines.push(`\t\t},`);
		}

		lines.push(`\t})`);

		return lines.join("\n");
	}

	/**
	 * Generate job configuration
	 */
	private generateJob(job: JobAnalysis, options?: ReverseOptions): string {
		const lines: string[] = [];

		lines.push(`\t.job("${job.id}", (job: JobBuilder) =>`);
		lines.push(`\t\tjob`);

		// Check if this is a reusable workflow job (has 'uses' instead of 'runs-on')
		if (job.config?.uses) {
			return this.generateReusableWorkflowJob(job);
		}

		// Add job name if present
		if (job.name) {
			lines.push(`\t\t\t.name("${this.escapeString(job.name)}")`);
		}

		// Add job if condition if present
		if (job.if) {
			const condition = this.convertExpressions(job.if);
			lines.push(`\t\t\t.if("${this.escapeString(condition)}")`);
		}

		// Handle runs-on specially - if it's a pure expression, don't quote it
		if (job.runsOn.match(/^\$\{\{\s*[^}]+\s*\}\}$/)) {
			const expression = job.runsOn.replace(/^\$\{\{\s*([^}]+)\s*\}\}$/, "$1").trim();
			lines.push(`\t\t\t.runsOn(expr('${expression}'))`);
		} else {
			const runsOnValue = this.convertExpressions(job.runsOn);
			lines.push(`\t\t\t.runsOn(${JSON.stringify(runsOnValue)})`);
		}

		// Add job-level configuration
		if (job.timeoutMinutes !== undefined) {
			lines.push(`\t\t\t.timeoutMinutes(${job.timeoutMinutes})`);
		}

		if (job.needs) {
			const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
			lines.push(`\t\t\t.needs(${JSON.stringify(needs)})`);
		}

		if (job.environment) {
			if (typeof job.environment === "string") {
				lines.push(`\t\t\t.environment({ name: "${job.environment}" })`);
			} else {
				lines.push(`\t\t\t.environment(${JSON.stringify(job.environment)})`);
			}
		}

		if (job.strategy) {
			lines.push(`\t\t\t.strategy(${JSON.stringify(job.strategy, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add job-level env if present
		if (job.env) {
			lines.push(`\t\t\t.env(${JSON.stringify(job.env, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add job-level permissions if present
		if (job.permissions) {
			lines.push(`\t\t\t.permissions(${JSON.stringify(job.permissions, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add job-level outputs if present
		if (job.outputs) {
			lines.push(`\t\t\t.outputs(${JSON.stringify(job.outputs, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add job-level defaults if present
		if (job.defaults) {
			lines.push(`\t\t\t.defaults(${JSON.stringify(job.defaults, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add job-level concurrency if present
		if (job.concurrency) {
			lines.push(`\t\t\t.concurrency(${JSON.stringify(job.concurrency, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		// Add continue-on-error if present
		if (job.continueOnError !== undefined) {
			lines.push(`\t\t\t.continueOnError(${job.continueOnError})`);
		}

		// Generate steps
		for (const step of job.steps) {
			lines.push("");
			lines.push(this.generateStep(step, options));
		}

		lines.push("\t)");

		return lines.join("\n");
	}

	/**
	 * Generate reusable workflow job configuration
	 */
	private generateReusableWorkflowJob(job: JobAnalysis): string {
		const lines: string[] = [];

		lines.push(`\t.job("${job.id}", (job: JobBuilder) =>`);
		lines.push(`\t\tjob`);
		lines.push(`\t\t\t.uses("${job.config.uses}")`);

		// Add job name if present
		if (job.name) {
			lines.push(`\t\t\t.name("${this.escapeString(job.name)}")`);
		}

		// Add job if condition if present
		if (job.if) {
			const condition = this.convertExpressions(job.if);
			lines.push(`\t\t\t.if("${this.escapeString(condition)}")`);
		}

		// Add job-level configuration
		if (job.needs) {
			const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
			lines.push(`\t\t\t.needs(${JSON.stringify(needs)})`);
		}

		// Add with configuration
		if (job.config.with) {
			const withConfig = this.convertObjectExpressions(job.config.with as Record<string, unknown>);
			const withStr = this.stringifyWithExpressions(withConfig, "\t\t\t");
			lines.push(`\t\t\t.with(${withStr})`);
		}

		// Add secrets configuration
		if (job.config.secrets) {
			if (typeof job.config.secrets === "string") {
				// Handle secrets: "inherit"
				lines.push(`\t\t\t.secrets("${job.config.secrets}")`);
			} else if (typeof job.config.secrets === "object") {
				// Handle secrets: { key: value }
				const secretsConfig = this.convertObjectExpressions(job.config.secrets as Record<string, unknown>);
				const secretsStr = this.stringifyWithExpressions(secretsConfig, "\t\t\t");
				lines.push(`\t\t\t.secrets(${secretsStr})`);
			}
		}

		if (job.environment) {
			if (typeof job.environment === "string") {
				lines.push(`\t\t\t.environment({ name: "${job.environment}" })`);
			} else {
				lines.push(`\t\t\t.environment(${JSON.stringify(job.environment)})`);
			}
		}

		if (job.strategy) {
			lines.push(`\t\t\t.strategy(${JSON.stringify(job.strategy, null, 2).replace(/\n/g, "\n\t\t\t")})`);
		}

		lines.push("\t)");

		return lines.join("\n");
	}

	/**
	 * Generate step configuration
	 */
	private generateStep(step: StepAnalysis, options?: ReverseOptions): string {
		const lines: string[] = [];

		lines.push(`\t\t\t.step((step: StepBuilder) =>`);
		lines.push(`\t\t\t\tstep`);

		if (step.name) {
			lines.push(`\t\t\t\t\t.name("${this.escapeString(step.name)}")`);
		}

		if (step.id) {
			lines.push(`\t\t\t\t\t.id("${step.id}")`);
		}

		if (step.if) {
			const condition = this.convertExpressions(step.if);
			lines.push(`\t\t\t\t\t.if("${this.escapeString(condition)}")`);
		}

		// Generate action or run command
		if (step.uses) {
			lines.push(this.generateStepAction(step, options));
		} else if (step.run) {
			lines.push(this.generateStepRun(step));
		}

		lines.push(`\t\t\t)`);

		return lines.join("\n");
	}

	/**
	 * Generate step action usage
	 */
	private generateStepAction(step: StepAnalysis, options?: ReverseOptions): string {
		const lines: string[] = [];

		if (step.with || step.env) {
			const actionType = options?.generateTypes ? "TypedActionConfigBuilder<Record<string, unknown>>" : "ActionBuilder";
			lines.push(`\t\t\t\t\t.uses("${step.uses}", (action: ${actionType}) =>`);
			lines.push(`\t\t\t\t\t\taction`);

			if (step.with) {
				const withConfig = this.convertObjectExpressions(step.with);
				const withStr = this.stringifyWithExpressions(withConfig, "\t\t\t\t\t\t\t");
				lines.push(`\t\t\t\t\t\t\t.with(${withStr})`);
			}

			if (step.env) {
				const envConfig = this.convertObjectExpressions(step.env);
				const envStr = this.stringifyWithExpressions(envConfig, "\t\t\t\t\t\t\t");
				lines.push(`\t\t\t\t\t\t\t.env(${envStr})`);
			}

			lines.push(`\t\t\t\t\t)`);
		} else {
			lines.push(`\t\t\t\t\t.uses("${step.uses}")`);
		}

		return lines.join("\n");
	}

	/**
	 * Generate step run command
	 */
	private generateStepRun(step: StepAnalysis): string {
		const lines: string[] = [];

		// Convert all run commands to single .run() call
		const command = this.convertExpressions(step.run ?? "");
		// Use escapeTemplateString to preserve backslashes in shell scripts
		const escaped = this.escapeTemplateString(command);
		lines.push(`\t\t\t\t\t.run(\`${escaped}\`)`);

		if (step.shell) {
			// Handle shell - if it's an expression, use expr()
			if (step.shell.match(/^\$\{\{\s*[^}]+\s*\}\}$/)) {
				const expression = step.shell.replace(/^\$\{\{\s*([^}]+)\s*\}\}$/, "$1").trim();
				lines.push(`\t\t\t\t\t.shell(expr('${this.escapeString(expression)}'))`);
			} else {
				lines.push(`\t\t\t\t\t.shell("${this.escapeString(step.shell)}")`);
			}
		}

		if (step.env) {
			const envConfig = this.convertObjectExpressions(step.env);
			const envStr = this.stringifyWithExpressions(envConfig, "\t\t\t\t\t");
			lines.push(`\t\t\t\t\t.env(${envStr})`);
		}

		if (step.workingDirectory) {
			lines.push(`\t\t\t\t\t.workingDirectory("${this.escapeString(step.workingDirectory)}")`);
		}

		return lines.join("\n");
	}

	/**
	 * Convert GitHub Actions expressions to proper TypeScript expressions
	 */
	private convertExpressions(text: string): string {
		return text.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (_, expression) => {
			const trimmed = expression.trim();

			// Handle environment variables that should be treated as simple identifiers
			if (trimmed.match(/^[A-Z_][A-Z0-9_]*$/)) {
				return `\${${trimmed}}`;
			}

			// Handle special functions that should be treated as expressions
			if (
				trimmed.startsWith("fromJson(") ||
				trimmed.startsWith("toJson(") ||
				trimmed.startsWith("hashFiles(") ||
				trimmed.startsWith("contains(") ||
				trimmed.includes("inputs.") ||
				trimmed.includes("github.") ||
				trimmed.includes("env.") ||
				trimmed.includes("steps.") ||
				trimmed.includes("||") ||
				trimmed.includes("&&") ||
				trimmed.includes("==") ||
				trimmed.includes("!=") ||
				trimmed.includes(" ")
			) {
				const escapedExpr = trimmed.replace(/'/g, "\\'");
				return `\${expr('${escapedExpr}')}`;
			}

			// Handle simple variable references
			if (trimmed.match(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/)) {
				const escapedExpr = trimmed.replace(/'/g, "\\'");
				return `\${expr('${escapedExpr}')}`;
			}

			// Handle more complex expressions
			const escapedExpr = trimmed.replace(/'/g, "\\'");
			return `\${expr('${escapedExpr}')}`;
		});
	}

	/**
	 * Escape a string for use in generated TypeScript code
	 */
	private escapeString(str: string): string {
		return str
			.replace(/\\/g, "\\\\") // Backslash first
			.replace(/"/g, '\\"') // Double quotes
			.replace(/\n/g, "\\n") // Newlines
			.replace(/\r/g, "\\r") // Carriage returns
			.replace(/\t/g, "\\t"); // Tabs
	}

	/**
	 * Escape a string for use in template literals (backtick strings)
	 * This preserves backslashes and escapes backticks, but leaves expressions intact
	 */
	private escapeTemplateString(str: string): string {
		// First, protect existing ${...} patterns (both expr() and plain variables)
		// from backslash escaping by temporarily replacing them with placeholders
		const exprPattern = /\$\{[^}]+\}/g;
		const expressions: string[] = [];
		let result = str.replace(exprPattern, (match) => {
			expressions.push(match);
			return `___EXPR_${expressions.length - 1}___`;
		});

		// Now escape backslashes and backticks for template literal syntax
		result = result
			.replace(/\\/g, "\\\\") // Escape backslashes
			.replace(/`/g, "\\`"); // Escape backticks

		// Restore the expressions (they're already properly escaped)
		result = result.replace(/___EXPR_(\d+)___/g, (_, index) => {
			return expressions[parseInt(index)];
		});

		return result;
	}

	/**
	 * Convert expressions in object values, marking pure expressions for special handling
	 * Also converts property keys from kebab-case to camelCase for idiomatic TypeScript
	 */
	private convertObjectExpressions(obj: Record<string, unknown>): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			// Convert kebab-case keys to camelCase for TypeScript
			const camelKey = kebabToCamel(key);

			if (typeof value === "string") {
				// Check if the entire value is a single GitHub expression
				const pureExprMatch = value.match(/^\$\{\{\s*([^}]+)\s*\}\}$/);
				if (pureExprMatch) {
					// Mark as a pure expression that should not be quoted
					result[camelKey] = { __expr__: pureExprMatch[1].trim() };
				} else {
					result[camelKey] = this.convertExpressions(value);
				}
			} else {
				result[camelKey] = value;
			}
		}

		return result;
	}

	/**
	 * Stringify object with special handling for expr() calls
	 * Pure expressions (marked with __expr__) become actual expr() function calls
	 */
	private stringifyWithExpressions(obj: Record<string, unknown>, indent: string): string {
		const lines: string[] = ["{"];
		const entries = Object.entries(obj);

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i];
			const comma = i < entries.length - 1 ? "," : "";
			const keyStr = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `"${key}"`;

			if (value && typeof value === "object" && "__expr__" in value) {
				// Pure expression - output as expr() call
				// Escape single quotes in the expression
				const escapedExpr = String((value as { __expr__: string }).__expr__).replace(/'/g, "\\'");
				lines.push(`${indent}  ${keyStr}: expr('${escapedExpr}')${comma}`);
			} else if (typeof value === "string") {
				// Check if string contains template literal expressions
				if (value.includes("${expr(")) {
					// Output as template literal (backticks) to preserve expressions
					// Only escape backticks - backslashes are already escaped by convertExpressions
					const escaped = value.replace(/`/g, "\\`");
					lines.push(`${indent}  ${keyStr}: \`${escaped}\`${comma}`);
				} else {
					// Regular string - escape special characters
					const escaped = value
						.replace(/\\/g, "\\\\") // Backslash first
						.replace(/"/g, '\\"') // Double quotes
						.replace(/\n/g, "\\n") // Newlines
						.replace(/\r/g, "\\r") // Carriage returns
						.replace(/\t/g, "\\t"); // Tabs
					lines.push(`${indent}  ${keyStr}: "${escaped}"${comma}`);
				}
			} else if (typeof value === "object" && value !== null) {
				const nested = this.stringifyWithExpressions(value as Record<string, unknown>, indent + "  ");
				lines.push(`${indent}  ${keyStr}: ${nested}${comma}`);
			} else {
				lines.push(`${indent}  ${keyStr}: ${JSON.stringify(value)}${comma}`);
			}
		}

		lines.push(`${indent}}`);
		return lines.join("\n");
	}

	/**
	 * Check if workflow contains GitHub Actions expressions
	 */
	private hasGitHubExpressions(analysis: WorkflowAnalysis): boolean {
		const yamlStr = JSON.stringify(analysis.yaml);
		return /\$\{\{\s*[^}]+\s*\}\}/.test(yamlStr);
	}

	/**
	 * Generate filename for workflow
	 */
	private getWorkflowFileName(analysis: WorkflowAnalysis): string {
		const baseName = analysis.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		return `${baseName}.ts`;
	}
}
