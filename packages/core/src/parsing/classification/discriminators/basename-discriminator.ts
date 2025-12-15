import type { FileContext, FileKind } from "../types";
import type { Discriminator } from "./types";

/**
 * Basename-based discriminator - definitive matches for known filenames
 * Identifies files based on their exact basename
 */
export class BasenameDiscriminator implements Discriminator {
	readonly name = "basename-exact";

	private readonly exactMap: Record<string, FileKind> = {
		// GitHub Sponsors
		"FUNDING.yml": "github-funding",
		"FUNDING.yaml": "github-funding",

		// Dependabot configuration
		"dependabot.yml": "dependabot-config",
		"dependabot.yaml": "dependabot-config",

		// Code ownership
		CODEOWNERS: "codeowners",

		// Actions
		"action.yml": "gha-action",
		"action.yaml": "gha-action",

		// Community health files
		"CONTRIBUTING.md": "contributing",
		"CODE_OF_CONDUCT.md": "code-of-conduct",
		"SECURITY.md": "security",
		"SUPPORT.md": "support",

		// Citation information
		"CITATION.cff": "citation",
	};

	probe(file: FileContext): FileKind[] {
		const kind = this.exactMap[file.basename];
		return kind ? [kind] : [];
	}
}
