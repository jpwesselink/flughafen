import type { FileContext, FileKind } from "../types";
import type { Discriminator } from "./types";

/**
 * Schema-based discriminator - content analysis fallback
 * Identifies files based on their structure and content
 */
export class SchemaDiscriminator implements Discriminator {
	readonly name = "schema-probe";

	probe(file: FileContext): FileKind[] {
		if (typeof file.content !== "object" || !file.content) {
			return [];
		}

		const content = file.content as Record<string, unknown>;
		const candidates: FileKind[] = [];

		// GitHub workflow signatures
		if (content.on && content.jobs) {
			candidates.push("gha-workflow");
		}

		// GitHub action signatures
		if (content.name && content.runs && typeof content.runs === "object") {
			const runs = content.runs as Record<string, unknown>;
			if (runs.using) {
				candidates.push("gha-action");
			}
		}

		// Dependabot signatures
		if (content.version === 2 && content.updates) {
			candidates.push("dependabot");
		}

		// Funding signatures
		if (content.github || content.patreon || content.ko_fi || content.tidelift) {
			candidates.push("funding");
		}

		return candidates;
	}
}
