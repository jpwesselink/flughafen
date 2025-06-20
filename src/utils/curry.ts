import type { Curry } from "../types";

type AnyFunc = (...args: any[]) => any;

export function curry<T extends AnyFunc, TAgg extends unknown[]>(
	func: T,
	agg?: TAgg,
): Curry<T> {
	const aggregatedArgs = agg ?? [];
	if (func.length === aggregatedArgs.length) return func(...aggregatedArgs);
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	return ((arg: any) => curry(func, [...aggregatedArgs, arg])) as any;
}
