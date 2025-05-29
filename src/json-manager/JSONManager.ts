
import { stateValidator } from '@/cursor-stability/StateValidator';
import { stateMonitor } from '@/cursor-stability/StateMonitor';
import { jsonSchemaRegistry } from './schemas';
import { jsonSafetyManager } from './SafetyManager';

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
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  protected constructor(options: JSONManagerOptions = {}) {
    this.options = {
      enableMonitoring: true,
      enableValidation: true,
      enableBackup: true,
      enableSchemaValidation: true,
      enableAutoMigration: true,
      compressionThreshold: 10000,
      ...options
    };
    
    console.log('JSONManager: Fort Knox JSON Management System initialized with Safety & Monitoring');
    
    // Start health monitoring
    this.startHealthMonitoring();
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
    this.adapters.set(dataType, adapter);
    console.log(`JSONManager: Registered adapter for data type: ${dataType}`);
  }
  
  /**
   * Unregister a serialization adapter
   */
  unregisterAdapter(dataType: string): boolean {
    const removed = this.adapters.delete(dataType);
    if (removed) {
      console.log(`JSONManager: Unregistered adapter for data type: ${dataType}`);
    }
    return removed;
  }
  
  /**
   * Check if an adapter is registered for a data type
   */
  hasAdapter(dataType: string): boolean {
    return this.adapters.has(dataType);
  }
  
  /**
   * Start integrated health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;
    
    this.healthCheckInterval = setInterval(() => {
      this.performIntegratedHealthCheck();
    }, 30000); // Every 30 seconds
    
    console.log('JSONManager: Integrated health monitoring started');
  }
  
  /**
   * Perform comprehensive health check with safety integration
   */
  private performIntegratedHealthCheck(): void {
    try {
      // Perform safety health check
      jsonSafetyManager.performHealthCheck();
      
      // Get safety diagnostics
      const safetyDiag = jsonSafetyManager.getDiagnostics();
      
      // Check for critical issues
      if (safetyDiag.metrics.healthScore < 50) {
        console.error('JSONManager: Critical safety health score detected:', safetyDiag.metrics.healthScore);
        // Could trigger emergency protocols here
      }
      
      // Check corruption trends
      const recentCorruptions = safetyDiag.recentCorruptions.filter(
        r => Date.now() - r.timestamp < 300000 // Last 5 minutes
      );
      
      if (recentCorruptions.length > 3) {
        console.warn('JSONManager: High corruption rate detected:', recentCorruptions.length);
      }
      
      // Integration with state monitor
      if (this.options.enableMonitoring) {
        const successRate = this.getOperationStats().successRate;
        if (successRate < 90) {
          stateMonitor.recordOperation(1000, false); // Record health issue
        }
      }
      
    } catch (error) {
      console.error('JSONManager: Health check failed:', error);
    }
  }
  
  /**
   * Enhanced serialize with safety integration
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
    
    // Create safety backup
    const backupId = jsonSafetyManager.createBackup(dataType, 'serialize', data);
    
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
      
      // Add metadata with safety checksums
      const enrichedObject = {
        ...jsonObject,
        _json_meta: {
          dataType,
          version: adapter.version,
          timestamp: Date.now(),
          managedBy: 'JSONManager',
          safetyBackupId: backupId,
          checksum: this.calculateSafetyChecksum(jsonObject)
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
      
      // Corruption detection
      const corruption = jsonSafetyManager.detectCorruption(dataType, jsonString, operationId);
      if (corruption && corruption.severity === 'critical') {
        throw new Error(`Critical corruption detected during serialization: ${corruption.details}`);
      }
      
      // Create backup if enabled
      if (this.options.enableBackup) {
        this.backups.set(`${dataType}-${operationId}`, { ...enrichedObject });
      }
      
      // Record successful operation
      operation.success = true;
      operation.size = jsonString.length;
      this.recordOperation(operation);
      
      console.log(`JSONManager: Successfully serialized ${dataType} (${jsonString.length} bytes) with safety checks`);
      return jsonString;
      
    } catch (error) {
      operation.success = false;
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      this.recordOperation(operation);
      
      // Attempt recovery from backup
      if (backupId) {
        const recovered = jsonSafetyManager.restoreFromBackup(backupId);
        if (recovered) {
          console.warn(`JSONManager: Attempting recovery from backup for ${dataType}`);
          // Could retry serialization with recovered data
        }
      }
      
      console.error(`JSONManager: Serialization failed for ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Enhanced deserialize with safety integration
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
      // Corruption detection first
      const corruption = jsonSafetyManager.detectCorruption(dataType, jsonString, operationId);
      let workingData = jsonString;
      
      if (corruption) {
        if (corruption.autoRepairable && this.options.enableAutoMigration) {
          console.log(`JSONManager: Attempting auto-repair for ${corruption.corruptionType} corruption`);
          const parsedData = JSON.parse(jsonString);
          const repairedData = jsonSafetyManager.attemptAutoRepair(corruption, parsedData);
          
          if (repairedData) {
            workingData = JSON.stringify(repairedData);
            operation.migrated = true;
            console.log(`JSONManager: Auto-repair successful for ${dataType}`);
          } else if (corruption.severity === 'critical') {
            throw new Error(`Critical corruption detected and auto-repair failed: ${corruption.details}`);
          }
        } else if (corruption.severity === 'critical') {
          throw new Error(`Critical corruption detected: ${corruption.details}`);
        }
      }
      
      // Parse JSON string
      const jsonObject = JSON.parse(workingData);
      
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
        
        // Verify safety checksum if present
        if (meta.checksum) {
          const expectedChecksum = meta.checksum;
          const { checksum, ...dataWithoutMeta } = jsonObject;
          const actualChecksum = this.calculateSafetyChecksum(dataWithoutMeta);
          
          if (expectedChecksum !== actualChecksum) {
            console.warn(`JSONManager: Safety checksum mismatch for ${dataType}`);
          }
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
      
      console.log(`JSONManager: Successfully deserialized ${dataType} with safety checks`);
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
  
  /**
   * Calculate safety checksum for data integrity
   */
  private calculateSafetyChecksum(data: any): string {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  /**
   * Get comprehensive diagnostics including safety metrics
   */
  getComprehensiveDiagnostics() {
    const baseStats = this.getOperationStats();
    const safetyDiag = jsonSafetyManager.getDiagnostics();
    
    return {
      operations: baseStats,
      safety: safetyDiag,
      integrationHealth: {
        monitoringActive: !!this.healthCheckInterval,
        lastHealthCheck: Date.now(),
        criticalIssues: safetyDiag.recentCorruptions.filter(r => r.severity === 'critical').length
      }
    };
  }
  
  /**
   * Shutdown with cleanup
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    console.log('JSONManager: Fort Knox JSON Management System shutdown completed');
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
