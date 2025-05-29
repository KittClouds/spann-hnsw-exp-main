import { stateValidator } from '@/cursor-stability/StateValidator';
import { stateMonitor } from '@/cursor-stability/StateMonitor';
import { jsonSchemaRegistry } from './schemas';

export interface JSONOperation {
  id: string;
  type: 'serialize' | 'deserialize' | 'validate';
  dataType: string;
  timestamp: number;
  success?: boolean;
  error?: string;
  size?: number;
  validationErrors?: string[];
  migrated?: boolean;
}

export interface SerializationAdapter<T = any> {
  name: string;
  version: string;
  serialize: (data: T) => Record<string, any>;
  deserialize: (json: Record<string, any>) => T;
  validate?: (json: Record<string, any>) => boolean;
  schema?: Record<string, any>;
}

export interface JSONManagerOptions {
  enableMonitoring?: boolean;
  enableValidation?: boolean;
  enableBackup?: boolean;
  enableSchemaValidation?: boolean;
  enableAutoMigration?: boolean;
  compressionThreshold?: number;
}

/**
 * Fort Knox JSON Management System
 * Central hub for ALL JSON operations with comprehensive protection
 */
export class JSONManager {
  private static instance: JSONManager | null = null;
  private adapters = new Map<string, SerializationAdapter>();
  private operations: JSONOperation[] = [];
  private backups = new Map<string, any>();
  private options: Required<JSONManagerOptions>;
  
  private constructor(options: JSONManagerOptions = {}) {
    this.options = {
      enableMonitoring: true,
      enableValidation: true,
      enableBackup: true,
      enableSchemaValidation: true,
      enableAutoMigration: true,
      compressionThreshold: 10000,
      ...options
    };
    
    console.log('JSONManager: Fort Knox JSON Management System initialized');
  }
  
  static getInstance(options?: JSONManagerOptions): JSONManager {
    if (!this.instance) {
      this.instance = new JSONManager(options);
    }
    return this.instance;
  }
  
  /**
   * Register a serialization adapter for a specific data type
   */
  registerAdapter<T>(dataType: string, adapter: SerializationAdapter<T>): void {
    console.log(`JSONManager: Registering adapter for ${dataType}`);
    this.adapters.set(dataType, adapter);
  }
  
