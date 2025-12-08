import { join } from "node:path";
import type { GeneratedFile, LocalActionAnalysis, LocalActionRuns, ReverseOptions } from "./types";

/**
 * Generates TypeScript code for local actions
 */
export class LocalActionGenerator {
	/**
	 * Generate TypeScript local action builder from analysis
	 */
	generateLocalAction(analysis: LocalActionAnalysis, options: ReverseOptions = {}): GeneratedFile {
		const actionPath = this.getActionPath(analysis);
		const content = this.generateActionContent(analysis, options);

		return {
			path: join(options.outputDir || "flughafen", "actions", actionPath),
			content,
			type: "local-action",
		};
	}

	/**
	 * Generate the main action TypeScript content
	 */
	private generateActionContent(analysis: LocalActionAnalysis, options: ReverseOptions): string {
		if (!analysis.config) {
			return "// Failed to parse action configuration";
		}

		const imports = this.generateImports();
		const comments = this.generateComments(analysis, options);
		const action = this.generateActionBuilder(analysis);

		return [imports, "", comments, action].filter(Boolean).join("\n");
	}

	/**
	 * Generate import statements
	 */
	private generateImports(): string {
		return `import { createLocalAction } from "@flughafen/core";`;
	}

	/**
	 * Generate JSDoc comments from action
	 */
	private generateComments(analysis: LocalActionAnalysis, options: ReverseOptions): string {
		if (!options.preserveComments || !analysis.config) {
			return "";
		}

		const comments = ["/**", ` * ${analysis.config.name}`, ` * ${analysis.config.description}`];

		if (analysis.config.author) {
			comments.push(` * @author ${analysis.config.author}`);
		}

		comments.push(" */");

		return comments.join("\n");
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
	 * This escapes backticks and dollar signs to prevent template interpolation
	 */
	private escapeTemplateString(str: string): string {
		return str
			.replace(/\\/g, "\\\\") // Backslash first
			.replace(/`/g, "\\`") // Backticks
			.replace(/\$\{/g, "\\${"); // Dollar brace (prevent template interpolation)
	}

	/**
	 * Generate the action builder code
	 */
	private generateActionBuilder(analysis: LocalActionAnalysis): string {
		if (!analysis.config) {
			return "// Failed to generate action builder";
		}

		const lines: string[] = [];

		lines.push("export default createLocalAction()");
		lines.push(`\t.name("${this.escapeString(analysis.config.name)}")`);
		lines.push(`\t.description("${this.escapeString(analysis.config.description)}")`);

		// Add author if present
		if (analysis.config.author) {
			lines.push(`\t.author("${this.escapeString(analysis.config.author)}")`);
		}

		// Generate inputs
		if (analysis.config.inputs && Object.keys(analysis.config.inputs).length > 0) {
			lines.push(this.generateInputs(analysis.config.inputs));
		}

		// Generate outputs
		if (analysis.config.outputs && Object.keys(analysis.config.outputs).length > 0) {
			lines.push(this.generateOutputs(analysis.config.outputs));
		}

		// Generate runs configuration
		if (analysis.config.runs) {
			lines.push(this.generateRuns(analysis.config.runs));
		}

		// Generate branding if present
		if (analysis.config.branding) {
			lines.push(this.generateBranding(analysis.config.branding));
		}

		lines.push(";");

		return lines.join("\n");
	}

	/**
	 * Generate inputs configuration
	 */
	private generateInputs(inputs: NonNullable<LocalActionAnalysis["config"]>["inputs"]): string {
		if (!inputs) return "";

		const lines: string[] = [];

		lines.push("\t.inputs({");

		const inputEntries = Object.entries(inputs);
		for (let i = 0; i < inputEntries.length; i++) {
			const [key, input] = inputEntries[i];
			const isLast = i === inputEntries.length - 1;

			const props: string[] = [];
			props.push(`description: "${this.escapeString(input.description)}"`);

			if (input.required !== undefined) {
				props.push(`required: ${input.required}`);
			}

			if (input.default !== undefined) {
				props.push(`default: "${this.escapeString(input.default)}"`);
			}

			if (input.deprecationMessage) {
				props.push(`deprecationMessage: "${this.escapeString(input.deprecationMessage)}"`);
			}

			lines.push(`\t\t"${key}": {`);
			lines.push(`\t\t\t${props.join(",\n\t\t\t")}`);
			lines.push(`\t\t}${isLast ? "" : ","}`);
		}

		lines.push("\t})");

		return lines.join("\n");
	}

	/**
	 * Generate outputs configuration
	 */
	private generateOutputs(outputs: NonNullable<LocalActionAnalysis["config"]>["outputs"]): string {
		if (!outputs) return "";

		const lines: string[] = [];

		lines.push("\t.outputs({");

		const outputEntries = Object.entries(outputs);
		for (let i = 0; i < outputEntries.length; i++) {
			const [key, output] = outputEntries[i];
			const isLast = i === outputEntries.length - 1;

			const props: string[] = [];
			props.push(`description: "${this.escapeString(output.description)}"`);

			if (output.value !== undefined) {
				props.push(`value: "${this.escapeString(output.value)}"`);
			}

			lines.push(`\t\t"${key}": {`);
			lines.push(`\t\t\t${props.join(",\n\t\t\t")}`);
			lines.push(`\t\t}${isLast ? "" : ","}`);
		}

		lines.push("\t})");

		return lines.join("\n");
	}

	/**
	 * Generate runs configuration
	 */
	private generateRuns(runs: LocalActionRuns): string {
		if (!runs || !("using" in runs)) {
			return "";
		}

		if (runs.using === "composite") {
			return this.generateCompositeRuns(runs);
		} else if (runs.using === "docker") {
			return this.generateDockerRuns(runs);
		} else if (["node12", "node16", "node20", "node24"].includes(runs.using)) {
			return this.generateNodeRuns(runs);
		}

		return "";
	}

	/**
	 * Generate composite action runs
	 */
	private generateCompositeRuns(runs: Extract<LocalActionRuns, { using: "composite" }>): string {
		const lines: string[] = [];

		lines.push('\t.using("composite")');

		if (runs.steps && runs.steps.length > 0) {
			lines.push("\t.steps([");

			for (let i = 0; i < runs.steps.length; i++) {
				const step = runs.steps[i];
				const isLast = i === runs.steps.length - 1;

				const props: string[] = [];

				if (step.name) {
					props.push(`name: "${this.escapeString(step.name)}"`);
				}

				if (step.run) {
					props.push(`run: \`${this.escapeTemplateString(step.run)}\``);
				}

				if (step.uses) {
					props.push(`uses: "${this.escapeString(step.uses)}"`);
				}

				if (step.with) {
					props.push(`with: ${JSON.stringify(step.with, null, 2).replace(/\n/g, "\n\t\t\t")}`);
				}

				if (step.env) {
					props.push(`env: ${JSON.stringify(step.env, null, 2).replace(/\n/g, "\n\t\t\t")}`);
				}

				if (step.shell) {
					props.push(`shell: "${this.escapeString(step.shell)}"`);
				}

				lines.push("\t\t{");
				lines.push(`\t\t\t${props.join(",\n\t\t\t")}`);
				lines.push(`\t\t}${isLast ? "" : ","}`);
			}

			lines.push("\t])");
		}

		return lines.join("\n");
	}

	/**
	 * Generate Docker action runs
	 */
	private generateDockerRuns(runs: Extract<LocalActionRuns, { using: "docker" }>): string {
		const lines: string[] = [];

		lines.push('\t.using("docker")');
		lines.push(`\t.image("${runs.image}")`);

		if (runs.entrypoint) {
			lines.push(`\t.entrypoint("${runs.entrypoint}")`);
		}

		if (runs.args && runs.args.length > 0) {
			const argsStr = JSON.stringify(runs.args, null, 2).replace(/\n/g, "\n\t");
			lines.push(`\t.args(${argsStr})`);
		}

		if (runs.env) {
			const envStr = JSON.stringify(runs.env, null, 2).replace(/\n/g, "\n\t");
			lines.push(`\t.env(${envStr})`);
		}

		return lines.join("\n");
	}

	/**
	 * Generate Node.js action runs
	 */
	private generateNodeRuns(
		runs: Extract<LocalActionRuns, { using: "node12" | "node16" | "node20" | "node24" }>
	): string {
		const lines: string[] = [];

		lines.push(`\t.using("${runs.using}")`);
		lines.push(`\t.main("${runs.main}")`);

		if (runs.pre) {
			lines.push(`\t.pre("${runs.pre}")`);
		}

		if (runs.post) {
			lines.push(`\t.post("${runs.post}")`);
		}

		return lines.join("\n");
	}

	/**
	 * Generate branding configuration
	 */
	private generateBranding(branding: NonNullable<LocalActionAnalysis["config"]>["branding"]): string {
		if (!branding) return "";

		const props: string[] = [];

		if (branding.icon) {
			props.push(`icon: "${this.escapeString(branding.icon)}"`);
		}

		if (branding.color) {
			props.push(`color: "${this.escapeString(branding.color)}"`);
		}

		return `\t.branding({\n\t\t${props.join(",\n\t\t")}\n\t})`;
	}

	/**
	 * Generate directory name for action
	 * Returns path like "action-name/action.ts" to mirror .github/actions/action-name/action.yml
	 */
	private getActionPath(analysis: LocalActionAnalysis): string {
		const dirName = analysis.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		return `${dirName}/action.ts`;
	}
}
