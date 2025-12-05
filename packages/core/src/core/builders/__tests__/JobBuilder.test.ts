import { describe, expect, it } from "vitest";
import type { NormalJob, ReusableWorkflowCallJob } from "../../../../generated/types/github-workflow";
import type { ActionBuilder } from "../ActionBuilder";
import { createJob, JobBuilder } from "../JobBuilder";
import { LocalActionBuilder } from "../LocalActionBuilder";
import type { TypedActionConfigBuilder } from "../TypedActionConfigBuilder";

describe("JobBuilder", () => {
	it("should create a basic job configuration", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest");

		const config = job.build() as NormalJob;
		expect(config["runs-on"]).toBe("ubuntu-latest");
		expect(config.steps).toEqual([]);
	});

	it("should add environment variables", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").env({ NODE_ENV: "test", CI: true });

		const config = job.build() as NormalJob;
		expect(config.env).toEqual({ NODE_ENV: "test", CI: true });
	});

	it("should set job permissions", () => {
		const permissions = {
			contents: "read" as const,
			packages: "write" as const,
		};
		const job = new JobBuilder().runsOn("ubuntu-latest").permissions(permissions);

		const config = job.build();
		expect(config.permissions).toEqual(permissions);
	});

	it("should set timeout minutes", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").timeoutMinutes(30);

		const config = job.build() as NormalJob;
		expect(config["timeout-minutes"]).toBe(30);
	});

	it("should set job needs", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").needs("build");

		const config = job.build();
		expect(config.needs).toBe("build");
	});

	it("should set job condition", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").if('github.ref == "refs/heads/main"');

		const config = job.build();
		expect(config.if).toBe('github.ref == "refs/heads/main"');
	});

	it("should add steps using callback", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").step((step) => step.name("Test").run("npm test"));

		const config = job.build() as NormalJob;
		expect(config.steps).toHaveLength(1);
		expect(config.steps?.[0]).toEqual({
			name: "Test",
			run: "npm test",
		});
	});

	it("should chain multiple methods", () => {
		const job = new JobBuilder()
			.runsOn("ubuntu-latest")
			.env({ NODE_ENV: "test" })
			.timeoutMinutes(15)
			.step((step) => step.name("Checkout").run("git checkout"))
			.step((step) => step.name("Test").run("npm test"));

		const config = job.build() as NormalJob;
		expect(config["runs-on"]).toBe("ubuntu-latest");
		expect(config.env).toEqual({ NODE_ENV: "test" });
		expect(config["timeout-minutes"]).toBe(15);
		expect(config.steps).toHaveLength(2);
	});
});

describe("createJob factory", () => {
	it("should create a new JobBuilder instance", () => {
		const job = createJob();
		expect(job).toBeInstanceOf(JobBuilder);
	});

	it("should create independent instances", () => {
		const job1 = createJob().runsOn("ubuntu-latest");
		const job2 = createJob().runsOn("windows-latest");

		const config1 = job1.build() as NormalJob;
		const config2 = job2.build() as NormalJob;

		expect(config1["runs-on"]).toBe("ubuntu-latest");
		expect(config2["runs-on"]).toBe("windows-latest");
	});

	it("should collect LocalActionBuilder instances from steps", () => {
		const action1 = new LocalActionBuilder()
			.name("test-action-1")
			.description("First test action")
			.run('echo "Action 1"');

		const action2 = new LocalActionBuilder()
			.name("test-action-2")
			.description("Second test action")
			.run('echo "Action 2"');

		const job = new JobBuilder()
			.runsOn("ubuntu-latest")
			.step((step) => step.name("Step 1").uses(action1, (uses: TypedActionConfigBuilder<unknown>) => uses))
			.step(
				(step) => step.name("Step 2").uses("actions/checkout@v4", (action: ActionBuilder) => action) // String action - should not be collected
			)
			.step((step) => step.name("Step 3").uses(action2, (uses: TypedActionConfigBuilder<unknown>) => uses))
			.step(
				(step) => step.name("Step 4").uses(action1, (uses: TypedActionConfigBuilder<unknown>) => uses) // Reuse action1 - should be deduplicated
			);

		const localActions = job.getLocalActions();

		expect(localActions).toHaveLength(2); // Should be deduplicated
		expect(localActions).toContain(action1);
		expect(localActions).toContain(action2);
	});

	it("should return empty array when no local actions are used", () => {
		const job = new JobBuilder()
			.runsOn("ubuntu-latest")
			.step((step) => step.name("Checkout").uses("actions/checkout@v4", (action: ActionBuilder) => action))
			.step((step) => step.name("Setup Node").uses("actions/setup-node@v4", (action: ActionBuilder) => action));

		const localActions = job.getLocalActions();
		expect(localActions).toHaveLength(0);
	});
});

