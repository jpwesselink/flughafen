import type { ValidationContext, WorkflowValidationResult, ValidatorFunction } from "../types";

/**
 * Best practices validator
 * Validates workflow best practices and coding standards
 */
export class BestPracticesValidator {
	/**
	 * Validate best practices
	 */
	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		try {
			const { content, filePath, options } = context;

			// Check for step names
			const stepMatches = content.match(/\.step\(/g);
			const namedStepMatches = content.match(/\.step\([^)]*\.name\(/g);

			if (stepMatches && stepMatches.length > 0) {
				if (!namedStepMatches || namedStepMatches.length < stepMatches.length) {
					if (options.strict) {
						result.errors.push({
							path: filePath,
							message: "All steps should have descriptive names",
							severity: "error",
							rule: "step-names",
						});
					} else {
						result.warnings.push({
							path: filePath,
							message: "All steps should have descriptive names",
							severity: "warning",
							rule: "step-names",
						});
					}
				}
			}

			// Check for action versions
			const actionMatches = content.match(/\.uses\(['"]([^'"]+)['"],?\s*action/g);
			if (actionMatches) {
				for (const match of actionMatches) {
					if (!match.includes("@v") && !match.includes("@main")) {
						result.warnings.push({
							path: filePath,
							message: "Actions should specify version tags",
							severity: "warning",
							rule: "action-versions",
						});
						break;
					}
				}
			}

			// Check for job names
			const jobMatches = content.match(/\.job\(['"]([^'"]+)['"]/g);
			if (jobMatches) {
				for (const match of jobMatches) {
					const jobName = match.match(/\.job\(['"]([^'"]+)['"]/)?.[1];
					if (jobName && !this.isDescriptiveJobName(jobName)) {
						result.warnings.push({
							path: filePath,
							message: `Job '${jobName}' should have a more descriptive name`,
							severity: "warning",
							rule: "descriptive-job-names",
						});
					}
				}
			}

			// Check for missing timeout specifications on jobs
			const jobsWithTimeout = content.match(/\.timeout\(/g)?.length || 0;
			const totalJobs = jobMatches?.length || 0;
			if (totalJobs > 0 && jobsWithTimeout === 0 && options.strict) {
				result.warnings.push({
					path: filePath,
					message: "Consider adding timeout specifications to jobs to prevent runaway workflows",
					severity: "warning",
					rule: "job-timeouts",
				});
			}

			// Check for environment variables in uppercase
			const envMatches = content.match(/\.env\(\{[^}]+\}/gs);
			if (envMatches) {
				for (const envMatch of envMatches) {
					const envVars = envMatch.match(/(\w+):/g);
					if (envVars) {
						for (const envVar of envVars) {
							const varName = envVar.replace(":", "");
							if (varName !== varName.toUpperCase() && varName.length > 1) {
								result.warnings.push({
									path: filePath,
									message: `Environment variable '${varName}' should be in UPPERCASE`,
									severity: "warning",
									rule: "env-var-naming",
								});
							}
						}
					}
				}
			}
		} catch (error) {
			result.errors.push({
				path: context.filePath,
				message: `Best practices validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "best-practices-error",
			});
		}
	}

	/**
	 * Check if a job name is descriptive
	 */
	private isDescriptiveJobName(jobName: string): boolean {
		// Consider names descriptive if they:
		// - Are longer than 4 characters
		// - Contain multiple words (camelCase, kebab-case, snake_case)
		// - Are not generic terms
		const genericNames = ["job", "task", "work", "run", "do", "main", "default"];
		const isGeneric = genericNames.includes(jobName.toLowerCase());
		const hasMultipleWords = /[A-Z]/.test(jobName) || /[-_]/.test(jobName);
		const isLongEnough = jobName.length > 4;

		return !isGeneric && (hasMultipleWords || isLongEnough);
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateBestPractices: ValidatorFunction = (context, result) => {
	const validator = new BestPracticesValidator();
	validator.validate(context, result);
};