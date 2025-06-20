/**
 * Represents a discovered action reference in a workflow
 */
export interface ActionReference {
	/** Full action string (e.g., 'actions/checkout@v4') */
	action: string;
	/** Owner/organization (e.g., 'actions') */
	owner: string;
	/** Action name (e.g., 'checkout') */
	name: string;
	/** Version/ref (e.g., 'v4', 'main', commit hash) */
	version: string;
	/** Usage contexts for debugging (e.g., ['job:build', 'step:checkout']) */
	usageContexts: string[];
}

/**
 * Workflow scanner that extracts string-based action references from built workflows
 */
export class WorkflowScanner {
	/**
	 * Scan a workflow builder for string-based actions
	 */
	scanWorkflow(workflow: any): ActionReference[] {
		const actions: ActionReference[] = [];

		// Scan the main workflow configuration
		const built = workflow.build();
		actions.push(...this.extractActionsFromWorkflowConfig(built));

		// Scan local actions used by the workflow
		if (typeof workflow.getLocalActions === "function") {
			const localActions = workflow.getLocalActions();
			for (const localAction of localActions) {
				const localActionRefs = this.extractActionsFromLocalAction(localAction);
				actions.push(...localActionRefs);
			}
		}

		return this.deduplicateActions(actions);
	}

	/**
	 * Scan multiple workflows and return deduplicated actions
	 */
	scanWorkflows(workflows: any[]): ActionReference[] {
		const allActions: ActionReference[] = [];

		for (const workflow of workflows) {
			const actions = this.scanWorkflow(workflow);
			allActions.push(...actions);
		}

		return this.deduplicateActions(allActions);
	}

	/**
	 * Extract actions from a built workflow configuration object
	 */
	private extractActionsFromWorkflowConfig(config: any): ActionReference[] {
		const actions: ActionReference[] = [];

		if (!config.jobs) {
			return actions;
		}

		// Iterate through all jobs
		for (const [jobId, jobConfig] of Object.entries(
			config.jobs as Record<string, any>,
		)) {
			if (!jobConfig.steps || !Array.isArray(jobConfig.steps)) {
				continue;
			}

			// Iterate through all steps in the job
			for (let stepIndex = 0; stepIndex < jobConfig.steps.length; stepIndex++) {
				const step = jobConfig.steps[stepIndex];

				if (step.uses && typeof step.uses === "string") {
					const actionRef = this.parseActionString(step.uses);
					if (actionRef) {
						const context = `job:${jobId}/step:${stepIndex}${step.name ? `(${step.name})` : ""}`;
						actionRef.usageContexts = [context];
						actions.push(actionRef);
					}
				}
			}
		}

		return actions;
	}

	/**
	 * Extract actions from a local action builder
	 */
	private extractActionsFromLocalAction(localAction: any): ActionReference[] {
		const actions: ActionReference[] = [];

		try {
			const built = localAction.build();

			// Check if this is a composite action with steps
			if (built.runs && built.runs.steps && Array.isArray(built.runs.steps)) {
				for (let i = 0; i < built.runs.steps.length; i++) {
					const step = built.runs.steps[i];

					// Look for steps that use external actions
					if (step.uses && typeof step.uses === "string") {
						const actionRef = this.parseActionString(step.uses);
						if (actionRef && this.isStringAction(actionRef.action)) {
							actionRef.usageContexts = [
								`local-action:${built.name || "unnamed"}`,
								`step:${i}`,
							];
							actions.push(actionRef);
						}
					}
				}
			}
		} catch (error) {
			// Ignore errors in local action parsing
		}

		return actions;
	}

	/**
	 * Parse an action string into its components
	 * Examples:
	 * - 'actions/checkout@v4' -> { owner: 'actions', name: 'checkout', version: 'v4' }
	 * - 'aws-actions/configure-aws-credentials@v2' -> { owner: 'aws-actions', name: 'configure-aws-credentials', version: 'v2' }
	 * - 'my-org/custom-action@main' -> { owner: 'my-org', name: 'custom-action', version: 'main' }
	 */
	private parseActionString(actionString: string): ActionReference | null {
		// Skip local actions (start with './')
		if (actionString.startsWith("./")) {
			return null;
		}

		// Parse pattern: owner/name@version
		const actionRegex = /^([^/]+)\/([^@]+)@(.+)$/;
		const match = actionString.match(actionRegex);

		if (!match) {
			// Try pattern without version: owner/name
			const noVersionRegex = /^([^/]+)\/(.+)$/;
			const noVersionMatch = actionString.match(noVersionRegex);

			if (noVersionMatch) {
				return {
					action: actionString,
					owner: noVersionMatch[1],
					name: noVersionMatch[2],
					version: "latest",
					usageContexts: [],
				};
			}

			return null;
		}

		return {
			action: actionString,
			owner: match[1],
			name: match[2],
			version: match[3],
			usageContexts: [],
		};
	}

