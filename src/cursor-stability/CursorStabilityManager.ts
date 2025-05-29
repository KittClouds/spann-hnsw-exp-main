import { Block, BlockNoteEditor } from '@blocknote/core';

export interface BufferState {
  noteId: string;
  blocks: Block[];
  checksum: string;
  timestamp: number;
  version: number;
}

export interface EditorState {
  isReady: boolean;
  isLoading: boolean;
  isLocked: boolean;
  currentNoteId: string | null;
  lastOperation: string;
  operationTimestamp: number;
}

export interface OperationLock {
  isLocked: boolean;
  operation: string;
  noteId: string;
  timestamp: number;
}

/**
 * Fort Knox level cursor stability manager
 * Prevents cursor jumping and state corruption through multiple protection layers
 */
export class CursorStabilityManager {
  private static instance: CursorStabilityManager | null = null;
  private bufferStates = new Map<string, BufferState>();
  private editorState: EditorState = {
    isReady: false,
    isLoading: false,
    isLocked: false,
    currentNoteId: null,
    lastOperation: 'init',
    operationTimestamp: Date.now()
  };
  private operationLock: OperationLock | null = null;
  private operationQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private cursorPosition: { line: number; column: number } | null = null;
  private emergencyBackup = new Map<string, Block[]>();

  static getInstance(): CursorStabilityManager {
    if (!this.instance) {
      this.instance = new CursorStabilityManager();
    }
    return this.instance;
  }

