import { ActionSchema, ActionInput } from './ActionSchemaFetcher';

/**
 * Configuration for the type generator
 */
export interface TypeGeneratorConfig {
  /** Whether to generate optional properties for inputs with defaults */
  optionalDefaults?: boolean;
  /** Whether to include JSDoc comments in generated types */
  includeJSDoc?: boolean;
  /** Custom type mappings for specific actions */
  typeOverrides?: Record<string, Record<string, string>>;
}

/**
 * Generated TypeScript interface information
 */
export interface GeneratedInterface {
  /** Action name for the interface */
  actionName: string;
  /** Generated interface name */
  interfaceName: string;
  /** Generated TypeScript interface code */
  interfaceCode: string;
  /** Import statement if needed */
  importStatement?: string;
}

/**
 * Generates TypeScript interfaces from GitHub Action schemas
 */
export class TypeGenerator {
  private config: Required<TypeGeneratorConfig>;

  constructor(config: TypeGeneratorConfig = {}) {
    this.config = {
      optionalDefaults: config.optionalDefaults ?? true,
      includeJSDoc: config.includeJSDoc ?? true,
      typeOverrides: config.typeOverrides ?? {},
    };
  }

  /**
   * Generate TypeScript interfaces for multiple action schemas
   */
  generateInterfaces(schemas: ActionSchema[]): GeneratedInterface[] {
    return schemas.map(schema => this.generateInterface(schema));
  }

  /**
   * Generate a TypeScript interface for a single action schema
   */
  generateInterface(schema: ActionSchema): GeneratedInterface {
    const actionName = schema.action;
    const interfaceName = this.generateInterfaceName(actionName);
    const interfaceCode = this.generateInterfaceCode(schema, interfaceName);

    return {
      actionName,
      interfaceName,
      interfaceCode,
    };
  }

  /**
   * Generate interface name from action name
   */
  private generateInterfaceName(actionName: string): string {
    // Convert action name to PascalCase interface name
    // e.g., "actions/checkout@v4" -> "ActionsCheckoutV4Inputs"
    const cleaned = actionName
      .replace(/[@\/\-\.]/g, ' ') // Replace separators with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    const pascalCase = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    return `${pascalCase}Inputs`;
  }

  /**
   * Generate the TypeScript interface code
   */
  private generateInterfaceCode(schema: ActionSchema, interfaceName: string): string {
    const lines: string[] = [];

    // Add JSDoc comment if enabled
    if (this.config.includeJSDoc && schema.description) {
      lines.push('/**');
      lines.push(` * Inputs for ${schema.action}`);
      if (schema.description) {
        lines.push(` * ${schema.description}`);
      }
      lines.push(' */');
    }

    // Start interface declaration
    lines.push(`export interface ${interfaceName} {`);

    // Generate properties for each input
    if (schema.inputs && Object.keys(schema.inputs).length > 0) {
      const inputEntries = Object.entries(schema.inputs);
      
      for (let i = 0; i < inputEntries.length; i++) {
        const [inputName, inputDef] = inputEntries[i];
        const propertyLines = this.generateProperty(schema.action, inputName, inputDef);
        lines.push(...propertyLines);
        
        // Add empty line between properties (except for the last one)
        if (i < inputEntries.length - 1) {
          lines.push('');
        }
      }
    } else {
      // Empty interface
      lines.push('  // This action has no inputs');
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate a single property definition
   */
  private generateProperty(actionName: string, inputName: string, inputDef: ActionInput): string[] {
    const lines: string[] = [];

    // Add JSDoc comment for the property
    if (this.config.includeJSDoc) {
      lines.push('  /**');
      if (inputDef.description) {
        // Wrap long descriptions
        const description = this.wrapText(inputDef.description, 70);
        description.forEach(line => lines.push(`   * ${line}`));
      }
      if (inputDef.default !== undefined) {
        lines.push(`   * @default ${JSON.stringify(inputDef.default)}`);
      }
      lines.push('   */');
    }

    // Determine if property is optional
    const hasDefault = inputDef.default !== undefined;
    const isOptional = !inputDef.required || (this.config.optionalDefaults && hasDefault);
    const optionalMarker = isOptional ? '?' : '';

    // Determine TypeScript type
    const tsType = this.getTsType(actionName, inputName, inputDef);

    // Generate property declaration
    const propertyName = this.sanitizePropertyName(inputName);
    lines.push(`  ${propertyName}${optionalMarker}: ${tsType};`);

    return lines;
  }

  /**
   * Get TypeScript type for an input
   */
  private getTsType(actionName: string, inputName: string, inputDef: ActionInput): string {
    // Check for type overrides first
    const overrides = this.config.typeOverrides[actionName];
    if (overrides && overrides[inputName]) {
      return overrides[inputName];
    }

    // Map action input types to TypeScript types
    switch (inputDef.type) {
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'choice':
        if (inputDef.options && inputDef.options.length > 0) {
          // Create union type from options
          const unionTypes = inputDef.options.map(option => `'${option}'`);
          return unionTypes.join(' | ');
        }
        return 'string';
      case 'string':
      default:
        return 'string';
    }
  }

  /**
   * Sanitize property name for TypeScript
   */
  private sanitizePropertyName(name: string): string {
    // If the name contains hyphens or other special characters, quote it
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return name;
    }
    return `'${name}'`;
  }

  /**
   * Wrap text to specified width
   */
  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Generate a complete .d.ts file content with ambient module declarations
   */
  generateTypeFile(interfaces: GeneratedInterface[]): string {
    const lines: string[] = [];

    // File header
    lines.push('// This file is auto-generated by Flughafen');
    lines.push('// Do not edit manually - regenerate using `flughafen generate-types`');
    lines.push('');
    lines.push('// Ambient module declaration - types are automatically available');
    lines.push('// No need to import this file explicitly');
    lines.push('');

    // Add all interfaces
    for (let i = 0; i < interfaces.length; i++) {
      const iface = interfaces[i];
      lines.push(iface.interfaceCode);
      
      // Add spacing between interfaces
      if (i < interfaces.length - 1) {
        lines.push('');
      }
    }

    // Add module augmentation directly in the same file
    if (interfaces.length > 0) {
      lines.push('');
      lines.push('// Module augmentation for type-safe .with() usage');
      lines.push('// This makes the types available without explicit imports');
      lines.push("declare module 'flughafen' {");
      lines.push('  interface StepBuilder {');

      // Generate overloads for each action
      for (const iface of interfaces) {
        lines.push(`    with(inputs: ${iface.interfaceName}): this;`);
      }

      lines.push('  }');
      lines.push('}');
    }

    return lines.join('\n');
  }

  /**
   * Generate module augmentation for Flughafen
   */
  generateModuleAugmentation(interfaces: GeneratedInterface[]): string {
    const lines: string[] = [];

    lines.push('// Module augmentation for type-safe .with() usage');
    lines.push("declare module 'flughafen' {");
    lines.push('  interface StepBuilder {');

    // Generate overloads for each action
    for (const iface of interfaces) {
      lines.push(`    with(inputs: ${iface.interfaceName}): this;`);
    }

    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }
}

// Export convenience instance
export const typeGenerator = new TypeGenerator();