	/**
	 * Deduplicate actions, merging usage contexts
	 */
	private deduplicateActions(actions: ActionReference[]): ActionReference[] {
		const actionMap = new Map<string, ActionReference>();

		for (const action of actions) {
			const existing = actionMap.get(action.action);
			if (existing) {
				// Merge usage contexts
				existing.usageContexts.push(...action.usageContexts);
			} else {
				actionMap.set(action.action, action);
			}
		}

		return Array.from(actionMap.values());
	}

	/**
	 * Filter actions by owner/organization
	 */
	filterActionsByOwner(
		actions: ActionReference[],
		owners: string[],
	): ActionReference[] {
		return actions.filter((action) => owners.includes(action.owner));
	}

	/**
	 * Get unique owners from action list
	 */
	getUniqueOwners(actions: ActionReference[]): string[] {
		const owners = new Set(actions.map((action) => action.owner));
		return Array.from(owners).sort();
	}

	/**
	 * Scan a YAML workflow file for string-based actions
	 */
	scanWorkflowYaml(yamlContent: string): ActionReference[] {
		try {
			// Parse YAML content
			const workflowConfig = this.parseYaml(yamlContent);
			return this.extractActionsFromWorkflowConfig(workflowConfig);
		} catch (error) {
			console.warn("Failed to parse YAML workflow:", error);
			return [];
		}
	}

	/**
	 * Simple YAML parser for workflow files
	 */
	private parseYaml(content: string): any {
		// For now, this is a very basic YAML parser
		// In a production implementation, we'd use a proper YAML library
		try {
			// Try to find actions using regex patterns
			const actions: string[] = [];
			const lines = content.split("\n");

			for (const line of lines) {
				const trimmed = line.trim();

				// Look for "uses:" lines
				const usesMatch = trimmed.match(/^uses:\s*['"]?([^'"]+)['"]?/);
				if (usesMatch) {
					const actionString = usesMatch[1].trim();
					if (this.isStringAction(actionString)) {
						actions.push(actionString);
					}
				}
			}

			// Convert to ActionReference objects
			return {
				jobs: {
					dummy: {
						steps: actions.map((action) => ({ uses: action })),
					},
				},
			};
		} catch (error) {
			console.warn("Failed to parse YAML:", error);
			return { jobs: {} };
		}
	}

	/**
	 * Check if a string is a valid action reference (for YAML parsing)
	 */
	private isStringAction(actionString: string): boolean {
		// Basic validation: should contain a '/' and optionally '@'
		return /^[^/]+\/.+/.test(actionString);
	}
}

// Export convenience instance
export const workflowScanner = new WorkflowScanner();