  /**
   * Safe JSON serialization with validation and monitoring
   */
  serialize<T>(dataType: string, data: T): string {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    const operation: JSONOperation = {
      id: operationId,
      type: 'serialize',
      dataType,
      timestamp: startTime
    };
    
    try {
      // Get adapter for this data type
      const adapter = this.adapters.get(dataType);
      if (!adapter) {
        throw new Error(`No adapter registered for data type: ${dataType}`);
      }
      
      // Schema validation before serialization
      if (this.options.enableSchemaValidation) {
        const schemaValidation = jsonSchemaRegistry.validateData(dataType, data);
        if (!schemaValidation.isValid) {
          operation.validationErrors = schemaValidation.errors;
          console.warn(`JSONManager: Schema validation warnings for ${dataType}:`, schemaValidation.errors);
        }
      }
      
      // Use adapter to convert to JSON object
      const jsonObject = adapter.serialize(data);
      
      // Add metadata
      const enrichedObject = {
        ...jsonObject,
        _json_meta: {
          dataType,
          version: adapter.version,
          timestamp: Date.now(),
          managedBy: 'JSONManager'
        }
      };
      
      // Final schema validation
      if (this.options.enableSchemaValidation) {
        const finalValidation = jsonSchemaRegistry.validateData(dataType, enrichedObject);
        if (!finalValidation.isValid) {
          throw new Error(`Final validation failed for ${dataType}: ${finalValidation.errors.join(', ')}`);
        }
      }
      
      // Validate with adapter if available
      if (this.options.enableValidation && adapter.validate) {
        const isValid = adapter.validate(enrichedObject);
        if (!isValid) {
          throw new Error(`Adapter validation failed for ${dataType}`);
        }
      }
      
      // Serialize to string
      const jsonString = JSON.stringify(enrichedObject);
      
      // Create backup if enabled
      if (this.options.enableBackup) {
        this.backups.set(`${dataType}-${operationId}`, { ...enrichedObject });
      }
      
      // Record successful operation
      operation.success = true;
      operation.size = jsonString.length;
      this.recordOperation(operation);
      
      console.log(`JSONManager: Successfully serialized ${dataType} (${jsonString.length} bytes)`);
      return jsonString;
      
    } catch (error) {
      operation.success = false;
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      this.recordOperation(operation);
      
      console.error(`JSONManager: Serialization failed for ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Safe JSON deserialization with validation and monitoring
   */
  deserialize<T>(dataType: string, jsonString: string): T {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    const operation: JSONOperation = {
      id: operationId,
      type: 'deserialize',
      dataType,
      timestamp: startTime,
      size: jsonString.length
    };
    
    try {
      // Parse JSON string
      const jsonObject = JSON.parse(jsonString);
      
      // Get adapter for this data type
      const adapter = this.adapters.get(dataType);
      if (!adapter) {
        throw new Error(`No adapter registered for data type: ${dataType}`);
      }
      
      // Schema validation with auto-migration
      if (this.options.enableSchemaValidation) {
        const schemaValidation = jsonSchemaRegistry.validateData(dataType, jsonObject);
        
        if (!schemaValidation.isValid && !schemaValidation.migratedData) {
          operation.validationErrors = schemaValidation.errors;
          throw new Error(`Schema validation failed for ${dataType}: ${schemaValidation.errors.join(', ')}`);
        }
        
        if (schemaValidation.migratedData && this.options.enableAutoMigration) {
          console.log(`JSONManager: Auto-migrated ${dataType} data`);
          operation.migrated = true;
          // Use migrated data for deserialization
          Object.assign(jsonObject, schemaValidation.migratedData);
        }
        
        if (schemaValidation.warnings.length > 0) {
          console.warn(`JSONManager: Schema warnings for ${dataType}:`, schemaValidation.warnings);
        }
      }
      
      // Validate metadata if present
      if (jsonObject._json_meta) {
        const meta = jsonObject._json_meta;
        if (meta.dataType !== dataType) {
          console.warn(`JSONManager: Data type mismatch - expected ${dataType}, got ${meta.dataType}`);
        }
        if (meta.version !== adapter.version) {
          console.warn(`JSONManager: Version mismatch - expected ${adapter.version}, got ${meta.version}`);
        }
      }
      
      // Validate with adapter if available
      if (this.options.enableValidation && adapter.validate) {
        const isValid = adapter.validate(jsonObject);
        if (!isValid) {
          throw new Error(`Adapter validation failed for ${dataType}`);
        }
      }
      
      // Use adapter to convert from JSON object
      const data = adapter.deserialize(jsonObject);
      
      // Record successful operation
      operation.success = true;
      this.recordOperation(operation);
      
      console.log(`JSONManager: Successfully deserialized ${dataType}`);
      return data;
      
    } catch (error) {
      operation.success = false;
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      this.recordOperation(operation);
      
      console.error(`JSONManager: Deserialization failed for ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Validate JSON structure without deserializing
   */
  validateJSON(dataType: string, jsonString: string): boolean {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    const operation: JSONOperation = {
      id: operationId,
      type: 'validate',
      dataType,
      timestamp: startTime
    };
    
    try {
      const jsonObject = JSON.parse(jsonString);
      
      // Schema validation
      if (this.options.enableSchemaValidation) {
        const schemaValidation = jsonSchemaRegistry.validateData(dataType, jsonObject);
        if (!schemaValidation.isValid) {
          operation.validationErrors = schemaValidation.errors;
          operation.success = false;
          this.recordOperation(operation);
          return false;
        }
      }
      
      // Adapter validation
      const adapter = this.adapters.get(dataType);
      if (adapter && adapter.validate) {
        const isValid = adapter.validate(jsonObject);
        operation.success = isValid;
        this.recordOperation(operation);
        return isValid;
      }
      
      operation.success = true;
      this.recordOperation(operation);
      return true;
      
    } catch (error) {
      operation.success = false;
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      this.recordOperation(operation);
      return false;
    }
  }
  
  /**
   * Get operation history and statistics
   */
  getOperationStats(): {
    totalOperations: number;
    successRate: number;
    byType: Record<string, number>;
    byDataType: Record<string, number>;
    recentErrors: JSONOperation[];
  } {
    const total = this.operations.length;
    const successful = this.operations.filter(op => op.success).length;
    const successRate = total > 0 ? (successful / total) * 100 : 100;
    
    const byType = this.operations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byDataType = this.operations.reduce((acc, op) => {
      acc[op.dataType] = (acc[op.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recentErrors = this.operations
      .filter(op => !op.success)
      .slice(-10);
    
    return {
      totalOperations: total,
      successRate,
      byType,
      byDataType,
      recentErrors
    };
  }
  
  /**
   * Get list of registered adapters
   */
  getRegisteredAdapters(): Array<{ dataType: string; adapter: SerializationAdapter }> {
    return Array.from(this.adapters.entries()).map(([dataType, adapter]) => ({
      dataType,
      adapter
    }));
  }
  
  /**
   * Emergency recovery - attempt to restore from backup
   */
  recoverFromBackup(dataType: string, operationId: string): any | null {
    const backupKey = `${dataType}-${operationId}`;
    const backup = this.backups.get(backupKey);
    
    if (backup) {
      console.log(`JSONManager: Recovered backup for ${dataType}`);
      return backup;
    }
    
    console.warn(`JSONManager: No backup found for ${dataType}-${operationId}`);
    return null;
  }
  
  /**
   * Clear old operations and backups to prevent memory leaks
   */
  cleanup(maxAge: number = 3600000): void { // Default: 1 hour
    const cutoff = Date.now() - maxAge;
    
    // Clean old operations
    const originalCount = this.operations.length;
    this.operations = this.operations.filter(op => op.timestamp > cutoff);
    
    // Clean old backups
    const oldBackups = Array.from(this.backups.keys()).filter(key => {
      const parts = key.split('-');
      const operationId = parts[parts.length - 1];
      const operation = this.operations.find(op => op.id === operationId);
      return !operation || operation.timestamp <= cutoff;
    });
    
    oldBackups.forEach(key => this.backups.delete(key));
    
    console.log(`JSONManager: Cleaned ${originalCount - this.operations.length} operations and ${oldBackups.length} backups`);
  }
  
  /**
   * Get schema validation report for all registered types
   */
  getSchemaReport(): {
    registeredTypes: string[];
    schemaVersions: Record<string, string[]>;
    validationStats: Record<string, { total: number; passed: number; failed: number }>;
  } {
    const registeredTypes = jsonSchemaRegistry.getRegisteredTypes();
    const schemaVersions: Record<string, string[]> = {};
    const validationStats: Record<string, { total: number; passed: number; failed: number }> = {};
    
    for (const type of registeredTypes) {
      schemaVersions[type] = jsonSchemaRegistry.getVersions(type);
      
      const typeOperations = this.operations.filter(op => op.dataType === type && op.type === 'validate');
      validationStats[type] = {
        total: typeOperations.length,
        passed: typeOperations.filter(op => op.success).length,
        failed: typeOperations.filter(op => !op.success).length
      };
    }
    
    return {
      registeredTypes,
      schemaVersions,
      validationStats
    };
  }
  
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private recordOperation(operation: JSONOperation): void {
    this.operations.push(operation);
    
    // Integrate with monitoring if enabled
    if (this.options.enableMonitoring) {
      stateMonitor.recordOperation(Date.now() - operation.timestamp, operation.success || false);
    }
    
    // Limit operation history size
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-500);
    }
  }
}

export const jsonManager = JSONManager.getInstance();
