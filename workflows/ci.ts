import { createWorkflow, expr } from "@flughafen/core";

/**
 * CI workflow for the Flughafen monorepo
 * Runs tests, linting, builds, and publishes on push/PR
 */
const ciWorkflow = createWorkflow()
	.name("CI")
	.filename("ci.yml")

	// Trigger on push to main and PRs
	.on("push", {
		branches: ["main"],
	})
	.on("pull_request", {
		branches: ["main"],
	})

	.permissions({
		contents: "write",
		issues: "write",
		"pull-requests": "write",
		"id-token": "write",
	})

	.env({
		NODE_ENV: "test",
		CI: "true",
	})

	// Test job
	.job("test", (job) =>
		job
			.name("Test")
			.runsOn("ubuntu-latest")

			.step((step) => step.name("Checkout repository").uses("actions/checkout@v4"))

			.step((step) => step.name("Install pnpm").uses("pnpm/action-setup@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (uses) =>
					uses.with({
						"node-version": "22",
						cache: "pnpm",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) =>
				step.name("Run tests with coverage").run("pnpm test:coverage").comment("Builds via turbo dependencies")
			)

			.step((step) =>
				step
					.name("Run roundtrip tests")
					.run("pnpm test:roundtrip")
					.env({ GITHUB_TOKEN: expr("secrets.GITHUB_TOKEN") })
			)

			.step((step) =>
				step
					.name("Run dogfood tests")
					.run("pnpm test:dogfood")
					.env({ GITHUB_TOKEN: expr("secrets.GITHUB_TOKEN") })
			)

			.step((step) => step.name("Upload coverage to Codecov").uses("codecov/codecov-action@v4"))
	)

	// Release job - publishes to npm on push to main using semantic-release
	.job("release", (job) =>
		job
			.name("Release")
			.runsOn("ubuntu-latest")
			.needs(["test"])
			.if("github.event_name == 'push' && github.ref == 'refs/heads/main'")

			.step((step) => step.name("Checkout").uses("actions/checkout@v4", (u) => u.with({ "fetch-depth": 0 })))

			.step((step) => step.name("Install pnpm").uses("pnpm/action-setup@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (u) =>
					u.with({
						"node-version": "22",
						cache: "pnpm",
						"registry-url": "https://registry.npmjs.org",
					})
				)
			)

			.step((step) => step.name("Upgrade npm for OIDC").run("npm install -g npm@latest"))

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Build packages").run("pnpm build"))

			.step((step) =>
				step
					.name("Release")
					.run("npx semantic-release")
					.env({
						GITHUB_TOKEN: expr("secrets.GITHUB_TOKEN"),
					})
			)
	)

	// Beta release job - publishes preview versions on PRs
	.job("beta", (job) =>
		job
			.name("Beta Release")
			.runsOn("ubuntu-latest")
			.needs(["test"])
			.if("github.event_name == 'pull_request'")

			.step((step) => step.name("Checkout").uses("actions/checkout@v4"))

			.step((step) => step.name("Install pnpm").uses("pnpm/action-setup@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (u) =>
					u.with({
						"node-version": "22",
						cache: "pnpm",
						"registry-url": "https://registry.npmjs.org",
					})
				)
			)

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Build packages").run("pnpm build"))

			.step((step) =>
				step
					.name("Publish beta versions")
					.env({
						NODE_AUTH_TOKEN: expr("secrets.NPM_TOKEN"),
					})
					.run(
						`
SHORT_SHA=$(echo "$GITHUB_SHA" | cut -c1-7)
BRANCH_NAME="${expr("github.head_ref")}"
BRANCH_KEBAB=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

cd packages/core
BASE_VERSION=$(node -p "require('./package.json').version")
PR_VERSION="$BASE_VERSION-pr.$BRANCH_KEBAB.$SHORT_SHA"
npm version $PR_VERSION --no-git-tag-version
npm publish --tag pr --access public --provenance

cd ../cli
BASE_VERSION=$(node -p "require('./package.json').version")
PR_VERSION="$BASE_VERSION-pr.$BRANCH_KEBAB.$SHORT_SHA"
npm version $PR_VERSION --no-git-tag-version
npm publish --tag pr --access public --provenance
`.trim()
					)
			)

			.step((step) =>
				step
					.id("pkgversion")
					.name("Get package version")
					.run('echo "value=$(node -p "require(\'./packages/core/package.json\').version")" >> $GITHUB_OUTPUT')
			)

			.step((step) =>
				step.name("Comment on PR").uses("actions/github-script@v7", (u) =>
					u.with({
						script: `
const sha = context.sha.substring(0, 7);
const branch = context.payload.pull_request.head.ref
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');
const baseVersion = process.env.PR_VERSION;
const version = baseVersion + '-pr.' + branch + '.' + sha;

github.rest.issues.createComment({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: context.issue.number,
  body: '## 📦 PR Build Published\\n\\nInstall with:\\n\`\`\`bash\\nnpm install @flughafen/core@' + version + '\\nnpm install flughafen@' + version + '\\n\`\`\`'
});
`.trim(),
						PR_VERSION: expr("steps.pkgversion.outputs.value"),
					})
				)
			)
	);

// Export the workflow for synthesis
export default ciWorkflow;