/**
 * In-source tests for WorkflowScanner
 */
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("WorkflowScanner", () => {
		it("should parse action strings correctly", () => {
			const scanner = new WorkflowScanner();

			// Test the private method via reflection for testing
			const parseAction = (scanner as any).parseActionString.bind(scanner);

			const result1 = parseAction("actions/checkout@v4");
			expect(result1).toEqual({
				action: "actions/checkout@v4",
				owner: "actions",
				name: "checkout",
				version: "v4",
				usageContexts: [],
			});

			const result2 = parseAction("aws-actions/configure-aws-credentials@v2");
			expect(result2).toEqual({
				action: "aws-actions/configure-aws-credentials@v2",
				owner: "aws-actions",
				name: "configure-aws-credentials",
				version: "v2",
				usageContexts: [],
			});

			const result3 = parseAction("my-org/custom-action@main");
			expect(result3).toEqual({
				action: "my-org/custom-action@main",
				owner: "my-org",
				name: "custom-action",
				version: "main",
				usageContexts: [],
			});
		});

		it("should handle actions without version", () => {
			const scanner = new WorkflowScanner();
			const parseAction = (scanner as any).parseActionString.bind(scanner);

			const result = parseAction("actions/checkout");
			expect(result).toEqual({
				action: "actions/checkout",
				owner: "actions",
				name: "checkout",
				version: "latest",
				usageContexts: [],
			});
		});

		it("should ignore local actions", () => {
			const scanner = new WorkflowScanner();
			const parseAction = (scanner as any).parseActionString.bind(scanner);

			const result = parseAction("./actions/my-local-action");
			expect(result).toBeNull();
		});

		it("should scan workflow configuration", () => {
			const scanner = new WorkflowScanner();

			const mockWorkflowConfig = {
				jobs: {
					build: {
						"runs-on": "ubuntu-latest",
						steps: [
							{
								name: "Checkout",
								uses: "actions/checkout@v4",
							},
							{
								name: "Setup Node",
								uses: "actions/setup-node@v4",
								with: { "node-version": "18" },
							},
							{
								name: "Local action",
								uses: "./actions/my-local-action",
							},
							{
								name: "Run command",
								run: "npm test",
							},
						],
					},
					deploy: {
						"runs-on": "ubuntu-latest",
						steps: [
							{
								name: "Configure AWS",
								uses: "aws-actions/configure-aws-credentials@v2",
							},
						],
					},
				},
			};

			const mockWorkflow = {
				build: () => mockWorkflowConfig,
			};

			const actions = scanner.scanWorkflow(mockWorkflow);

			expect(actions).toHaveLength(3);
			expect(actions[0]).toEqual({
				action: "actions/checkout@v4",
				owner: "actions",
				name: "checkout",
				version: "v4",
				usageContexts: ["job:build/step:0(Checkout)"],
			});
			expect(actions[1]).toEqual({
				action: "actions/setup-node@v4",
				owner: "actions",
				name: "setup-node",
				version: "v4",
				usageContexts: ["job:build/step:1(Setup Node)"],
			});
			expect(actions[2]).toEqual({
				action: "aws-actions/configure-aws-credentials@v2",
				owner: "aws-actions",
				name: "configure-aws-credentials",
				version: "v2",
				usageContexts: ["job:deploy/step:0(Configure AWS)"],
			});
		});

		it("should deduplicate actions", () => {
			const scanner = new WorkflowScanner();

			const actions: ActionReference[] = [
				{
					action: "actions/checkout@v4",
					owner: "actions",
					name: "checkout",
					version: "v4",
					usageContexts: ["job:build/step:0"],
				},
				{
					action: "actions/checkout@v4",
					owner: "actions",
					name: "checkout",
					version: "v4",
					usageContexts: ["job:test/step:0"],
				},
				{
					action: "actions/setup-node@v4",
					owner: "actions",
					name: "setup-node",
					version: "v4",
					usageContexts: ["job:build/step:1"],
				},
			];

			const deduplicated = (scanner as any).deduplicateActions(actions);

			expect(deduplicated).toHaveLength(2);
			expect(deduplicated[0].action).toBe("actions/checkout@v4");
			expect(deduplicated[0].usageContexts).toEqual([
				"job:build/step:0",
				"job:test/step:0",
			]);
			expect(deduplicated[1].action).toBe("actions/setup-node@v4");
			expect(deduplicated[1].usageContexts).toEqual(["job:build/step:1"]);
		});

		it("should filter actions by owner", () => {
			const scanner = new WorkflowScanner();

			const actions: ActionReference[] = [
				{
					action: "actions/checkout@v4",
					owner: "actions",
					name: "checkout",
					version: "v4",
					usageContexts: [],
				},
				{
					action: "aws-actions/configure-aws-credentials@v2",
					owner: "aws-actions",
					name: "configure-aws-credentials",
					version: "v2",
					usageContexts: [],
				},
				{
					action: "my-org/custom-action@v1",
					owner: "my-org",
					name: "custom-action",
					version: "v1",
					usageContexts: [],
				},
			];

			const filtered = scanner.filterActionsByOwner(actions, [
				"actions",
				"aws-actions",
			]);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].owner).toBe("actions");
			expect(filtered[1].owner).toBe("aws-actions");
		});

		it("should get unique owners", () => {
			const scanner = new WorkflowScanner();

			const actions: ActionReference[] = [
				{
					action: "actions/checkout@v4",
					owner: "actions",
					name: "checkout",
					version: "v4",
					usageContexts: [],
				},
				{
					action: "actions/setup-node@v4",
					owner: "actions",
					name: "setup-node",
					version: "v4",
					usageContexts: [],
				},
				{
					action: "aws-actions/configure-aws-credentials@v2",
					owner: "aws-actions",
					name: "configure-aws-credentials",
					version: "v2",
					usageContexts: [],
				},
				{
					action: "my-org/custom-action@v1",
					owner: "my-org",
					name: "custom-action",
					version: "v1",
					usageContexts: [],
				},
			];

			const owners = scanner.getUniqueOwners(actions);

			expect(owners).toEqual(["actions", "aws-actions", "my-org"]);
		});
	});
}