describe("JobBuilder - Reusable Workflows", () => {
	it("should configure reusable workflow call with uses()", () => {
		const job = new JobBuilder().uses("./.github/workflows/deploy.yml");

		const config = job.build() as ReusableWorkflowCallJob;
		expect(config.uses).toBe("./.github/workflows/deploy.yml");
		expect((config as unknown as NormalJob).steps).toBeUndefined();
	});

	it("should set inputs for reusable workflow with with()", () => {
		const job = new JobBuilder().uses("./.github/workflows/deploy.yml").with({
			environment: "staging",
			version: "1.0.0",
			debug: true,
		});

		const config = job.build() as ReusableWorkflowCallJob;
		expect(config.with).toEqual({
			environment: "staging",
			version: "1.0.0",
			debug: true,
		});
	});

	it("should throw error when using with() without uses()", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest");

		expect(() => {
			job.with({ environment: "staging" });
		}).toThrow(".with() can only be used on reusable workflow jobs. Call .uses() first.");
	});

	it("should set secrets for reusable workflow", () => {
		const job = new JobBuilder().uses("./.github/workflows/deploy.yml").secrets({
			DEPLOY_TOKEN: "${{ secrets.TOKEN }}",
			API_KEY: "${{ secrets.KEY }}",
		});

		const config = job.build() as ReusableWorkflowCallJob;
		expect(config.secrets).toEqual({
			DEPLOY_TOKEN: "${{ secrets.TOKEN }}",
			API_KEY: "${{ secrets.KEY }}",
		});
	});

	it("should set secrets as 'inherit'", () => {
		const job = new JobBuilder().uses("./.github/workflows/deploy.yml").secrets("inherit");

		const config = job.build() as ReusableWorkflowCallJob;
		expect(config.secrets).toBe("inherit");
	});

	it("should throw error when using secrets() without uses()", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest");

		expect(() => {
			job.secrets({ TOKEN: "${{ secrets.TOKEN }}" });
		}).toThrow(".secrets() can only be used on reusable workflow jobs. Call .uses() first.");
	});
});

