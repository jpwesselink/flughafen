import type { FileContext, FileKind } from "../types";

export interface Discriminator {
	name: string;
	probe(file: FileContext): FileKind[];
}
