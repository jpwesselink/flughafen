import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { WorkflowParser } from "../workflow-parser";

describe("Workflow Call Support", () => {
	const testFiles: string[] = [];

	const createTestFile = (filename: string, content: string): string => {
		writeFileSync(filename, content);
		testFiles.push(filename);
		return filename;
	};

	afterEach(() => {
		// Clean up test files
		testFiles.forEach((file) => {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		});
		testFiles.length = 0;
	});

	describe("Workflow Call Analysis", () => {
		it("should analyze workflow_call triggers correctly", async () => {
			const workflowCallYaml = createTestFile(
				"test-workflow-call.yml",
				`
name: Reusable Workflow

on:
  workflow_call:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: string
        default: 'staging'
      version:
        description: 'Version to deploy'
        required: false
        type: string
      debug:
        description: 'Enable debug mode'
        required: false
        type: boolean
        default: false
    secrets:
      deploy_token:
        description: 'Deployment token'
        required: true
      api_key:
        description: 'API key for deployment'
        required: false
    outputs:
      deployment_url:
        description: 'URL of the deployed application'
        value: \${{ jobs.deploy.outputs.url }}
      deployment_id:
        description: 'ID of the deployment'
        value: \${{ jobs.deploy.outputs.id }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      url: \${{ steps.deploy.outputs.url }}
      id: \${{ steps.deploy.outputs.id }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy application
        id: deploy
        run: |
          echo "Deploying to \${{ inputs.environment }}"
          echo "Version: \${{ inputs.version }}"
          echo "Debug: \${{ inputs.debug }}"
          echo "url=https://app-\${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT
          echo "id=deploy-$(date +%s)" >> $GITHUB_OUTPUT
        env:
          DEPLOY_TOKEN: \${{ secrets.deploy_token }}
          API_KEY: \${{ secrets.api_key }}
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(workflowCallYaml, {
				preview: false,
				outputDir: "./test-output",
			});

			// Should process successfully
			expect(result.errors).toHaveLength(0);
			expect(result.workflows).toHaveLength(1);
			expect(result.generatedFiles).toHaveLength(1);

			const workflow = result.workflows[0];
			expect(workflow.name).toBe("Reusable Workflow");
			expect(workflow.triggers).toHaveLength(1);

			// Check workflow_call trigger
			const trigger = workflow.triggers[0];
			expect(trigger.event).toBe("workflow_call");
			expect(trigger.config).toBeDefined();
			expect(trigger.config?.inputs).toBeDefined();
			expect(trigger.config?.secrets).toBeDefined();
			expect(trigger.config?.outputs).toBeDefined();

			// Check inputs
			const inputs = trigger.config?.inputs as any;
			expect(inputs.environment).toBeDefined();
			expect(inputs.environment.description).toBe("Environment to deploy to");
			expect(inputs.environment.required).toBe(true);
			expect(inputs.environment.type).toBe("string");
			expect(inputs.environment.default).toBe("staging");

			expect(inputs.version).toBeDefined();
			expect(inputs.version.description).toBe("Version to deploy");
			expect(inputs.version.required).toBe(false);
			expect(inputs.version.type).toBe("string");

			expect(inputs.debug).toBeDefined();
			expect(inputs.debug.type).toBe("boolean");
			expect(inputs.debug.default).toBe(false);

			// Check secrets
			const secrets = trigger.config?.secrets as any;
			expect(secrets.deploy_token).toBeDefined();
			expect(secrets.deploy_token.description).toBe("Deployment token");
			expect(secrets.deploy_token.required).toBe(true);

			expect(secrets.api_key).toBeDefined();
			expect(secrets.api_key.description).toBe("API key for deployment");
			expect(secrets.api_key.required).toBe(false);

			// Check outputs
			const outputs = trigger.config?.outputs as any;
			expect(outputs.deployment_url).toBeDefined();
			expect(outputs.deployment_url.description).toBe("URL of the deployed application");
			expect(outputs.deployment_url.value).toBe("${{ jobs.deploy.outputs.url }}");

			expect(outputs.deployment_id).toBeDefined();
			expect(outputs.deployment_id.description).toBe("ID of the deployment");
			expect(outputs.deployment_id.value).toBe("${{ jobs.deploy.outputs.id }}");
		});

		it("should generate correct TypeScript for workflow_call", async () => {
			const workflowCallYaml = createTestFile(
				"simple-workflow-call.yml",
				`
name: Simple Reusable Workflow

on:
  workflow_call:
    inputs:
      message:
        description: 'Message to display'
        required: true
        type: string
    secrets:
      token:
        description: 'Access token'
        required: true

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Say hello
        run: echo "Hello \${{ inputs.message }}"
        env:
          TOKEN: \${{ secrets.token }}
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(workflowCallYaml, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.generatedFiles).toHaveLength(1);
			const generatedFile = result.generatedFiles[0];

			expect(generatedFile.type).toBe("workflow");
			expect(generatedFile.content).toContain("createWorkflow()");
			expect(generatedFile.content).toContain('.name("Simple Reusable Workflow")');
			expect(generatedFile.content).toContain('.on("workflow_call"');

			// Check workflow_call configuration
			expect(generatedFile.content).toContain("inputs: {");
			expect(generatedFile.content).toContain("message: {");
			expect(generatedFile.content).toContain('description: "Message to display"');
			expect(generatedFile.content).toContain("required: true");
			expect(generatedFile.content).toContain('type: "string"');

			expect(generatedFile.content).toContain("secrets: {");
			expect(generatedFile.content).toContain("token: {");
			expect(generatedFile.content).toContain('description: "Access token"');

			// Check job generation
			expect(generatedFile.content).toContain('.job("greet"');
			expect(generatedFile.content).toContain('.runsOn("ubuntu-latest")');
			expect(generatedFile.content).toContain(".step(");
		});

		it("should handle workflow_call with minimal configuration", async () => {
			const minimalWorkflowCall = createTestFile(
				"minimal-workflow-call.yml",
				`
name: Minimal Reusable Workflow

on:
  workflow_call:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello World"
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(minimalWorkflowCall, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.errors).toHaveLength(0);
			expect(result.workflows).toHaveLength(1);
			expect(result.generatedFiles).toHaveLength(1);

			const workflow = result.workflows[0];
			const trigger = workflow.triggers[0];
			expect(trigger.event).toBe("workflow_call");
			// Config can be undefined for minimal workflow_call (YAML null -> undefined)
			expect(trigger.config).toBeUndefined();

			// Check generated TypeScript
			const generatedFile = result.generatedFiles[0];
			expect(generatedFile.content).toContain('.on("workflow_call")');
			// Should NOT contain the object form since there's no configuration
			expect(generatedFile.content).not.toContain('.on("workflow_call", {');
		});

		it("should handle workflow_call with only inputs", async () => {
			const inputsOnlyWorkflowCall = createTestFile(
				"inputs-only-workflow-call.yml",
				`
name: Inputs Only Workflow

on:
  workflow_call:
    inputs:
      name:
        description: 'Name to greet'
        required: true
        type: string

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello \${{ inputs.name }}"
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(inputsOnlyWorkflowCall, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.errors).toHaveLength(0);

			const workflow = result.workflows[0];
			const trigger = workflow.triggers[0];
			expect(trigger.config?.inputs).toBeDefined();
			expect((trigger.config?.inputs as any).name).toBeDefined();
			expect(trigger.config?.secrets).toBeUndefined();
			expect(trigger.config?.outputs).toBeUndefined();
		});

		it("should handle workflow_call with only secrets", async () => {
			const secretsOnlyWorkflowCall = createTestFile(
				"secrets-only-workflow-call.yml",
				`
name: Secrets Only Workflow

on:
  workflow_call:
    secrets:
      api_key:
        description: 'API key'
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing with secret"
        env:
          API_KEY: \${{ secrets.api_key }}
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(secretsOnlyWorkflowCall, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.errors).toHaveLength(0);

			const workflow = result.workflows[0];
			const trigger = workflow.triggers[0];
			expect(trigger.config?.secrets).toBeDefined();
			expect((trigger.config?.secrets as any).api_key).toBeDefined();
			expect(trigger.config?.inputs).toBeUndefined();
			expect(trigger.config?.outputs).toBeUndefined();
		});

		it("should handle workflow that calls reusable workflows", async () => {
			const callerWorkflow = createTestFile(
				"caller-workflow.yml",
				`
name: Caller Workflow

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      version: \${{ github.sha }}
      debug: false
    secrets:
      deploy_token: \${{ secrets.STAGING_TOKEN }}
      api_key: \${{ secrets.API_KEY }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
      version: \${{ github.sha }}
    secrets:
      deploy_token: \${{ secrets.PROD_TOKEN }}
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(callerWorkflow, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.errors).toHaveLength(0);
			expect(result.workflows).toHaveLength(1);
			expect(result.generatedFiles).toHaveLength(1);

			const workflow = result.workflows[0];
			expect(workflow.name).toBe("Caller Workflow");
			expect(workflow.jobs).toHaveLength(2);

			// Check job that uses reusable workflow
			const stagingJob = workflow.jobs.find((job) => job.id === "deploy-staging");
			expect(stagingJob).toBeDefined();
			expect(stagingJob?.config.uses).toBe("./.github/workflows/deploy.yml");
			expect(stagingJob?.config.with).toBeDefined();
			expect((stagingJob?.config.with as any).environment).toBe("staging");
			expect((stagingJob?.config.with as any).version).toBe("\${{ github.sha }}");
			expect((stagingJob?.config.with as any).debug).toBe(false);
			expect(stagingJob?.config.secrets).toBeDefined();

			const productionJob = workflow.jobs.find((job) => job.id === "deploy-production");
			expect(productionJob).toBeDefined();
			expect(productionJob?.config.needs).toBe("deploy-staging");
			expect(productionJob?.config.uses).toBe("./.github/workflows/deploy.yml");

			// Check generated TypeScript
			const generatedFile = result.generatedFiles[0];
			expect(generatedFile.content).toContain('.job("deploy-staging"');
			expect(generatedFile.content).toContain('.uses("./.github/workflows/deploy.yml")');
			expect(generatedFile.content).toContain(".with({");
			expect(generatedFile.content).toContain('environment: "staging"');
			expect(generatedFile.content).toContain(".secrets({");
		});

		it("should handle complex workflow_call with all features", async () => {
			const complexWorkflowCall = createTestFile(
				"complex-workflow-call.yml",
				`
name: Complex Reusable Workflow

on:
  workflow_call:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: string
      version:
        description: 'Version to deploy'
        required: false
        type: string
        default: 'latest'
      dry_run:
        description: 'Perform dry run'
        required: false
        type: boolean
        default: false
      config_file:
        description: 'Configuration file path'
        required: false
        type: string
        default: 'config/default.json'
    secrets:
      deploy_key:
        description: 'SSH deploy key'
        required: true
      api_token:
        description: 'API authentication token'
        required: true
      database_url:
        description: 'Database connection string'
        required: false
    outputs:
      deployment_url:
        description: 'URL of deployed application'
        value: \${{ jobs.deploy.outputs.url }}
      deployment_status:
        description: 'Deployment status'
        value: \${{ jobs.deploy.outputs.status }}
      deployment_logs:
        description: 'Deployment logs URL'
        value: \${{ jobs.deploy.outputs.logs_url }}

jobs:
  validate:
    runs-on: ubuntu-latest
    if: \${{ !inputs.dry_run }}
    steps:
      - uses: actions/checkout@v4
      - name: Validate configuration
        run: echo "Validating \${{ inputs.config_file }}"

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    outputs:
      url: \${{ steps.deploy.outputs.url }}
      status: \${{ steps.deploy.outputs.status }}
      logs_url: \${{ steps.deploy.outputs.logs_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to \${{ inputs.environment }}
        id: deploy
        run: |
          echo "Deploying version \${{ inputs.version }} to \${{ inputs.environment }}"
          echo "url=https://\${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT
          echo "status=success" >> $GITHUB_OUTPUT
          echo "logs_url=https://logs.example.com/\${{ github.run_id }}" >> $GITHUB_OUTPUT
        env:
          DEPLOY_KEY: \${{ secrets.deploy_key }}
          API_TOKEN: \${{ secrets.api_token }}
          DATABASE_URL: \${{ secrets.database_url }}
`
			);

			const parser = new WorkflowParser();
			const result = await parser.reverseWorkflow(complexWorkflowCall, {
				preview: false,
				outputDir: "./test-output",
			});

			expect(result.errors).toHaveLength(0);
			expect(result.workflows).toHaveLength(1);
			expect(result.generatedFiles).toHaveLength(1);

			const workflow = result.workflows[0];
			const trigger = workflow.triggers[0];

			// Validate inputs
			expect(Object.keys(trigger.config?.inputs as any)).toHaveLength(4);
			expect((trigger.config?.inputs as any).environment.required).toBe(true);
			expect((trigger.config?.inputs as any).version.default).toBe("latest");
			expect((trigger.config?.inputs as any).dry_run.type).toBe("boolean");
			expect((trigger.config?.inputs as any).config_file.default).toBe("config/default.json");

			// Validate secrets
			expect(Object.keys(trigger.config?.secrets as any)).toHaveLength(3);
			expect((trigger.config?.secrets as any).deploy_key.required).toBe(true);
			expect((trigger.config?.secrets as any).api_token.required).toBe(true);
			expect((trigger.config?.secrets as any).database_url.required).toBe(false);

			// Validate outputs
			expect(Object.keys(trigger.config?.outputs as any)).toHaveLength(3);
			expect((trigger.config?.outputs as any).deployment_url.value).toBe("\${{ jobs.deploy.outputs.url }}");
			expect((trigger.config?.outputs as any).deployment_status.value).toBe("\${{ jobs.deploy.outputs.status }}");

			// Check generated TypeScript contains all features
			const generatedFile = result.generatedFiles[0];
			expect(generatedFile.content).toContain("inputs: {");
			expect(generatedFile.content).toContain("secrets: {");
			expect(generatedFile.content).toContain("outputs: {");
			expect(generatedFile.content).toContain('default: "latest"');
			expect(generatedFile.content).toContain('type: "boolean"');
			expect(generatedFile.content).toContain("required: true");
			expect(generatedFile.content).toContain("required: false");
		});
	});
});
