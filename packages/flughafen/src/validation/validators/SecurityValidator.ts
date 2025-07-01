import type { ValidationContext, WorkflowValidationResult, ValidatorFunction } from "../types";

/**
 * Security validator
 * Validates security best practices and identifies potential vulnerabilities
 */
export class SecurityValidator {
	/**
	 * Validate security best practices
	 */
	validate(context: ValidationContext, result: WorkflowValidationResult): void {
		try {
			const { content, filePath } = context;

			// Check for hardcoded secrets
			const secretPatterns = [
				/password\s*[:=]\s*['"]\w+['"]/i,
				/api[_-]?key\s*[:=]\s*['"]\w+['"]/i,
				/secret\s*[:=]\s*['"]\w+['"]/i,
				/token\s*[:=]\s*['"]\w+['"]/i,
			];

			for (const pattern of secretPatterns) {
				if (pattern.test(content)) {
					result.errors.push({
						path: filePath,
						message: "Potential hardcoded secret detected",
						severity: "error",
						rule: "hardcoded-secrets",
					});
					break;
				}
			}

			// Check for overly permissive permissions
			if (content.includes("permissions: 'write-all'") || content.includes("permissions: write-all")) {
				result.warnings.push({
					path: filePath,
					message: "Overly permissive workflow permissions detected",
					severity: "warning",
					rule: "permissive-permissions",
				});
			}

			// Check for potentially dangerous script contexts with user input
			const dangerousPatterns = [
				/run:\s*.*\$\{\{\s*github\.event\.issue\.title/,
				/run:\s*.*\$\{\{\s*github\.event\.issue\.body/,
				/run:\s*.*\$\{\{\s*github\.event\.comment\.body/,
				/run:\s*.*\$\{\{\s*github\.event\.pull_request\.title/,
				/run:\s*.*\$\{\{\s*github\.event\.pull_request\.body/,
			];

			for (const pattern of dangerousPatterns) {
				if (pattern.test(content)) {
					result.errors.push({
						path: filePath,
						message: "Untrusted user input used in script context - potential code injection vulnerability",
						severity: "error",
						rule: "script-injection-risk",
					});
					break;
				}
			}

			// Check for missing token scoping in checkout actions
			const checkoutWithTokenPattern = /\.uses\(['"]actions\/checkout@[^'"]+['"].*token:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/s;
			if (checkoutWithTokenPattern.test(content)) {
				result.warnings.push({
					path: filePath,
					message: "Consider using minimal token permissions for checkout actions",
					severity: "warning",
					rule: "token-scoping",
				});
			}
		} catch (error) {
			result.errors.push({
				path: context.filePath,
				message: `Security validation failed: ${error instanceof Error ? error.message : error}`,
				severity: "error",
				rule: "security-error",
			});
		}
	}
}

/**
 * Validator function for use with WorkflowValidator
 */
export const validateSecurity: ValidatorFunction = (context, result) => {
	const validator = new SecurityValidator();
	validator.validate(context, result);
};