
import { stateValidator } from '@/cursor-stability/StateValidator';

export interface JSONSchemaDefinition {
  id: string;
  version: string;
  schema: Record<string, any>;
  validate: (data: any) => { isValid: boolean; errors: string[] };
  migrate?: (data: any, fromVersion: string) => any;
}

/**
 * Central registry for JSON schema definitions with validation and migration support
 */
export class JSONSchemaRegistry {
  private static instance: JSONSchemaRegistry | null = null;
  private schemas = new Map<string, Map<string, JSONSchemaDefinition>>();
  private defaultVersions = new Map<string, string>();
  
  static getInstance(): JSONSchemaRegistry {
    if (!this.instance) {
      this.instance = new JSONSchemaRegistry();
    }
    return this.instance;
  }
  
  /**
   * Register a schema definition for a data type
   */
  registerSchema(dataType: string, schema: JSONSchemaDefinition): void {
    if (!this.schemas.has(dataType)) {
      this.schemas.set(dataType, new Map());
    }
    
    const typeSchemas = this.schemas.get(dataType)!;
    typeSchemas.set(schema.version, schema);
    
    // Set as default version if it's the first or newer
    const currentDefault = this.defaultVersions.get(dataType);
    if (!currentDefault || this.isNewerVersion(schema.version, currentDefault)) {
      this.defaultVersions.set(dataType, schema.version);
    }
    
    console.log(`JSONSchemaRegistry: Registered schema ${dataType}@${schema.version}`);
  }
  
  /**
   * Get schema definition for a data type and version
   */
  getSchema(dataType: string, version?: string): JSONSchemaDefinition | null {
    const typeSchemas = this.schemas.get(dataType);
    if (!typeSchemas) {
      return null;
    }
    
    const targetVersion = version || this.defaultVersions.get(dataType);
    if (!targetVersion) {
      return null;
    }
    
    return typeSchemas.get(targetVersion) || null;
  }
  
  /**
   * Validate data against its schema
   */
  validateData(dataType: string, data: any, version?: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    migratedData?: any;
  } {
    const result = {
      isValid: false,
      errors: [] as string[],
      warnings: [] as string[],
      migratedData: undefined as any
    };
    
    // Get schema
    const schema = this.getSchema(dataType, version);
    if (!schema) {
      result.errors.push(`No schema found for ${dataType}@${version || 'latest'}`);
      return result;
    }
    
    // Check if data needs migration
    const dataVersion = data._json_meta?.version || data.version;
    let validationData = data;
    
    if (dataVersion && dataVersion !== schema.version) {
      if (schema.migrate) {
        try {
          validationData = schema.migrate(data, dataVersion);
          result.migratedData = validationData;
          result.warnings.push(`Data migrated from ${dataVersion} to ${schema.version}`);
        } catch (error) {
          result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return result;
        }
      } else {
        result.warnings.push(`Version mismatch: data is ${dataVersion}, schema is ${schema.version}`);
      }
    }
    
    // Perform validation
    try {
      const validation = schema.validate(validationData);
      result.isValid = validation.isValid;
      result.errors.push(...validation.errors);
      
      // Additional content validation for block data
      if (dataType === 'blocknote' && validationData.blocks) {
        const contentValidation = stateValidator.validateContent(validationData.blocks);
        if (!contentValidation.isValid) {
          result.isValid = false;
          result.errors.push(...contentValidation.errors);
        }
        result.warnings.push(...contentValidation.warnings);
      }
      
    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }
    
    return result;
  }
  
  /**
   * Get all registered data types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.schemas.keys());
  }
  
  /**
   * Get all versions for a data type
   */
  getVersions(dataType: string): string[] {
    const typeSchemas = this.schemas.get(dataType);
    return typeSchemas ? Array.from(typeSchemas.keys()) : [];
  }
  
  private isNewerVersion(version1: string, version2: string): boolean {
    // Simple version comparison (assumes semantic versioning)
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }
    
    return false;
  }
}

export const jsonSchemaRegistry = JSONSchemaRegistry.getInstance();
