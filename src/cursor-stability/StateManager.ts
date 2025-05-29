import { Block } from '@blocknote/core';
import { cursorStabilityManager } from './CursorStabilityManager';

export interface StateSnapshot {
  noteId: string;
  content: Block[];
  timestamp: number;
  checksum: string;
  version: number;
}

export interface StateOperation {
  id: string;
  type: 'load' | 'save' | 'switch' | 'update';
  noteId: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'rollback';
  data?: any;
}

export interface StateHealth {
  isHealthy: boolean;
  lastCheck: number;
  issues: string[];
  corruption: boolean;
  syncDrift: boolean;
}

/**
 * Fort Knox State Manager
 * Provides atomic operations, validation, and recovery for state management
 */
export class StateManager {
  private static instance: StateManager | null = null;
  private snapshots = new Map<string, StateSnapshot[]>();
  private operations = new Map<string, StateOperation>();
  private operationQueue: StateOperation[] = [];
  private isProcessing = false;
  private operationLock: string | null = null;
  private health: StateHealth = {
    isHealthy: true,
    lastCheck: Date.now(),
    issues: [],
    corruption: false,
    syncDrift: false
  };

  static getInstance(): StateManager {
    if (!this.instance) {
      this.instance = new StateManager();
    }
    return this.instance;
  }

  /**
   * Layer 1: State Validation
   */
  private validateContent(content: Block[]): boolean {
    if (!Array.isArray(content)) {
      console.error('StateManager: Content is not an array');
      return false;
    }

    for (const block of content) {
      if (!block || typeof block !== 'object' || !block.id || !block.type) {
        console.error('StateManager: Invalid block structure', block);
        return false;
      }
    }

    return true;
  }

  private calculateChecksum(content: Block[]): string {
    const contentStr = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private createSnapshot(noteId: string, content: Block[]): StateSnapshot {
    const existing = this.snapshots.get(noteId) || [];
    const version = existing.length > 0 ? existing[existing.length - 1].version + 1 : 1;
    
    return {
      noteId,
      content: [...content],
      timestamp: Date.now(),
      checksum: this.calculateChecksum(content),
      version
    };
  }

  /**
   * Layer 2: Atomic Operations
   */
  private async acquireOperationLock(operationId: string): Promise<boolean> {
    if (this.operationLock) {
      console.warn(`StateManager: Operation ${operationId} blocked by lock ${this.operationLock}`);
      return false;
    }
    
    this.operationLock = operationId;
    console.log(`StateManager: Acquired lock for operation ${operationId}`);
    return true;
  }

  private releaseOperationLock(operationId: string): void {
    if (this.operationLock === operationId) {
      this.operationLock = null;
      console.log(`StateManager: Released lock for operation ${operationId}`);
      this.processOperationQueue();
    }
  }

  private async processOperationQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.operationQueue.length > 0 && !this.operationLock) {
      const operation = this.operationQueue.shift();
      if (operation) {
        await this.executeOperation(operation);
      }
    }
    
