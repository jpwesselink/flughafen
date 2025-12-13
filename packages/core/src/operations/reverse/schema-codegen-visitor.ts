import { kebabToCamel } from "../../utils/property-mapper.js";
import { ExpressionConverter } from "./expression-converter.js";
import type { SchemaVisitor, WalkContext } from "./schema-walker.js";
import type { ReverseOptions } from "./types.js";

/** Workflow step data from parsed YAML */
interface StepData {
	id?: string;
	name?: string;
	if?: string;
	uses?: string;
	with?: Record<string, unknown>;
	run?: string;
	env?: Record<string, string>;
	shell?: string;
	"continue-on-error"?: boolean;
	"timeout-minutes"?: number;
	"working-directory"?: string;
}

/**
 * Visitor that generates TypeScript code from workflow data using schema
 */
export class TypeScriptCodegenVisitor implements SchemaVisitor {
	private code: string[] = [];
	private indentLevel = 0;
	private contextStack: WalkContext[] = [];
	private inStepsArray = false; // Track if we're inside a steps array
	private exprConverter = new ExpressionConverter();
	private hasExpressions = false; // Track if we need to import expr()
	private options: ReverseOptions;
	private localActionImports = new Map<string, string>(); // path → variableName
	private filename: string | undefined;

	constructor(options: ReverseOptions = {}, filename?: string) {
		this.options = options;
		this.filename = filename;
	}

	getGeneratedCode(): string {
		const codeStr = this.code.join("\n");

		// Build @flughafen/core value imports
		const valueImports = this.hasExpressions ? ["createWorkflow", "expr"] : ["createWorkflow"];

		// No need to import type annotations - TypeScript can infer them
		const flugehafenImports = `import { ${valueImports.join(", ")} } from '@flughafen/core';`;

		// Build local action imports
		const localActionImportLines: string[] = [];
		if (this.options.importLocalActions && this.localActionImports.size > 0) {
			for (const [, varName] of this.localActionImports) {
				// Import path is relative from workflow output dir to action output dir
				// Assuming actions are in ./actions/ subdirectory
				localActionImportLines.push(`import ${varName} from "./actions/${varName}";`);
			}
		}

		const allImports = [flugehafenImports, ...localActionImportLines].join("\n");

		return codeStr.replace("__IMPORTS__", allImports);
	}

	enter(context: WalkContext): undefined | boolean {
		this.contextStack.push(context);

		const pathStr = context.path.join(".");

		// Root workflow - imports will be added at the end when we know if we need expr()
		if (context.path.length === 0) {
			// Add triple-slash reference to include ambient types
			// Path is relative to workflow file location (./flughafen/workflows/) to project root
			this.code.push('/// <reference path="../../flughafen-actions.d.ts" />');
			this.code.push("");
			// Placeholder for imports
			this.code.push("__IMPORTS__");
			this.code.push("");
			this.code.push("export default createWorkflow()");
			this.indentLevel = 1;

			// Add .filename() if provided (preserving original extension)
			if (this.filename) {
				// Keep the full filename with extension
				this.emit(`.filename("${this.filename}")`);
			}

			return; // Continue to children
		}

		// Jobs object - skip, just container
		if (pathStr === "jobs") {
			return; // Continue to individual jobs
		}

		// Top-level workflow properties (name, on, etc.)
		if (context.path.length === 1) {
			return this.handleWorkflowProperty(context);
		}

		// Individual job - enter
		if (context.path.length === 2 && context.path[0] === "jobs") {
			const jobId = context.path[1];
			this.emit(`.job("${jobId}", job => job`);
			this.indentLevel++;
			return; // Continue to job properties
		}

		return true;
	}

	leave(context: WalkContext): void {
		this.contextStack.pop();

		// Leaving steps array
		if (context.path.length === 3 && context.path[0] === "jobs" && context.key === "steps") {
			this.inStepsArray = false;
		}

		// Close job
		if (context.path.length === 2 && context.path[0] === "jobs") {
			this.indentLevel--;
			this.emit(")");
		}

		// Close workflow
		if (context.path.length === 0) {
			this.code.push(";");
		}
	}

	visitProperty(context: WalkContext): undefined | boolean {
		// Handle workflow-level properties
		if (context.path.length === 1 && context.key !== "jobs") {
			return this.handleWorkflowProperty(context);
		}

		// Handle job-level properties
		if (context.path.length === 3 && context.path[0] === "jobs") {
			return this.handleJobProperty(context);
		}

		return true;
	}

