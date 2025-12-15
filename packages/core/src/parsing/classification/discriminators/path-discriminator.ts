import type { FileContext, FileKind } from "../types";
import type { Discriminator } from "./types";

/**
 * Path-based discriminator - highest confidence, fastest
 * Identifies files based on their directory path
 */
export class PathDiscriminator implements Discriminator {
	readonly name = "path-exact";

	probe(file: FileContext): FileKind[] {
		// GitHub workflows
		if (file.dir.endsWith("/.github/workflows") || file.dir === ".github/workflows") {
			return ["gha-workflow"];
		}

		// Issue templates
		if (file.dir.endsWith("/.github/ISSUE_TEMPLATE") || file.dir === ".github/ISSUE_TEMPLATE") {
			return ["issue-template"];
		}

		// Pull request templates
		if (file.dir.endsWith("/.github/PULL_REQUEST_TEMPLATE") || file.dir === ".github/PULL_REQUEST_TEMPLATE") {
			return ["pr-template"];
		}

		// Discussion templates
		if (file.dir.endsWith("/.github/DISCUSSION_TEMPLATE") || file.dir === ".github/DISCUSSION_TEMPLATE") {
			return ["discussion-template"];
		}

		// Local actions in .github/actions/{name}/
		if (
			(file.dir.includes("/.github/actions/") || file.dir.startsWith(".github/actions/")) &&
			(file.basename === "action.yml" || file.basename === "action.yaml")
		) {
			return ["gha-action"];
		}

		return [];
	}
}
