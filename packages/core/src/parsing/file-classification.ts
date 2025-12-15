import { basename, dirname, extname } from "node:path";
import type { JSONSchema7 } from "json-schema";

export type FileKind =
	| "gha-workflow"
	| "gha-action"
	| "dependabot"
	| "funding"
	| "codeowners"
	| "issue-template"
	| "pr-template"
	| "discussion-template"
	| "contributing"
	| "code-of-conduct"
	| "security"
	| "support"
	| "citation"
	| "unknown";

export interface FileContext {
	path: string; // relative: .github/workflows/ci.yml
	basename: string; // ci.yml
	ext: ".yml" | ".yaml" | ".json" | ".md";
	dir: string; // .github/workflows
	content: unknown; // parsed yaml/json
}

export interface Discriminator {
	name: string;
	probe(file: FileContext): FileKind[];
}

export interface KindHandler {
	schema?: JSONSchema7;
	emit(ast: unknown, context: FileContext): string;
}

export class FileClassifier {
	private discriminators: Discriminator[] = [
		// Path-based (highest confidence, fastest)
		{
			name: "path-exact",
			probe: (f) => {
				if (f.dir === ".github/workflows") return ["gha-workflow"];
				if (f.dir === ".github/ISSUE_TEMPLATE") return ["issue-template"];
				if (f.dir === ".github/PULL_REQUEST_TEMPLATE") return ["pr-template"];
				if (f.dir === ".github/DISCUSSION_TEMPLATE") return ["discussion-template"];
				if (f.dir.startsWith(".github/actions/") && (f.basename === "action.yml" || f.basename === "action.yaml")) {
					return ["gha-action"];
				}
				return [];
			},
		},

		// Basename exact match (definitive)
		{
			name: "basename-exact",
			probe: (f) => {
				const exactMap: Record<string, FileKind> = {
					"FUNDING.yml": "funding",
					"FUNDING.yaml": "funding",
					"dependabot.yml": "dependabot",
					"dependabot.yaml": "dependabot",
					CODEOWNERS: "codeowners",
					"action.yml": "gha-action",
					"action.yaml": "gha-action",
					"CONTRIBUTING.md": "contributing",
					"CODE_OF_CONDUCT.md": "code-of-conduct",
					"SECURITY.md": "security",
					"SUPPORT.md": "support",
					"CITATION.cff": "citation",
				};
				return exactMap[f.basename] ? [exactMap[f.basename]] : [];
			},
		},

		// Basename pattern match
		{
			name: "basename-pattern",
			probe: (_f) => {
				// No pattern matching for now - only exact matches for GitHub files
				return [];
			},
		},

		// Schema-based fallback (slowest, most flexible)
		{
			name: "schema-probe",
			probe: (f) => {
				if (typeof f.content !== "object" || !f.content) return [];

				const content = f.content as Record<string, unknown>;
				const candidates: FileKind[] = [];

				// GitHub workflow signatures
				if (content.on && content.jobs) {
					candidates.push("gha-workflow");
				}

				// GitHub action signatures
				if (content.name && content.runs && typeof content.runs === "object") {
					const runs = content.runs as Record<string, unknown>;
					if (runs.using) candidates.push("gha-action");
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
			},
		},
	];

	classify(file: FileContext): FileKind {
		const candidates = new Set<FileKind>();
		let hasDefinitiveMatch = false;

		for (const discriminator of this.discriminators) {
			const kinds = discriminator.probe(file);

			// First discriminator to return exactly one kind wins (if no candidates yet)
			if (kinds.length === 1 && candidates.size === 0) {
				return kinds[0];
			}

			// Accumulate candidates
			if (kinds.length > 0) {
				if (candidates.size === 0) {
					// First discriminator with results
					kinds.forEach((k) => candidates.add(k));
					hasDefinitiveMatch = discriminator.name !== "schema-probe";
				} else {
					// Intersect - narrow down existing candidates
					const intersection = new Set<FileKind>();
					for (const candidate of candidates) {
						if (kinds.includes(candidate)) {
							intersection.add(candidate);
						}
					}

					if (intersection.size > 0) {
						candidates.clear();
						intersection.forEach((k) => candidates.add(k));
					}
				}
			}

			// Stop early if we have a definitive single match from non-schema discriminators
			if (hasDefinitiveMatch && candidates.size === 1) {
				break;
			}
		}

		if (candidates.size === 1) {
			return [...candidates][0];
		}

		if (candidates.size > 1) {
			// Ambiguous - log and pick first
			console.warn(`Ambiguous classification for ${file.path}: ${[...candidates].join(", ")}`);
			return [...candidates][0];
		}

		return "unknown";
	}

	createFileContext(path: string, content: unknown): FileContext {
		return {
			path,
			basename: basename(path),
			ext: extname(path) as FileContext["ext"],
			dir: dirname(path),
			content,
		};
	}
}
