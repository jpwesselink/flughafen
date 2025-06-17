import { paramCase } from "change-case";

export function toKebabCase(obj: string): string;
export function toKebabCase(obj: unknown[]): unknown[];
export function toKebabCase(obj: { [key: string]: unknown }): { [key: string]: unknown };
export function toKebabCase(
	obj: string | { [key: string]: unknown } | unknown[],
): string | { [key: string]: unknown } | unknown[] {
	if (typeof obj === "string") {
		return paramCase(obj);
	}
	if (Array.isArray(obj)) {
		return obj.map((item: any) => toKebabCase(item));
	}
	if (typeof obj === "object" && obj !== null) {
		const result: { [key: string]: unknown } = {};
		for (let [k, v] of Object.entries(obj)) {
			if (typeof v === "object" && v !== null) {
				v = toKebabCase(v as any);
			}
			result[paramCase(k)] = v;
		}
		return result;
	}

	throw new Error(`Invalid object: ${obj}`);
}
