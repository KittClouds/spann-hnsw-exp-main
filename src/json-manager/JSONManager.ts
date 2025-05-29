
import { stateValidator } from '@/cursor-stability/StateValidator';
import { stateMonitor } from '@/cursor-stability/StateMonitor';

export interface JSONOperation {
  id: string;
  type: 'serialize' | 'deserialize' | 'validate';
  dataType: string;
  timestamp: number;
  success?: boolean;
  error?: string;
  size?: number;
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
    
    try {
      // Get adapter for this data type
      const adapter = this.adapters.get(dataType);
      if (!adapter) {
        throw new Error(`No adapter registered for data type: ${dataType}`);
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
      
      // Validate if enabled
      if (this.options.enableValidation && adapter.validate) {
        const isValid = adapter.validate(enrichedObject);
        if (!isValid) {
          throw new Error(`Validation failed for ${dataType}`);
        }
      }
      
      // Serialize to string
      const jsonString = JSON.stringify(enrichedObject);
      
      // Create backup if enabled
      if (this.options.enableBackup) {
        this.backups.set(`${dataType}-${operationId}`, { ...enrichedObject });
      }
      
      // Record operation
      this.recordOperation({
        id: operationId,
        type: 'serialize',
        dataType,
        timestamp: startTime,
        success: true,
        size: jsonString.length
      });
      
      console.log(`JSONManager: Successfully serialized ${dataType} (${jsonString.length} bytes)`);
      return jsonString;
      
    } catch (error) {
      this.recordOperation({
        id: operationId,
        type: 'serialize',
        dataType,
        timestamp: startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
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
    
    try {
      // Parse JSON string
      const jsonObject = JSON.parse(jsonString);
      
      // Get adapter for this data type
      const adapter = this.adapters.get(dataType);
      if (!adapter) {
        throw new Error(`No adapter registered for data type: ${dataType}`);
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
      
      // Validate if enabled
      if (this.options.enableValidation && adapter.validate) {
        const isValid = adapter.validate(jsonObject);
        if (!isValid) {
          throw new Error(`Validation failed for ${dataType}`);
        }
      }
      
      // Use adapter to convert from JSON object
      const data = adapter.deserialize(jsonObject);
      
      // Record operation
      this.recordOperation({
        id: operationId,
        type: 'deserialize',
        dataType,
        timestamp: startTime,
        success: true,
        size: jsonString.length
      });
      
      console.log(`JSONManager: Successfully deserialized ${dataType}`);
      return data;
      
    } catch (error) {
      this.recordOperation({
        id: operationId,
        type: 'deserialize',
        dataType,
        timestamp: startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
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
    
    try {
      const jsonObject = JSON.parse(jsonString);
      const adapter = this.adapters.get(dataType);
      
      if (!adapter || !adapter.validate) {
        console.warn(`JSONManager: No validation available for ${dataType}`);
        return true;
      }
      
      const isValid = adapter.validate(jsonObject);
      
      this.recordOperation({
        id: operationId,
        type: 'validate',
        dataType,
        timestamp: startTime,
        success: isValid
      });
      
      return isValid;
      
    } catch (error) {
      this.recordOperation({
        id: operationId,
        type: 'validate',
        dataType,
        timestamp: startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
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
