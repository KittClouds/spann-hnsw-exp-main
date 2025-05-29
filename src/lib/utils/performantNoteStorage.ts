
import { Note } from '@/lib/store';
import { enhancedJSONManager } from '@/json-manager/EnhancedJSONManager';
import { optimizedJSON } from '@/json-manager/utils/OptimizedOperations';

/**
 * Performant note storage using Fort Knox JSON Management with optimization
 */
export const performantNoteStorage = {
  /**
   * Save a note with automatic optimization
   */
  async saveNote(note: Note): Promise<boolean> {
    try {
      const result = await optimizedJSON.smartSerialize('note', note, {
        preferCompression: true,
        sizeThreshold: 5000
      });
      
      let storageData: string;
      if (typeof result.result === 'string') {
        storageData = JSON.stringify({
          data: result.result,
          strategy: result.strategy,
          metadata: result.metadata
        });
      } else {
        // Handle streaming case - convert to string for localStorage
        const reader = result.result.getReader();
        const chunks: string[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        storageData = JSON.stringify({
          data: chunks.join(''),
          strategy: result.strategy,
          metadata: result.metadata
        });
      }
      
      localStorage.setItem(`perf-note-${note.id}`, storageData);
      console.log(`performantNoteStorage: Saved note ${note.id} using ${result.strategy} strategy`);
      return true;
    } catch (error) {
      console.error('performantNoteStorage: Failed to save note:', error);
      return false;
    }
  },

  /**
   * Load a note with automatic optimization detection
   */
  async loadNote(noteId: string): Promise<Note | null> {
    try {
      const storedData = localStorage.getItem(`perf-note-${noteId}`);
      if (!storedData) return null;
      
      const parsed = JSON.parse(storedData);
      const { data, strategy, metadata } = parsed;
      
      let deserializeOptions: any = { useCache: true };
      
      if (strategy === 'compressed') {
        deserializeOptions.compressed = true;
      } else if (strategy === 'streamed') {
        deserializeOptions.lazyLoad = true;
      }
      
      const result = await enhancedJSONManager.enhancedDeserialize<Note>(
        'note',
        data,
        deserializeOptions
      );
      
      console.log(`performantNoteStorage: Loaded note ${noteId} (${strategy}, cached: ${result.cached})`);
      return result.result;
    } catch (error) {
      console.error('performantNoteStorage: Failed to load note:', error);
      return null;
    }
  },

  /**
   * Bulk save notes with optimization
   */
  async bulkSaveNotes(notes: Note[]): Promise<{ success: number; failed: number }> {
    const operations = notes.map(note => ({
      type: 'serialize' as const,
      dataType: 'note',
      data: note,
      priority: 'normal' as const
    }));
    
    const results = await optimizedJSON.bulkProcess(operations);
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const note = notes[i];
      
      if (result.success) {
        try {
          localStorage.setItem(`perf-note-${note.id}`, JSON.stringify({
            data: result.result,
            strategy: 'bulk',
            metadata: result.metadata
          }));
          success++;
        } catch {
          failed++;
        }
      } else {
        failed++;
      }
    }
    
    console.log(`performantNoteStorage: Bulk saved ${success} notes, ${failed} failed`);
    return { success, failed };
  },

  /**
   * Get storage performance statistics
   */
  getStorageStats(): {
    totalNotes: number;
    totalSize: number;
    compressionRatio: number;
    cacheStats: any;
    performanceMetrics: any;
  } {
    const noteIds = this.getAllNoteIds();
    let totalSize = 0;
    let compressedSize = 0;
    
    for (const noteId of noteIds) {
      const data = localStorage.getItem(`perf-note-${noteId}`);
      if (data) {
        totalSize += data.length;
        try {
          const parsed = JSON.parse(data);
          if (parsed.metadata?.compressionRatio) {
            compressedSize += data.length / parsed.metadata.compressionRatio;
          }
        } catch {
          // Ignore parsing errors for stats
        }
      }
    }
    
    const diagnostics = enhancedJSONManager.getPerformanceDiagnostics();
    
    return {
      totalNotes: noteIds.length,
      totalSize,
      compressionRatio: compressedSize > 0 ? totalSize / compressedSize : 1,
      cacheStats: diagnostics.cache,
      performanceMetrics: diagnostics.performance
    };
  },

  /**
   * Optimize storage for all notes
   */
  async optimizeStorage(): Promise<{ optimized: number; errors: number }> {
    const noteIds = this.getAllNoteIds();
    let optimized = 0;
    let errors = 0;
    
    for (const noteId of noteIds) {
      try {
        const note = await this.loadNote(noteId);
        if (note) {
          const success = await this.saveNote(note);
          if (success) {
            optimized++;
          } else {
            errors++;
          }
        }
      } catch {
        errors++;
      }
    }
    
    // Run performance optimization
    enhancedJSONManager.optimizePerformance();
    
    console.log(`performantNoteStorage: Optimized ${optimized} notes, ${errors} errors`);
    return { optimized, errors };
  },

  /**
   * Delete a note from storage
   */
  deleteNote(noteId: string): boolean {
    try {
      localStorage.removeItem(`perf-note-${noteId}`);
      console.log(`performantNoteStorage: Deleted note ${noteId}`);
      return true;
    } catch (error) {
      console.error('performantNoteStorage: Failed to delete note:', error);
      return false;
    }
  },
  
  /**
   * Get all note IDs from storage
   */
  getAllNoteIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf-note-')) {
        ids.push(key.substring(10));
      }
    }
    return ids;
  }
};