	visitArrayItem(context: WalkContext): void {
		// Handle individual steps in the steps array
		if (this.inStepsArray && typeof context.data === "object" && context.data !== null) {
			const step = context.data as StepData;

			// Start the .step() call
			this.emit(`.step(step => step`);
			this.indentLevel++;

			// Generate step properties
			if (step.id) {
				this.emit(`.id(${this.valueToCode(step.id)})`);
			}
			if (step.name) {
				this.emit(`.name(${this.valueToCode(step.name)})`);
			}
			if (step.if) {
				this.emit(`.if(${this.valueToCode(step.if)})`);
			}

			// Handle uses (action step)
			if (step.uses) {
				const usesRef = this.getActionReference(step.uses);
				if (step.with) {
					// Generate .uses with .with()
					this.emit(`.uses(${usesRef}, (uses) => uses`);
					this.indentLevel++;
					this.emit(`.with(${this.valueToCode(step.with)})`);
					this.indentLevel--;
					this.emit(`)`);
				} else {
					// Just .uses without configuration
					this.emit(`.uses(${usesRef})`);
				}
			}

			// Handle run (run step)
			if (step.run) {
				this.emit(`.run(${this.valueToCode(step.run)})`);
			}

			// Handle other common step properties
			if (step.env) {
				this.emit(`.env(${this.valueToCode(step.env)})`);
			}
			if (step["continue-on-error"] !== undefined) {
				this.emit(`.continueOnError(${JSON.stringify(step["continue-on-error"])})`);
			}
			if (step["timeout-minutes"] !== undefined) {
				this.emit(`.timeoutMinutes(${JSON.stringify(step["timeout-minutes"])})`);
			}
			if (step.shell) {
				this.emit(`.shell(${this.valueToCode(step.shell)})`);
			}
			if (step["working-directory"]) {
				this.emit(`.workingDirectory(${this.valueToCode(step["working-directory"])})`);
			}

			// Close the .step() call
			this.indentLevel--;
			this.emit(`)`);
		}
	}

	private handleWorkflowProperty(context: WalkContext): boolean {
		const propName = context.key ?? "";
		const data = context.data;

		// Handle different workflow properties
		if (propName === "name") {
			this.emit(`.name(${this.valueToCode(data)})`);
		} else if (propName === "on") {
			// Handle the 'on' property with proper event syntax
			if (typeof data === "object" && data !== null) {
				const eventData = data as Record<string, unknown>;
				const eventNames = Object.keys(eventData);

				// For single events like push, pull_request, etc.
				if (eventNames.length === 1) {
					const eventName = eventNames[0];
					const eventConfig = eventData[eventName];
					// For complex events like workflow_call, always use object format
					const complexEvents = ["workflow_call", "workflow_dispatch"];
					if (complexEvents.includes(eventName)) {
						// Preserve booleans for workflow configuration
						this.emit(`.on(${this.valueToCode(data, false)})`);
					} else if (eventConfig && typeof eventConfig === "object") {
						this.emit(`.on("${eventName}", ${this.valueToCode(eventConfig)})`);
					} else {
						// Event without config
						this.emit(`.on("${eventName}")`);
					}
				} else {
					// Multiple events - use object format, preserve booleans
					this.emit(`.on(${this.valueToCode(data, false)})`);
				}
			} else {
				// String event name
				this.emit(`.on(${this.valueToCode(data)})`);
			}
		} else if (propName === "permissions") {
			this.emit(`.permissions(${this.valueToCode(data)})`);
		} else if (propName === "concurrency") {
			this.emit(`.concurrency(${this.valueToCode(data)})`);
		} else if (propName === "env") {
			this.emit(`.env(${this.valueToCode(data)})`);
		} else if (propName === "defaults") {
			this.emit(`.defaults(${this.valueToCode(data)})`);
		} else if (propName === "run-name") {
			this.emit(`.runName(${this.valueToCode(data)})`);
		}
		// Add more workflow properties as needed

		return false; // Don't traverse into property value
	}