describe("JobBuilder - Additional Features", () => {
	it("should set job outputs", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").outputs({
			artifact_url: "${{ steps.upload.outputs.url }}",
			version: "${{ steps.version.outputs.version }}",
		});

		const config = job.build() as NormalJob;
		expect(config.outputs).toEqual({
			artifact_url: "${{ steps.upload.outputs.url }}",
			version: "${{ steps.version.outputs.version }}",
		});
	});

	it("should set job environment", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").environment({
			name: "production",
			url: "https://example.com",
		});

		const config = job.build() as NormalJob;
		expect(config.environment).toEqual({
			name: "production",
			url: "https://example.com",
		});
	});

	it("should set job comment", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").comment("This is a deployment job");

		expect(job.getComment()).toBe("This is a deployment job");
	});

	it("should get step comments", () => {
		const job = new JobBuilder()
			.runsOn("ubuntu-latest")
			.step((step) => step.name("Step 1").run("echo 1").comment("First step"))
			.step((step) => step.name("Step 2").run("echo 2"))
			.step((step) => step.name("Step 3").run("echo 3").comment("Third step"));

		const stepComments = job.getStepComments();
		expect(stepComments.size).toBe(2);
		expect(stepComments.get(0)).toBe("First step");
		expect(stepComments.get(2)).toBe("Third step");
	});

	it("should throw error when needs array is empty", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest");

		expect(() => {
			job.needs([]);
		}).toThrow("Job needs array must contain at least one job name");
	});

	it("should accept needs as string array", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").needs(["build", "test"]);

		const config = job.build();
		expect(config.needs).toEqual(["build", "test"]);
	});

	it("should support string shorthand for steps with inputs", () => {
		const job = new JobBuilder()
			.runsOn("ubuntu-latest")
			.step("actions/checkout@v4", { "fetch-depth": 2 })
			.step("actions/setup-node@v4", { "node-version": "20", cache: "npm" });

		const config = job.build() as NormalJob;
		expect(config.steps).toHaveLength(2);
		const step0 = config.steps?.[0] as Record<string, any>;
		const step1 = config.steps?.[1] as Record<string, any>;
		expect(step0?.uses).toBe("actions/checkout@v4");
		expect(step0?.with?.["fetch-depth"]).toBe(2);
		expect(step1?.uses).toBe("actions/setup-node@v4");
		expect(step1?.with?.["node-version"]).toBe("20");
		expect(step1?.with?.cache).toBe("npm");
	});

	it("should set job strategy with matrix", () => {
		const job = new JobBuilder().runsOn("ubuntu-latest").strategy({
			matrix: {
				"node-version": ["18", "20", "22"],
				os: ["ubuntu-latest", "windows-latest"],
			},
			"fail-fast": false,
			"max-parallel": 3,
		});

		const config = job.build();
		expect(config.strategy).toBeDefined();
		expect(config.strategy?.matrix).toEqual({
			"node-version": ["18", "20", "22"],
			os: ["ubuntu-latest", "windows-latest"],
		});
		expect(config.strategy?.["fail-fast"]).toBe(false);
		expect(config.strategy?.["max-parallel"]).toBe(3);
	});
});

