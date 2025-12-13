import { actionToMethodName } from "./name-converter";
import type { GeneratedInterface } from "./type-generator-types";

/**
 * Generate module augmentation for Flughafen with typed action interfaces
 */
export class ModuleAugmentationGenerator {
	/**
	 * Generate module augmentation for Flughafen with conditional typing
	 */
	generateModuleAugmentation(interfaces: GeneratedInterface[]): string {
		const lines: string[] = [];

		// Augment both the canonical module name and relative imports
		const moduleNames = ["@flughafen/core", "./src", "./src/index"];

		lines.push("// Module augmentation for type-safe .uses() methods");
		for (const moduleName of moduleNames) {
			lines.push(`declare module '${moduleName}' {`);

			// Generate the Uses<T> interface inside the module
			lines.push("  // Generic typed action builder - can be used for any action type");
			lines.push("  export interface Uses<TInputs = Record<string, unknown>> {");
			lines.push("    with(inputs: TInputs): Uses<TInputs>;");
			lines.push("    env(variables: Record<string, string | number | boolean>): Uses<TInputs>;");
			lines.push("  }");
			lines.push("");

			// Note: Common action interfaces are defined at the top level
			// They are automatically available in module scope

			// Generate action mapping type inside the module
			lines.push("  // Action mapping type - maps action strings to their input types");
			lines.push("  export type ActionInputMap = {");

			// Add hardcoded common actions first
			lines.push("    // Built-in common actions");
			lines.push("    'actions/checkout@v4': ActionsCheckoutV4Inputs;");
			lines.push("    'actions/setup-node@v3': ActionsSetupNodeV3Inputs;");
			lines.push("    'actions/setup-node@v4': ActionsSetupNodeV4Inputs;");
			lines.push("    'aws-actions/configure-aws-credentials@v2': AwsActionsConfigureAwsCredentialsV2Inputs;");
			lines.push("    'actions/upload-artifact@v3': ActionsUploadArtifactV3Inputs;");
			lines.push("    'actions/upload-artifact@v4': ActionsUploadArtifactV4Inputs;");
			lines.push("    'actions/download-artifact@v3': ActionsDownloadArtifactV3Inputs;");
			lines.push("    'actions/download-artifact@v4': ActionsDownloadArtifactV4Inputs;");
			lines.push("    'actions/cache@v3': ActionsCacheV3Inputs;");

			// Add dynamically generated actions
			if (interfaces.length > 0) {
				lines.push("    // Dynamically generated actions");
				for (const iface of interfaces) {
					// Skip if it's already in the hardcoded list
					const hardcodedActions = [
						"actions/checkout@v4",
						"actions/setup-node@v3",
						"actions/setup-node@v4",
						"aws-actions/configure-aws-credentials@v2",
						"actions/upload-artifact@v3",
						"actions/upload-artifact@v4",
						"actions/download-artifact@v3",
						"actions/download-artifact@v4",
						"actions/cache@v3",
					];
					if (!hardcodedActions.includes(iface.actionName)) {
						lines.push(`    '${iface.actionName}': ${iface.interfaceName};`);
					}
				}
			}

			lines.push("    // Add more actions here as they are discovered");
			lines.push("  };");
			lines.push("");

			lines.push("  interface StepBuilder {");

			// Type-safe overloads for known GitHub Actions with callbacks
			lines.push("    // Overloads for known GitHub Actions with typed callbacks");
			lines.push("    uses<T extends keyof ActionInputMap>(");
			lines.push("      action: T,");
			lines.push("      callback: (uses: Uses<ActionInputMap[T]>) => Uses<ActionInputMap[T]>");
			lines.push("    ): StepBuilder;");
			lines.push("");

			// Type-safe shorthand overload for known GitHub Actions with direct inputs
			lines.push("    // Overloads for known GitHub Actions with direct inputs (shorthand)");
			lines.push("    uses<T extends keyof ActionInputMap>(");
			lines.push("      action: T,");
			lines.push("      inputs: ActionInputMap[T]");
			lines.push("    ): StepBuilder;");
			lines.push("");

			// Generic string action with callback
			lines.push("    // Generic string action with callback");
			lines.push("    uses(");
			lines.push("      action: string,");
			lines.push("      callback: (uses: Uses<Record<string, unknown>>) => Uses<Record<string, unknown>>");
			lines.push("    ): StepBuilder;");
			lines.push("");

			// Generic string action with direct inputs (fallback for unknown actions)
			lines.push("    // Generic string action with direct inputs (fallback for unknown actions)");
			lines.push("    uses(action: string, inputs: Record<string, unknown>): StepBuilder;");
			lines.push("");

			// Direct string action (no callback)
			lines.push("    // Direct string action (no callback)");
			lines.push("    uses(action: string): StepBuilder;");
			lines.push("");

			// Local action overloads (existing functionality)
			lines.push("    // Local action overloads (existing functionality)");
			lines.push(
				"    uses<TInputs = unknown, TOutputs = unknown>(action: LocalActionBuilder<TInputs, TOutputs>): StepBuilder;"
			);
			lines.push("    uses<TInputs = unknown, TOutputs = unknown>(");
			lines.push("      action: LocalActionBuilder<TInputs, TOutputs>,");
			lines.push("      callback: (uses: TypedActionConfigBuilder<TInputs>) => TypedActionConfigBuilder<TInputs>");
			lines.push("    ): StepBuilder;");

			lines.push("  }");
			lines.push("");

			// Also augment JobBuilder's .step() shorthand
			lines.push("  interface JobBuilder {");
			lines.push("    // Type-safe shorthand for known GitHub Actions");
			lines.push("    step<T extends keyof ActionInputMap>(");
			lines.push("      action: T,");
			lines.push("      inputs: ActionInputMap[T]");
			lines.push("    ): JobBuilder;");
			lines.push("");
			lines.push("    // Generic string action (fallback for unknown actions)");
			lines.push("    step(action: string, inputs?: Record<string, unknown>): JobBuilder;");
			lines.push("");
			lines.push("    // Callback form");
			lines.push("    step(callback: (step: StepBuilder) => StepBuilder): JobBuilder;");
			lines.push("  }");

			lines.push("}");
			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Generate convenience method declarations for type-safe action usage
	 */
	generateConvenienceMethods(interfaces: GeneratedInterface[]): string {
		const lines: string[] = [];

		lines.push("// Type-safe convenience methods for known GitHub Actions");
		lines.push("// These methods provide IntelliSense and type checking for action inputs");
		lines.push("");

		for (const iface of interfaces) {
			const actionParts = iface.actionName.split("/");
			if (actionParts.length >= 2) {
				// Convert action name to camelCase method name
				const methodName = actionToMethodName(iface.actionName);

				lines.push(`  /**`);
				lines.push(`   * Type-safe convenience method for ${iface.actionName}`);
				lines.push(`   */`);
				lines.push(`  uses${methodName}(inputs?: ${iface.interfaceName}): StepBuilder;`);
				lines.push("");
			}
		}

		return lines.join("\n");
	}

	/**
	 * Generate hardcoded interfaces for common GitHub Actions
	 * These are always present even without running type generation
	 */
	generateCommonActionInterfaces(): string {
		const lines: string[] = [];

		// actions/checkout (most common versions)
		lines.push("export interface ActionsCheckoutV4Inputs {");
		lines.push("  repository?: string;");
		lines.push("  ref?: string;");
		lines.push("  token?: string;");
		lines.push("  sshKey?: string;");
		lines.push("  sshKnownHosts?: string;");
		lines.push("  sshStrict?: boolean;");
		lines.push("  persistCredentials?: boolean;");
		lines.push("  path?: string;");
		lines.push("  clean?: boolean;");
		lines.push("  fetchDepth?: number;");
		lines.push("  fetchTags?: boolean;");
		lines.push("  lfs?: boolean;");
		lines.push("  submodules?: boolean;");
		lines.push("}");
		lines.push("");

		// actions/setup-node (v3 and v4)
		lines.push("export interface ActionsSetupNodeV3Inputs {");
		lines.push("  alwaysAuth?: boolean;");
		lines.push("  nodeVersion?: string;");
		lines.push("  nodeVersionFile?: string;");
		lines.push("  architecture?: string;");
		lines.push("  checkLatest?: boolean;");
		lines.push("  registryUrl?: string;");
		lines.push("  scope?: string;");
		lines.push("  token?: string;");
		lines.push("  cache?: string;");
		lines.push("  cacheDependencyPath?: string;");
		lines.push("}");
		lines.push("");

		lines.push("export interface ActionsSetupNodeV4Inputs {");
		lines.push("  alwaysAuth?: boolean;");
		lines.push("  nodeVersion?: string;");
		lines.push("  nodeVersionFile?: string;");
		lines.push("  architecture?: string;");
		lines.push("  checkLatest?: boolean;");
		lines.push("  registryUrl?: string;");
		lines.push("  scope?: string;");
		lines.push("  token?: string;");
		lines.push("  cache?: string;");
		lines.push("  cacheDependencyPath?: string;");
		lines.push("}");
		lines.push("");

		// aws-actions/configure-aws-credentials
		lines.push("export interface AwsActionsConfigureAwsCredentialsV2Inputs {");
		lines.push("  audience?: string;");
		lines.push("  awsAccessKeyId?: string;");
		lines.push("  awsSecretAccessKey?: string;");
		lines.push("  awsSessionToken?: string;");
		lines.push("  awsRegion: string;");
		lines.push("  maskAwsAccountId?: boolean;");
		lines.push("  roleToAssume?: string;");
		lines.push("  webIdentityTokenFile?: string;");
		lines.push("  roleDurationSeconds?: number;");
		lines.push("  roleSessionName?: string;");
		lines.push("  roleExternalId?: string;");
		lines.push("  roleSkipSessionTagging?: boolean;");
		lines.push("  inlineSessionPolicy?: string;");
		lines.push("  managedSessionPolicies?: string;");
		lines.push("  outputCredentials?: boolean;");
		lines.push("  unsetCurrentCredentials?: boolean;");
		lines.push("  disableRetry?: boolean;");
		lines.push("  retryMaxAttempts?: number;");
		lines.push("  specialCharactersBehaviour?: string;");
		lines.push("  httpProxy?: string;");
		lines.push("}");
		lines.push("");

		// actions/upload-artifact
		lines.push("export interface ActionsUploadArtifactV3Inputs {");
		lines.push("  name?: string;");
		lines.push("  path: string;");
		lines.push("  ifNoFilesFound?: string;");
		lines.push("  retentionDays?: string;");
		lines.push("  includeHiddenFiles?: string;");
		lines.push("}");
		lines.push("");

		lines.push("export interface ActionsUploadArtifactV4Inputs {");
		lines.push("  name?: string;");
		lines.push("  path: string;");
		lines.push("  ifNoFilesFound?: string;");
		lines.push("  retentionDays?: number;");
		lines.push("  compressionLevel?: number;");
		lines.push("  overwrite?: boolean;");
		lines.push("}");
		lines.push("");

		// actions/download-artifact
		lines.push("export interface ActionsDownloadArtifactV3Inputs {");
		lines.push("  name?: string;");
		lines.push("  path?: string;");
		lines.push("}");
		lines.push("");

		lines.push("export interface ActionsDownloadArtifactV4Inputs {");
		lines.push("  name?: string;");
		lines.push("  path?: string;");
		lines.push("  pattern?: string;");
		lines.push("  mergeMultiple?: boolean;");
		lines.push("  githubToken?: string;");
		lines.push("  repository?: string;");
		lines.push("  runId?: string;");
		lines.push("}");
		lines.push("");

		// actions/cache
		lines.push("export interface ActionsCacheV3Inputs {");
		lines.push("  path: string;");
		lines.push("  key: string;");
		lines.push("  restoreKeys?: string;");
		lines.push("  uploadChunkSize?: number;");
		lines.push("  enableCrossOsArchive?: boolean;");
		lines.push("  failOnCacheMiss?: boolean;");
		lines.push("  lookupOnly?: boolean;");
		lines.push("}");
		lines.push("");

		return lines.join("\n");
	}
}
