import { paramCase } from "change-case";

export function toKebabCase<
	T extends string | { [key: string]: unknown } | unknown[],
>(obj: T): T {
	if (typeof obj === "string") {
		return paramCase(obj) as T;
	}
	if (Array.isArray(obj)) {
		return obj.map(toKebabCase) as T;
	}
	if (typeof obj === "object" && obj !== null) {
		const result: { [key: string]: unknown } = {};
		for (let [k, v] of Object.entries(obj)) {
			if (typeof v === "object" || (Array.isArray(v) && v != null)) {
				v = toKebabCase(v as T);
			}
			result[paramCase(k)] = v;
		}
		return result as T;
	}

	throw new Error(`Invalid object: ${obj}`);
}
