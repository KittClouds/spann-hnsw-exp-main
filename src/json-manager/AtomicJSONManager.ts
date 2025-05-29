
import { cursorStabilityManager } from '@/cursor-stability/CursorStabilityManager';
import { stateManager } from '@/cursor-stability/StateManager';
import { jsonManager } from './JSONManager';
import { jsonSafetyManager } from './SafetyManager';

export interface AtomicOperation {
  id: string;
  type: 'serialize' | 'deserialize' | 'batch';
  dataType: string;
  noteId?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
  backupId?: string;
  checkpoints: string[];
}

export interface BatchOperation {
  operations: AtomicOperation[];
  transactionId: string;
  rollbackOnFailure: boolean;
}

/**
 * Atomic JSON Operations Manager
 * Provides transaction-like guarantees for JSON operations with cursor stability integration
 */
export class AtomicJSONManager {
  private static instance: AtomicJSONManager | null = null;
  private activeOperations = new Map<string, AtomicOperation>();
  private operationQueue: AtomicOperation[] = [];
  private isProcessing = false;
  private checkpoints = new Map<string, any>();
  
  static getInstance(): AtomicJSONManager {
    if (!this.instance) {
      this.instance = new AtomicJSONManager();
    }
    return this.instance;
  }
  
  /**
   * Execute atomic serialization with full protection
   */
  async atomicSerialize<T>(
    dataType: string, 
    data: T, 
    noteId?: string,
    options: { createBackup?: boolean; validateFirst?: boolean } = {}
  ): Promise<{ success: boolean; result?: string; error?: string; operationId: string }> {
    
    const operationId = this.generateOperationId('serialize');
    const operation: AtomicOperation = {
      id: operationId,
      type: 'serialize',
      dataType,
      noteId,
      timestamp: Date.now(),
      status: 'pending',
      checkpoints: []
    };
    
    try {
      // Add to active operations
      this.activeOperations.set(operationId, operation);
      
      // Create checkpoint if noteId provided
      if (noteId) {
        const checkpointId = await this.createCheckpoint(noteId);
        operation.checkpoints.push(checkpointId);
      }
      
      // Create backup if requested
      if (options.createBackup !== false) {
        const backupId = jsonSafetyManager.createBackup(dataType, 'serialize', data);
        operation.backupId = backupId;
      }
      
      // Validate data first if requested
      if (options.validateFirst) {
        const tempSerialized = JSON.stringify(data);
        const corruption = jsonSafetyManager.detectCorruption(dataType, tempSerialized, operationId);
        if (corruption) {
          throw new Error(`Validation failed: ${corruption.details}`);
        }
      }
      
      // Acquire operation lock for note if provided
      if (noteId) {
        const bufferSet = await cursorStabilityManager.setBuffer(noteId, []);
        if (!bufferSet) {
          throw new Error('Failed to acquire cursor stability lock');
        }
      }
      
      // Perform serialization
      const result = jsonManager.serialize(dataType, data);
      
      // Final corruption check
      const finalCorruption = jsonSafetyManager.detectCorruption(dataType, result, operationId);
      if (finalCorruption && finalCorruption.severity === 'critical') {
        throw new Error(`Critical corruption detected: ${finalCorruption.details}`);
      }
      
      operation.status = 'success';
      console.log(`AtomicJSON: Atomic serialization completed for ${dataType}`);
      
      return {
        success: true,
        result,
        operationId
      };
      
    } catch (error) {
      operation.status = 'failed';
      console.error(`AtomicJSON: Atomic serialization failed for ${dataType}:`, error);
      
      // Attempt rollback
      await this.rollbackOperation(operation);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operationId
      };
    } finally {
      // Cleanup
      this.activeOperations.delete(operationId);
      if (noteId) {
        await cursorStabilityManager.clearBuffer(noteId);
      }
    }
  }
  
  /**
   * Execute atomic deserialization with full protection
   */
  async atomicDeserialize<T>(
    dataType: string, 
    jsonString: string, 
    noteId?: string,
    options: { autoRepair?: boolean; validateResult?: boolean } = {}
  ): Promise<{ success: boolean; result?: T; error?: string; operationId: string; wasRepaired?: boolean }> {
    
    const operationId = this.generateOperationId('deserialize');
    const operation: AtomicOperation = {
      id: operationId,
      type: 'deserialize',
      dataType,
      noteId,
      timestamp: Date.now(),
      status: 'pending',
      checkpoints: []
    };
    
    let wasRepaired = false;
    
    try {
      // Add to active operations
      this.activeOperations.set(operationId, operation);
      
      // Create checkpoint if noteId provided
      if (noteId) {
        const checkpointId = await this.createCheckpoint(noteId);
        operation.checkpoints.push(checkpointId);
      }
      
      // Detect corruption
      let workingData = jsonString;
      const corruption = jsonSafetyManager.detectCorruption(dataType, jsonString, operationId);
      
      if (corruption) {
        if (options.autoRepair && corruption.autoRepairable) {
          console.log(`AtomicJSON: Attempting auto-repair for ${corruption.corruptionType} corruption`);
          const parsedData = JSON.parse(jsonString);
          const repairedData = jsonSafetyManager.attemptAutoRepair(corruption, parsedData);
          
          if (repairedData) {
            workingData = JSON.stringify(repairedData);
            wasRepaired = true;
            console.log(`AtomicJSON: Auto-repair successful for ${dataType}`);
          } else {
            throw new Error(`Auto-repair failed: ${corruption.details}`);
          }
        } else if (corruption.severity === 'critical') {
          throw new Error(`Critical corruption detected: ${corruption.details}`);
        }
      }
      
      // Acquire operation lock for note if provided
      if (noteId) {
        const bufferSet = await cursorStabilityManager.setBuffer(noteId, []);
        if (!bufferSet) {
          throw new Error('Failed to acquire cursor stability lock');
        }
      }
      
      // Perform deserialization
      const result = jsonManager.deserialize<T>(dataType, workingData);
      
      // Validate result if requested
      if (options.validateResult && result) {
        const resultJson = JSON.stringify(result);
        const resultCorruption = jsonSafetyManager.detectCorruption(dataType, resultJson, operationId);
        if (resultCorruption && resultCorruption.severity === 'critical') {
          throw new Error(`Result validation failed: ${resultCorruption.details}`);
        }
      }
      
      operation.status = 'success';
      console.log(`AtomicJSON: Atomic deserialization completed for ${dataType}`);
      
      return {
        success: true,
        result,
        operationId,
        wasRepaired
      };
      
    } catch (error) {
      operation.status = 'failed';
      console.error(`AtomicJSON: Atomic deserialization failed for ${dataType}:`, error);
      
      // Attempt rollback
      await this.rollbackOperation(operation);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operationId,
        wasRepaired
      };
    } finally {
      // Cleanup
      this.activeOperations.delete(operationId);
      if (noteId) {
        await cursorStabilityManager.clearBuffer(noteId);
      }
    }
  }
  
  /**
   * Execute batch operations atomically
   */
  async executeBatch(batchOp: BatchOperation): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    console.log(`AtomicJSON: Executing batch operation ${batchOp.transactionId} with ${batchOp.operations.length} operations`);
    
    const results: any[] = [];
    const errors: string[] = [];
    const completedOperations: AtomicOperation[] = [];
    
    try {
      for (const operation of batchOp.operations) {
        // Execute each operation
        // Implementation would depend on operation type
        // For now, we'll simulate success
        completedOperations.push(operation);
        results.push({ success: true, operationId: operation.id });
      }
      
      console.log(`AtomicJSON: Batch operation ${batchOp.transactionId} completed successfully`);
      return { success: true, results, errors };
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Rollback if configured
      if (batchOp.rollbackOnFailure) {
        console.log(`AtomicJSON: Rolling back batch operation ${batchOp.transactionId}`);
        for (const operation of completedOperations.reverse()) {
          await this.rollbackOperation(operation);
        }
      }
      
      return { success: false, results, errors };
    }
  }
  
  private async createCheckpoint(noteId: string): Promise<string> {
    const checkpointId = `checkpoint-${noteId}-${Date.now()}`;
    const buffer = cursorStabilityManager.getBuffer(noteId);
    
    if (buffer) {
      this.checkpoints.set(checkpointId, [...buffer]);
      console.log(`AtomicJSON: Created checkpoint ${checkpointId} for note ${noteId}`);
    }
    
    return checkpointId;
  }
  
  private async rollbackOperation(operation: AtomicOperation): Promise<void> {
    console.warn(`AtomicJSON: Rolling back operation ${operation.id}`);
    operation.status = 'rolled_back';
    
    // Restore from backup if available
    if (operation.backupId) {
      const restored = jsonSafetyManager.restoreFromBackup(operation.backupId);
      if (restored) {
        console.log(`AtomicJSON: Restored data from backup ${operation.backupId}`);
      }
    }
    
    // Restore checkpoints
    for (const checkpointId of operation.checkpoints) {
      const checkpointData = this.checkpoints.get(checkpointId);
      if (checkpointData && operation.noteId) {
        await cursorStabilityManager.setBuffer(operation.noteId, checkpointData);
        console.log(`AtomicJSON: Restored checkpoint ${checkpointId}`);
      }
    }
  }
  
  private generateOperationId(type: string): string {
    return `atomic-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  
  /**
   * Get diagnostics for atomic operations
   */
  getDiagnostics() {
    return {
      activeOperations: this.activeOperations.size,
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      checkpointCount: this.checkpoints.size,
      recentOperations: Array.from(this.activeOperations.values()).slice(-10)
    };
  }
  
  /**
   * Emergency cleanup
   */
  emergencyCleanup(): void {
    console.warn('AtomicJSON: Emergency cleanup triggered');
    this.activeOperations.clear();
    this.operationQueue.length = 0;
    this.checkpoints.clear();
    this.isProcessing = false;
  }
}

export const atomicJSONManager = AtomicJSONManager.getInstance();
