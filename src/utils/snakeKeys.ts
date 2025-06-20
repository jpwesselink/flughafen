import { snakeCase } from "snake-case";

export function toSnakeCase<
	T extends string | { [key: string]: unknown } | unknown[],
>(obj: T): T {
	if (typeof obj === "string") {
		return snakeCase(obj) as T;
	}
	if (Array.isArray(obj)) {
		return (obj as Array<string | { [key: string]: unknown } | unknown[]>).map(
			(item) => toSnakeCase(item),
		) as T;
	}
	if (typeof obj === "object" && obj !== null) {
		const result: { [key: string]: unknown } = {};
		for (let [k, v] of Object.entries(obj)) {
			if (typeof v === "object" && v != null) {
				v = toSnakeCase(v as T);
			}
			result[snakeCase(k)] = v;
		}
		return result as T;
	}

	throw new Error(`Invalid object: ${obj}`);
}
