import type { StepConfig } from "../../types/builder-types";
import type { StepBuilder } from "./StepBuilder";

/** Input value types for step `with` configuration */
type StepInputValue = string | number | boolean;

/**
 * Type-safe step builder that knows about the action being used
 */
export interface TypedStepBuilder<TInputs> {
	name(name: string): TypedStepBuilder<TInputs>;
	id(id: string): TypedStepBuilder<TInputs>;
	run(command: string): TypedStepBuilder<TInputs>;
	with(inputs: TInputs): TypedStepBuilder<TInputs>;
	env(variables: Record<string, string | number | boolean>): TypedStepBuilder<TInputs>;
	if(condition: string): TypedStepBuilder<TInputs>;
	continueOnError(value: boolean | string): TypedStepBuilder<TInputs>;
	timeoutMinutes(minutes: number | string): TypedStepBuilder<TInputs>;

	// Make it compatible with StepBuilder by including build
	build(): StepConfig;
}

/**
 * Implementation of TypedStepBuilder that wraps a regular StepBuilder
 */
export class TypedStepBuilderImpl<TInputs> implements TypedStepBuilder<TInputs> {
	/**
	 * Create a typed step builder wrapper
	 */
	constructor(private stepBuilder: StepBuilder) {}

	/**
	 * Set step name
	 */
	name(name: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.name(name);
		return this;
	}

	/**
	 * Set step id for referencing outputs
	 */
	id(id: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.id(id);
		return this;
	}

	/**
	 * Set step to run a shell command
	 */
	run(command: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.run(command);
		return this;
	}

	/**
	 * Set typed action inputs
	 */
	with(inputs: TInputs): TypedStepBuilder<TInputs> {
		this.stepBuilder._withInputs(inputs as Record<string, StepInputValue>);
		return this;
	}

	/**
	 * Set environment variables
	 */
	env(variables: Record<string, string | number | boolean>): TypedStepBuilder<TInputs> {
		this.stepBuilder.env(variables);
		return this;
	}

	/**
	 * Set conditional execution
	 */
	if(condition: string): TypedStepBuilder<TInputs> {
		this.stepBuilder.if(condition);
		return this;
	}

	/**
	 * Prevent job from failing when this step fails
	 */
	continueOnError(value: boolean | string): TypedStepBuilder<TInputs> {
		this.stepBuilder.continueOnError(value);
		return this;
	}

	/**
	 * Set maximum number of minutes to run the step
	 */
	timeoutMinutes(minutes: number | string): TypedStepBuilder<TInputs> {
		this.stepBuilder.timeoutMinutes(minutes);
		return this;
	}

	/**
	 * Build the step configuration
	 */
	build(): StepConfig {
		return this.stepBuilder.build();
	}
}