describe("JobBuilder - Container, Services, Defaults, Concurrency", () => {
	describe("container()", () => {
		it("should set container as string", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").container("node:20");

			const config = job.build() as NormalJob;
			expect(config.container).toBe("node:20");
		});

		it("should set container with full configuration", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").container({
				image: "node:20",
				credentials: {
					username: "myuser",
					password: "${{ secrets.REGISTRY_PASSWORD }}",
				},
				env: {
					NODE_ENV: "test",
				},
				ports: ["3000:3000", "5432:5432"],
				volumes: ["/var/run/docker.sock:/var/run/docker.sock"],
				options: "--cpus 2",
			});

			const config = job.build() as NormalJob;
			expect(config.container).toEqual({
				image: "node:20",
				credentials: {
					username: "myuser",
					password: "${{ secrets.REGISTRY_PASSWORD }}",
				},
				env: {
					NODE_ENV: "test",
				},
				ports: ["3000:3000", "5432:5432"],
				volumes: ["/var/run/docker.sock:/var/run/docker.sock"],
				options: "--cpus 2",
			});
		});
	});

	describe("services()", () => {
		it("should set service containers", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").services({
				postgres: {
					image: "postgres:15",
					ports: ["5432:5432"],
					env: {
						POSTGRES_USER: "test",
						POSTGRES_PASSWORD: "test",
						POSTGRES_DB: "testdb",
					},
				},
				redis: {
					image: "redis:7",
					ports: ["6379:6379"],
				},
			});

			const config = job.build() as NormalJob;
			expect(config.services).toEqual({
				postgres: {
					image: "postgres:15",
					ports: ["5432:5432"],
					env: {
						POSTGRES_USER: "test",
						POSTGRES_PASSWORD: "test",
						POSTGRES_DB: "testdb",
					},
				},
				redis: {
					image: "redis:7",
					ports: ["6379:6379"],
				},
			});
		});

		it("should set single service", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").services({
				mongodb: {
					image: "mongo:7",
					ports: ["27017:27017"],
				},
			});

			const config = job.build() as NormalJob;
			expect(config.services?.mongodb).toEqual({
				image: "mongo:7",
				ports: ["27017:27017"],
			});
		});
	});

	describe("defaults()", () => {
		it("should set defaults with shell", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").defaults({
				run: {
					shell: "bash",
				},
			});

			const config = job.build() as NormalJob;
			expect(config.defaults).toEqual({
				run: {
					shell: "bash",
				},
			});
		});

		it("should set defaults with working-directory", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").defaults({
				run: {
					"working-directory": "src",
				},
			});

			const config = job.build() as NormalJob;
			expect(config.defaults).toEqual({
				run: {
					"working-directory": "src",
				},
			});
		});

		it("should set defaults with both shell and working-directory", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").defaults({
				run: {
					shell: "pwsh",
					"working-directory": "scripts",
				},
			});

			const config = job.build() as NormalJob;
			expect(config.defaults).toEqual({
				run: {
					shell: "pwsh",
					"working-directory": "scripts",
				},
			});
		});
	});

	describe("concurrency()", () => {
		it("should set concurrency as string", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").concurrency("deploy-group");

			const config = job.build() as NormalJob;
			expect(config.concurrency).toBe("deploy-group");
		});

		it("should set concurrency with object configuration", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").concurrency({
				group: "deploy-${{ github.ref }}",
				"cancel-in-progress": true,
			});

			const config = job.build() as NormalJob;
			expect(config.concurrency).toEqual({
				group: "deploy-${{ github.ref }}",
				"cancel-in-progress": true,
			});
		});

		it("should set concurrency without cancel-in-progress", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").concurrency({
				group: "build-queue",
			});

			const config = job.build() as NormalJob;
			expect(config.concurrency).toEqual({
				group: "build-queue",
			});
		});
	});

	describe("continueOnError()", () => {
		it("should set continue-on-error to true", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").continueOnError(true);

			const config = job.build() as NormalJob;
			expect(config["continue-on-error"]).toBe(true);
		});

		it("should set continue-on-error to false", () => {
			const job = new JobBuilder().runsOn("ubuntu-latest").continueOnError(false);

			const config = job.build() as NormalJob;
			expect(config["continue-on-error"]).toBe(false);
		});

		it("should set continue-on-error as expression", () => {
			const job = new JobBuilder()
				.runsOn("ubuntu-latest")
				.continueOnError("${{ github.event_name == 'workflow_dispatch' }}");

			const config = job.build() as NormalJob;
			expect(config["continue-on-error"]).toBe("${{ github.event_name == 'workflow_dispatch' }}");
		});
	});

	describe("combined usage", () => {
		it("should combine container, services, defaults, and concurrency", () => {
			const job = new JobBuilder()
				.runsOn("ubuntu-latest")
				.container("node:20")
				.services({
					postgres: {
						image: "postgres:15",
						ports: ["5432:5432"],
						env: { POSTGRES_PASSWORD: "test" },
					},
				})
				.defaults({
					run: {
						shell: "bash",
						"working-directory": "app",
					},
				})
				.concurrency({
					group: "test-${{ github.ref }}",
					"cancel-in-progress": true,
				})
				.continueOnError(true)
				.step((step) => step.name("Run tests").run("npm test"));

			const config = job.build() as NormalJob;
			expect(config.container).toBe("node:20");
			expect(config.services?.postgres?.image).toBe("postgres:15");
			expect(config.defaults?.run?.shell).toBe("bash");
			expect(config.concurrency).toEqual({
				group: "test-${{ github.ref }}",
				"cancel-in-progress": true,
			});
			expect(config["continue-on-error"]).toBe(true);
			expect(config.steps).toHaveLength(1);
		});
	});
});
