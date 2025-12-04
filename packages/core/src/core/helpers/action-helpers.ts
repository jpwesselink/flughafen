import { LocalActionBuilder } from "../builders/LocalActionBuilder";
import type { ActionStep } from "../types/action-types";

/**
 * Helper to create an action step that uses another action
 * For use with LocalActionBuilder.step()
 *
 * @example
 * import { uses, run } from "@flughafen/core"
 *
 * createLocalAction()
 *   .step(uses("actions/checkout@v4"))
 *   .step(uses("docker/build-push-action@v5", { context: ".", push: true }))
 *   .step(run("echo hello"))
 */
export function uses(action: string, inputs?: Record<string, any>): ActionStep {
	return {
		uses: action,
		with: inputs,
	};
}

/**
 * Helper to create a run step
 * For use with LocalActionBuilder.step()
 *
 * @example
 * import { uses, run } from "@flughafen/core"
 *
 * createLocalAction()
 *   .step(run("echo hello"))
 *   .step(run("npm install", { name: "Install deps", env: { CI: "true" } }))
 */
export function run(
	command: string,
	options?: { name?: string; id?: string; env?: Record<string, string>; if?: string; workingDirectory?: string }
): ActionStep {
	return {
		run: command,
		shell: "bash",
		...options,
	};
}

// Aliases for backwards compatibility / explicit naming
export { uses as actionUses, run as actionRun };

/**
 * Factory function to create a new local action with optional type constraints for inputs and outputs
 * @example
 * // OLD APPROACH: Define input and output types for type safety
 * interface MyInputs {
 *   name: string;
 *   version: string;
 * }
 *
 * interface MyOutputs {
 *   result: string;
 *   status: string;
 * }
 *
 * const action = createLocalAction<MyInputs, MyOutputs>()
 *   .name('my-action')
 *   .input('name', { description: 'Name input', required: true })
 *   .input('version', { description: 'Version input', required: true })
 *   .output('result', { description: 'Result output' })
 *   .output('status', { description: 'Status output' });
 *
 * @example
 * // NEW APPROACH: Type inference from inputs/outputs configuration
 * const action = createLocalAction()
 *   .name('my-action')
 *   .inputs({
 *     name: { description: 'Name input', required: true },
 *     version: { description: 'Version input', required: true }
 *   })
 *   .outputs({
 *     result: { description: 'Result output' },
 *     status: { description: 'Status output' }
 *   });
 */
export function createLocalAction<TInputs = any, TOutputs = any>(): LocalActionBuilder<TInputs, TOutputs> {
	return new LocalActionBuilder<TInputs, TOutputs>();
}