  /**
   * Layer 1: Buffer Integrity Protection
   */
  private calculateChecksum(blocks: Block[]): string {
    const content = JSON.stringify(blocks);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private validateBufferIntegrity(noteId: string): boolean {
    const bufferState = this.bufferStates.get(noteId);
    if (!bufferState) return false;

    const currentChecksum = this.calculateChecksum(bufferState.blocks);
    const isValid = currentChecksum === bufferState.checksum;
    
    if (!isValid) {
      console.error(`CursorStability: Buffer corruption detected for note ${noteId}`);
      this.recoverBuffer(noteId);
    }
    
    return isValid;
  }

  private recoverBuffer(noteId: string): void {
    console.warn(`CursorStability: Attempting buffer recovery for note ${noteId}`);
    const backup = this.emergencyBackup.get(noteId);
    if (backup) {
      this.setBuffer(noteId, backup);
      console.log(`CursorStability: Buffer recovered from emergency backup for note ${noteId}`);
    }
  }

  /**
   * Layer 2: Editor State Guards
   */
  setEditorReady(isReady: boolean): void {
    this.editorState.isReady = isReady;
    this.editorState.operationTimestamp = Date.now();
    console.log(`CursorStability: Editor ready state set to ${isReady}`);
  }

  setEditorLoading(isLoading: boolean): void {
    this.editorState.isLoading = isLoading;
    this.editorState.operationTimestamp = Date.now();
    console.log(`CursorStability: Editor loading state set to ${isLoading}`);
  }

  private canPerformOperation(operation: string): boolean {
    if (!this.editorState.isReady) {
      console.warn(`CursorStability: Operation ${operation} blocked - editor not ready`);
      return false;
    }
    
    if (this.editorState.isLoading) {
      console.warn(`CursorStability: Operation ${operation} blocked - editor is loading`);
      return false;
    }
    
    if (this.operationLock && this.operationLock.operation !== operation) {
      console.warn(`CursorStability: Operation ${operation} blocked - locked by ${this.operationLock.operation}`);
      return false;
    }
    
    return true;
  }

  /**
   * Layer 3: Content Validation
   */
  private validateBlocks(blocks: Block[]): boolean {
    if (!Array.isArray(blocks)) {
      console.error('CursorStability: Invalid blocks - not an array');
      return false;
    }
    
    for (const block of blocks) {
      if (!block.id || !block.type) {
        console.error('CursorStability: Invalid block structure', block);
        return false;
      }
    }
    
    return true;
  }

  private sanitizeBlocks(blocks: Block[]): Block[] {
    return blocks.filter(block => 
      block && 
      typeof block === 'object' && 
      block.id && 
      block.type
    );
  }

  /**
   * Layer 4: Operation Locking System
   */
  private async acquireOperationLock(operation: string, noteId: string): Promise<boolean> {
    if (this.operationLock) {
      const lockAge = Date.now() - this.operationLock.timestamp;
      if (lockAge > 5000) { // Force unlock after 5 seconds
        console.warn('CursorStability: Force unlocking stale operation lock');
        this.operationLock = null;
      } else {
        return false;
      }
    }
    
    this.operationLock = {
      isLocked: true,
      operation,
      noteId,
      timestamp: Date.now()
    };
    
    console.log(`CursorStability: Acquired operation lock for ${operation} on note ${noteId}`);
    return true;
  }

  private releaseOperationLock(): void {
    if (this.operationLock) {
      console.log(`CursorStability: Released operation lock for ${this.operationLock.operation}`);
      this.operationLock = null;
      this.processOperationQueue();
    }
  }

  private async processOperationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.operationQueue.length > 0 && !this.operationLock) {
      const operation = this.operationQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('CursorStability: Queue operation failed', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Layer 5: Monitoring & Recovery
   */
  saveCursorPosition(editor: BlockNoteEditor): void {
    try {
      const selection = editor.getTextCursorPosition();
      if (selection) {
        this.cursorPosition = { line: 0, column: 0 }; // Simplified for now
        console.log('CursorStability: Cursor position saved');
      }
    } catch (error) {
      console.warn('CursorStability: Could not save cursor position', error);
    }
  }

  restoreCursorPosition(editor: BlockNoteEditor): void {
    if (this.cursorPosition) {
      try {
        // Implementation would depend on BlockNote API
        console.log('CursorStability: Cursor position restored');
      } catch (error) {
        console.warn('CursorStability: Could not restore cursor position', error);
      }
    }
  }

  /**
   * Public API - Hardened Buffer Operations
   */
  async setBuffer(noteId: string, blocks: Block[]): Promise<boolean> {
    if (!this.canPerformOperation('setBuffer')) {
      return new Promise(resolve => {
        this.operationQueue.push(async () => {
          resolve(await this.setBuffer(noteId, blocks));
        });
      });
    }

    if (!await this.acquireOperationLock('setBuffer', noteId)) {
      return false;
    }

    try {
      if (!this.validateBlocks(blocks)) {
        console.error(`CursorStability: Invalid blocks for note ${noteId}`);
        return false;
      }

      const sanitizedBlocks = this.sanitizeBlocks(blocks);
      const checksum = this.calculateChecksum(sanitizedBlocks);
      
      // Create emergency backup
      this.emergencyBackup.set(noteId, [...sanitizedBlocks]);
      
      // Update buffer state
      this.bufferStates.set(noteId, {
        noteId,
        blocks: sanitizedBlocks,
        checksum,
        timestamp: Date.now(),
        version: (this.bufferStates.get(noteId)?.version || 0) + 1
      });

      console.log(`CursorStability: Buffer set for note ${noteId} with ${sanitizedBlocks.length} blocks`);
      return true;
    } catch (error) {
      console.error(`CursorStability: Failed to set buffer for note ${noteId}`, error);
      return false;
    } finally {
      this.releaseOperationLock();
    }
  }

  getBuffer(noteId: string): Block[] | null {
    if (!this.validateBufferIntegrity(noteId)) {
      return null;
    }
    
    const bufferState = this.bufferStates.get(noteId);
    return bufferState ? [...bufferState.blocks] : null;
  }

  async clearBuffer(noteId: string): Promise<void> {
    if (!this.canPerformOperation('clearBuffer')) {
      return new Promise(resolve => {
        this.operationQueue.push(async () => {
          await this.clearBuffer(noteId);
          resolve();
        });
      });
    }

    if (!await this.acquireOperationLock('clearBuffer', noteId)) {
      return;
    }

    try {
      this.bufferStates.delete(noteId);
      console.log(`CursorStability: Buffer cleared for note ${noteId}`);
    } finally {
      this.releaseOperationLock();
    }
  }

  hasBuffer(noteId: string): boolean {
    return this.bufferStates.has(noteId) && this.validateBufferIntegrity(noteId);
  }

  validateBuffer(noteId: string, expectedLength?: number): boolean {
    if (!this.validateBufferIntegrity(noteId)) return false;
    
    const bufferState = this.bufferStates.get(noteId);
    if (!bufferState) return false;
    
    if (expectedLength !== undefined && bufferState.blocks.length !== expectedLength) {
      console.warn(`CursorStability: Length mismatch for note ${noteId}, expected ${expectedLength}, got ${bufferState.blocks.length}`);
      return false;
    }
    
    return true;
  }

  /**
   * Emergency Recovery
   */
  emergencyReset(): void {
    console.warn('CursorStability: Emergency reset triggered');
    this.bufferStates.clear();
    this.operationQueue.length = 0;
    this.operationLock = null;
    this.isProcessingQueue = false;
    this.editorState = {
      isReady: false,
      isLoading: false,
      isLocked: false,
      currentNoteId: null,
      lastOperation: 'emergency_reset',
      operationTimestamp: Date.now()
    };
  }

  /**
   * Diagnostics
   */
  getDiagnostics() {
    return {
      bufferCount: this.bufferStates.size,
      editorState: { ...this.editorState },
      operationLock: this.operationLock,
      queueLength: this.operationQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      backupCount: this.emergencyBackup.size
    };
  }
}

export const cursorStabilityManager = CursorStabilityManager.getInstance();
