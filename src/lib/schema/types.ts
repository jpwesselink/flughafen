/**
 * Types for action schema discovery and type generation
 */

/**
 * Parsed action reference
 */
export interface ActionReference {
  /** Full action string (e.g., 'actions/checkout@v4') */
  fullName: string;
  /** Owner/organization (e.g., 'actions', 'aws-actions') */
  owner: string;
  /** Action name (e.g., 'checkout', 'configure-aws-credentials') */
  name: string;
  /** Version or ref (e.g., 'v4', 'main', 'sha') */
  ref: string;
  /** Repository URL for fetching schema */
  repoUrl: string;
}

/**
 * Action input definition from action.yml
 */
export interface ActionInput {
  /** Input description */
  description?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Default value */
  default?: string | number | boolean;
  /** Deprecated flag */
  deprecationMessage?: string;
}

/**
 * Action output definition from action.yml
 */
export interface ActionOutput {
  /** Output description */
  description?: string;
}

/**
 * Parsed action metadata from action.yml
 */
export interface ActionMetadata {
  /** Action name */
  name: string;
  /** Action description */
  description?: string;
  /** Action author */
  author?: string;
  /** Input definitions */
  inputs?: Record<string, ActionInput>;
  /** Output definitions */
  outputs?: Record<string, ActionOutput>;
  /** Whether this is a composite, docker, or node action */
  runs: {
    using: 'composite' | 'docker' | 'node12' | 'node16' | 'node20';
    [key: string]: any;
  };
}

/**
 * Generated TypeScript interface for action inputs
 */
export interface GeneratedActionType {
  /** Action reference */
  action: ActionReference;
  /** Generated interface name */
  interfaceName: string;
  /** TypeScript interface definition */
  typeDefinition: string;
  /** Whether all inputs are optional */
  allOptional: boolean;
}

/**
 * Scan result containing all discovered actions
 */
export interface WorkflowScanResult {
  /** All discovered string-based actions */
  actions: ActionReference[];
  /** Scan timestamp */
  scannedAt: Date;
  /** Source workflows/jobs that were scanned */
  sources: string[];
}
