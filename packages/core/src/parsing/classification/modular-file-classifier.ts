import { basename, dirname, extname } from "node:path";
import { BasenameDiscriminator } from "./discriminators/basename-discriminator";
import { PathDiscriminator } from "./discriminators/path-discriminator";
import { SchemaDiscriminator } from "./discriminators/schema-discriminator";
import type { Discriminator } from "./discriminators/types";
import type { FileContext, FileKind } from "./file-classifier";

/**
 * Modular file classifier using pluggable discriminators
 * This is the new architecture that allows for easy extension and testing
 */
export class ModularFileClassifier {
	private discriminators: Discriminator[];

	constructor(discriminators?: Discriminator[]) {
		// Use default discriminators if none provided
		this.discriminators = discriminators || [
			new PathDiscriminator(), // Highest confidence, fastest
			new BasenameDiscriminator(), // Definitive matches
			new SchemaDiscriminator(), // Fallback content analysis
		];
	}

	/**
	 * Add a discriminator to the chain
	 */
	addDiscriminator(discriminator: Discriminator): void {
		this.discriminators.push(discriminator);
	}

	/**
	 * Insert a discriminator at a specific position
	 */
	insertDiscriminator(index: number, discriminator: Discriminator): void {
		this.discriminators.splice(index, 0, discriminator);
	}

	/**
	 * Remove a discriminator by name
	 */
	removeDiscriminator(name: string): boolean {
		const index = this.discriminators.findIndex((d) => d.name === name);
		if (index >= 0) {
			this.discriminators.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Get all registered discriminators
	 */
	getDiscriminators(): readonly Discriminator[] {
		return [...this.discriminators];
	}

	/**
	 * Classify a file using the discriminator chain
	 */
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

	/**
	 * Create a file context from path and content
	 */
	createFileContext(path: string, content: unknown): FileContext {
		return {
			path,
			basename: basename(path),
			ext: extname(path) as FileContext["ext"],
			dir: dirname(path),
			content,
		};
	}

	/**
	 * Classify with detailed discriminator information (useful for debugging)
	 */
	classifyWithDetails(file: FileContext): {
		kind: FileKind;
		hitDiscriminators: Array<{ name: string; candidates: FileKind[] }>;
		finalCandidates: FileKind[];
	} {
		const hitDiscriminators: Array<{ name: string; candidates: FileKind[] }> = [];
		const candidates = new Set<FileKind>();
		let hasDefinitiveMatch = false;

		for (const discriminator of this.discriminators) {
			const kinds = discriminator.probe(file);

			if (kinds.length > 0) {
				hitDiscriminators.push({
					name: discriminator.name,
					candidates: [...kinds],
				});
			}

			// Same logic as classify() but with tracking
			if (kinds.length === 1 && candidates.size === 0) {
				return {
					kind: kinds[0],
					hitDiscriminators,
					finalCandidates: kinds,
				};
			}

			if (kinds.length > 0) {
				if (candidates.size === 0) {
					kinds.forEach((k) => candidates.add(k));
					hasDefinitiveMatch = discriminator.name !== "schema-probe";
				} else {
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

			if (hasDefinitiveMatch && candidates.size === 1) {
				break;
			}
		}

		const finalCandidates = [...candidates];
		let kind: FileKind;

		if (candidates.size === 1) {
			kind = finalCandidates[0];
		} else if (candidates.size > 1) {
			kind = finalCandidates[0]; // Pick first
		} else {
			kind = "unknown";
		}

		return { kind, hitDiscriminators, finalCandidates };
	}
}
