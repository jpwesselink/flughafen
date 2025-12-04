import { createWorkflow, expr } from "@flughafen/core";

/**
 * Publish workflow for Flughafen packages
 * - On push to main: runs semantic-release (publishes if commits warrant a release)
 * - On PR: publishes beta versions for testing
 */
const publishWorkflow = createWorkflow()
	.name("Publish")
	.filename("publish.yml")

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
		CI: "true",
	})

	// Release job - runs on push to main
	.job("release", (job) =>
		job
			.name("Release")
			.runsOn("ubuntu-latest")
			.if("github.event_name == 'push'")

			.step((step) => step.name("Checkout").uses("actions/checkout@v4", (u) => u.with({ "fetch-depth": 0 })))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (u) =>
					u.with({
						"node-version": "20",
						cache: "pnpm",
						"registry-url": "https://registry.npmjs.org",
					})
				)
			)

			.step((step) => step.name("Install pnpm").uses("pnpm/action-setup@v4", (u) => u.with({ version: "latest" })))

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Build packages").run("pnpm build"))

			.step((step) => step.name("Run tests").run("pnpm test"))

			.step((step) =>
				step
					.name("Release")
					.run("npx semantic-release")
					.env({
						GITHUB_TOKEN: expr("secrets.GITHUB_TOKEN"),
						NPM_TOKEN: expr("secrets.NPM_TOKEN"),
					})
			)
	)

	// Beta release job - runs on PRs
	.job("beta", (job) =>
		job
			.name("Beta Release")
			.runsOn("ubuntu-latest")
			.if("github.event_name == 'pull_request'")

			.step((step) => step.name("Checkout").uses("actions/checkout@v4"))

			.step((step) =>
				step.name("Setup Node.js").uses("actions/setup-node@v4", (u) =>
					u.with({
						"node-version": "20",
						cache: "pnpm",
						"registry-url": "https://registry.npmjs.org",
					})
				)
			)

			.step((step) => step.name("Install pnpm").uses("pnpm/action-setup@v4", (u) => u.with({ version: "latest" })))

			.step((step) => step.name("Install dependencies").run("pnpm install --frozen-lockfile"))

			.step((step) => step.name("Build packages").run("pnpm build"))

			.step((step) => step.name("Run tests").run("pnpm test"))

			.step((step) =>
				step.name("Publish beta versions").run(
					`
SHORT_SHA=$(echo "$GITHUB_SHA" | cut -c1-7)
BRANCH_NAME="\${{ github.head_ref }}"
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
					.id("get-version")
					.name("Get package version")
					.run('echo "version=$(node -p "require(\'./packages/core/package.json\').version")" >> $GITHUB_OUTPUT')
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
const baseVersion = '\${{ steps.get-version.outputs.version }}';
const version = \\\`\\\${baseVersion}-pr.\\\${branch}.\\\${sha}\\\`;

github.rest.issues.createComment({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: context.issue.number,
  body: \\\`## 📦 PR Build Published

Install with:
\\\\\\\`\\\\\\\`\\\\\\\`bash
npm install flughafen@\\\${version}
npm install @flughafen/core@\\\${version}
\\\\\\\`\\\\\\\`\\\\\\\`
\\\`
});
`,
					})
				)
			)
	);

export default publishWorkflow;