    this.isProcessing = false;
  }

  private async executeOperation(operation: StateOperation): Promise<boolean> {
    try {
      operation.status = 'pending';
      this.operations.set(operation.id, operation);
      
      console.log(`StateManager: Executing operation ${operation.type} for note ${operation.noteId}`);
      
      // Execute based on operation type
      switch (operation.type) {
        case 'load':
          return await this.executeLoadOperation(operation);
        case 'save':
          return await this.executeSaveOperation(operation);
        case 'switch':
          return await this.executeSwitchOperation(operation);
        case 'update':
          return await this.executeUpdateOperation(operation);
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      console.error(`StateManager: Operation ${operation.id} failed`, error);
      operation.status = 'failed';
      await this.rollbackOperation(operation);
      return false;
    }
  }

  /**
   * Layer 3: Content-State Synchronization
   */
  private async validateSync(noteId: string): Promise<boolean> {
    const bufferContent = cursorStabilityManager.getBuffer(noteId);
    const snapshot = this.getLatestSnapshot(noteId);
    
    if (!bufferContent && !snapshot) return true;
    if (!bufferContent || !snapshot) {
      console.warn(`StateManager: Sync validation failed - missing buffer or snapshot for note ${noteId}`);
      return false;
    }
    
    const bufferChecksum = this.calculateChecksum(bufferContent);
    const snapshotChecksum = snapshot.checksum;
    
    if (bufferChecksum !== snapshotChecksum) {
      console.error(`StateManager: Sync drift detected for note ${noteId}`);
      this.health.syncDrift = true;
      await this.recoverFromSyncDrift(noteId, bufferContent, snapshot);
      return false;
    }
    
    return true;
  }

  private async recoverFromSyncDrift(noteId: string, bufferContent: Block[], snapshot: StateSnapshot): Promise<void> {
    console.warn(`StateManager: Recovering from sync drift for note ${noteId}`);
    
    // Buffer is more recent - use buffer content
    const bufferTime = Date.now(); // Buffer doesn't have timestamp, assume current
    const snapshotTime = snapshot.timestamp;
    
    if (bufferTime > snapshotTime + 1000) { // Buffer is newer by more than 1 second
      console.log(`StateManager: Using buffer content as source of truth for note ${noteId}`);
      await this.saveSnapshot(noteId, bufferContent);
    } else {
      console.log(`StateManager: Using snapshot content as source of truth for note ${noteId}`);
      await cursorStabilityManager.setBuffer(noteId, snapshot.content);
    }
    
    this.health.syncDrift = false;
  }

  /**
   * Layer 4: Operation Implementations
   */
  private async executeLoadOperation(operation: StateOperation): Promise<boolean> {
    if (!await this.acquireOperationLock(operation.id)) {
      this.operationQueue.push(operation);
      return false;
    }

    try {
      const snapshot = this.getLatestSnapshot(operation.noteId);
      if (snapshot) {
        await cursorStabilityManager.setBuffer(operation.noteId, snapshot.content);
        console.log(`StateManager: Loaded content for note ${operation.noteId} from snapshot v${snapshot.version}`);
      }
      
      operation.status = 'success';
      return true;
    } finally {
      this.releaseOperationLock(operation.id);
    }
  }

  private async executeSaveOperation(operation: StateOperation): Promise<boolean> {
    if (!await this.acquireOperationLock(operation.id)) {
      this.operationQueue.push(operation);
      return false;
    }

    try {
      const content = operation.data as Block[];
      if (!this.validateContent(content)) {
        throw new Error('Invalid content structure');
      }

      await this.saveSnapshot(operation.noteId, content);
      await cursorStabilityManager.setBuffer(operation.noteId, content);
      
      operation.status = 'success';
      console.log(`StateManager: Saved content for note ${operation.noteId}`);
      return true;
    } finally {
      this.releaseOperationLock(operation.id);
    }
  }

  private async executeSwitchOperation(operation: StateOperation): Promise<boolean> {
    if (!await this.acquireOperationLock(operation.id)) {
      this.operationQueue.push(operation);
      return false;
    }

    try {
      const { fromNoteId, toNoteId } = operation.data;
      
      // Save current state before switching
      if (fromNoteId) {
        const bufferContent = cursorStabilityManager.getBuffer(fromNoteId);
        if (bufferContent) {
          await this.saveSnapshot(fromNoteId, bufferContent);
        }
      }
      
      // Load new state
      const snapshot = this.getLatestSnapshot(toNoteId);
      if (snapshot) {
        await cursorStabilityManager.setBuffer(toNoteId, snapshot.content);
      }
      
      operation.status = 'success';
      console.log(`StateManager: Switched from note ${fromNoteId} to ${toNoteId}`);
      return true;
    } finally {
      this.releaseOperationLock(operation.id);
    }
  }

  private async executeUpdateOperation(operation: StateOperation): Promise<boolean> {
    if (!await this.acquireOperationLock(operation.id)) {
      this.operationQueue.push(operation);
      return false;
    }

    try {
      const content = operation.data as Block[];
      if (!this.validateContent(content)) {
        throw new Error('Invalid content structure');
      }

      // Validate sync before update
      if (!await this.validateSync(operation.noteId)) {
        throw new Error('Sync validation failed');
      }

      await this.saveSnapshot(operation.noteId, content);
      operation.status = 'success';
      return true;
    } finally {
      this.releaseOperationLock(operation.id);
    }
  }

  private async rollbackOperation(operation: StateOperation): Promise<void> {
    console.warn(`StateManager: Rolling back operation ${operation.id}`);
    operation.status = 'rollback';
    
    // Attempt to restore from previous snapshot
    const snapshots = this.snapshots.get(operation.noteId);
    if (snapshots && snapshots.length > 1) {
      const previousSnapshot = snapshots[snapshots.length - 2];
      await cursorStabilityManager.setBuffer(operation.noteId, previousSnapshot.content);
      console.log(`StateManager: Restored note ${operation.noteId} to snapshot v${previousSnapshot.version}`);
    }
  }

  /**
   * Layer 5: Snapshot Management
   */
  private async saveSnapshot(noteId: string, content: Block[]): Promise<void> {
    const snapshot = this.createSnapshot(noteId, content);
    const existing = this.snapshots.get(noteId) || [];
    
    // Keep only last 10 snapshots per note
    const updated = [...existing, snapshot].slice(-10);
    this.snapshots.set(noteId, updated);
    
    console.log(`StateManager: Saved snapshot v${snapshot.version} for note ${noteId}`);
  }

  private getLatestSnapshot(noteId: string): StateSnapshot | null {
    const snapshots = this.snapshots.get(noteId);
    return snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  /**
   * Layer 6: Health Monitoring
   */
  private updateHealth(): void {
    this.health.lastCheck = Date.now();
    this.health.issues = [];
    
    // Check for stuck operations
    const now = Date.now();
    for (const [id, operation] of this.operations) {
      if (operation.status === 'pending' && now - operation.timestamp > 30000) {
        this.health.issues.push(`Stuck operation: ${id}`);
      }
    }
    
    // Check for operation lock timeout
    if (this.operationLock) {
      const lockAge = now - (this.operations.get(this.operationLock)?.timestamp || now);
      if (lockAge > 30000) {
        this.health.issues.push('Operation lock timeout');
        this.operationLock = null; // Force unlock
      }
    }
    
    this.health.isHealthy = this.health.issues.length === 0 && !this.health.corruption && !this.health.syncDrift;
  }

  /**
   * Public API
   */
  async loadNote(noteId: string): Promise<boolean> {
    const operation: StateOperation = {
      id: `load-${noteId}-${Date.now()}`,
      type: 'load',
      noteId,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    return await this.executeOperation(operation);
  }

  async saveNote(noteId: string, content: Block[]): Promise<boolean> {
    const operation: StateOperation = {
      id: `save-${noteId}-${Date.now()}`,
      type: 'save',
      noteId,
      timestamp: Date.now(),
      status: 'pending',
      data: content
    };
    
    return await this.executeOperation(operation);
  }

  async switchNote(fromNoteId: string | null, toNoteId: string): Promise<boolean> {
    const operation: StateOperation = {
      id: `switch-${toNoteId}-${Date.now()}`,
      type: 'switch',
      noteId: toNoteId,
      timestamp: Date.now(),
      status: 'pending',
      data: { fromNoteId, toNoteId }
    };
    
    return await this.executeOperation(operation);
  }

  async updateNote(noteId: string, content: Block[]): Promise<boolean> {
    const operation: StateOperation = {
      id: `update-${noteId}-${Date.now()}`,
      type: 'update',
      noteId,
      timestamp: Date.now(),
      status: 'pending',
      data: content
    };
    
    return await this.executeOperation(operation);
  }

  getHealth(): StateHealth {
    this.updateHealth();
    return { ...this.health };
  }

  getDiagnostics() {
    return {
      snapshotCount: Array.from(this.snapshots.values()).reduce((total, snapshots) => total + snapshots.length, 0),
      operationCount: this.operations.size,
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      operationLock: this.operationLock,
      health: this.getHealth()
    };
  }

  emergencyReset(): void {
    console.warn('StateManager: Emergency reset triggered');
    this.snapshots.clear();
    this.operations.clear();
    this.operationQueue.length = 0;
    this.isProcessing = false;
    this.operationLock = null;
    this.health = {
      isHealthy: true,
      lastCheck: Date.now(),
      issues: [],
      corruption: false,
      syncDrift: false
    };
    
    // Also reset cursor stability manager
    cursorStabilityManager.emergencyReset();
  }
}

export const stateManager = StateManager.getInstance();