	private handleJobProperty(context: WalkContext): boolean {
		const propName = context.key ?? "";
		const data = context.data;
		const schema = context.schema;

		// Special handling for steps array - generate .addStep() for each step
		if (propName === "steps" && Array.isArray(data)) {
			this.inStepsArray = true;
			return true; // Continue to traverse array items
		}

		// Detect if this is a oneOf with string|object or string|array
		if (schema.oneOf) {
			const hasObject = schema.oneOf.some((s) => s.type === "object" || s.$ref?.includes("Object") || s.properties);
			const hasArray = schema.oneOf.some((s) => s.type === "array");

			if (typeof data === "string") {
				// String value
				if (hasObject && !hasArray) {
					// String shorthand for object (e.g., environment: "prod")
					this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
				} else if (hasArray) {
					// String shorthand for array (e.g., needs: "job")
					this.emit(`.${kebabToCamel(propName)}([${this.valueToCode(data)}])`);
				} else {
					// Plain string
					this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
				}
				return false; // Don't traverse children
			} else if (Array.isArray(data)) {
				// Array value
				this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
				return false;
			} else if (typeof data === "object") {
				// Object value
				this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
				return false;
			}
		}

		// Default handling based on data type
		if (typeof data === "string") {
			this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
			return false;
		} else if (typeof data === "number" || typeof data === "boolean") {
			this.emit(`.${kebabToCamel(propName)}(${data})`);
			return false;
		} else if (Array.isArray(data)) {
			this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
			return false;
		} else if (typeof data === "object" && data !== null) {
			this.emit(`.${kebabToCamel(propName)}(${this.valueToCode(data)})`);
			return false;
		}

		return true;
	}

	private emit(code: string): void {
		this.code.push(this.getIndent() + code);
	}

	private getIndent(): string {
		return "\t".repeat(this.indentLevel);
	}

	/**
	 * Convert a value to TypeScript code, using expr() for GitHub Actions expressions
	 */
	private valueToCode(value: unknown, convertBooleansToStrings = true): string {
		if (typeof value === "string") {
			if (this.exprConverter.hasExpression(value)) {
				this.hasExpressions = true;
				return this.exprConverter.convertToExpr(value);
			}
			return JSON.stringify(value);
		}

		if (typeof value === "number" || value === null) {
			return JSON.stringify(value);
		}
		if (typeof value === "boolean") {
			// GitHub Actions typically expect boolean values as strings for action inputs
			// but workflow configuration should preserve booleans
			return convertBooleansToStrings ? JSON.stringify(String(value)) : JSON.stringify(value);
		}

		if (Array.isArray(value)) {
			const items = value.map((item) => this.valueToCode(item, convertBooleansToStrings));
			return `[${items.join(", ")}]`;
		}

		if (typeof value === "object") {
			const entries = Object.entries(value).map(([key, val]) => {
				const convertedValue = this.valueToCode(val, convertBooleansToStrings);
				// Convert kebab-case keys to camelCase to match TypeScript interface property names
				const camelKey = kebabToCamel(key);
				return `${this.getIndent()}\t${camelKey}: ${convertedValue}`;
			});
			return `{\n${entries.join(",\n")}\n${this.getIndent()}}`;
		}

		return JSON.stringify(value);
	}

	/**
	 * Get the action reference for .uses() - either a variable or string
	 * Local actions (starting with ./) can be imported as variables when importLocalActions is enabled
	 */
	private getActionReference(uses: string): string {
		// Check if this is a local action
		if (uses.startsWith("./") && this.options.importLocalActions) {
			// Extract action name from path like "./.github/actions/setup-rust"
			const actionName = this.extractActionName(uses);
			const varName = this.pathToVariableName(actionName);

			// Track the import
			this.localActionImports.set(uses, varName);

			// Return variable reference (no quotes)
			return varName;
		}

		// Return as quoted string
		return this.valueToCode(uses);
	}

	/**
	 * Extract action name from local action path
	 * "./.github/actions/setup-rust" → "setup-rust"
	 */
	private extractActionName(path: string): string {
		// Remove leading ./ and get the last segment
		const normalized = path.replace(/^\.\//, "");
		const segments = normalized.split("/");
		return segments[segments.length - 1];
	}

	/**
	 * Convert action name to valid JavaScript variable name (camelCase)
	 * "setup-rust" → "setupRust"
	 */
	private pathToVariableName(name: string): string {
		return name
			.split("-")
			.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
			.join("");
	}
}
