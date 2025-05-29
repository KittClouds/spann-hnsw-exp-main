
import { useCallback, useRef, useEffect } from 'react';
import { Block, BlockNoteEditor } from '@blocknote/core';
import { stateManager } from './StateManager';
import { stateValidator } from './StateValidator';
import { stateMonitor } from './StateMonitor';
import { cursorStabilityManager } from './CursorStabilityManager';

/**
 * Fort Knox hardened state management hook
 * Integrates all protection layers for bulletproof state management
 */
export function useHardenedState() {
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const currentNoteIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize monitoring and protection systems
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('HardenedState: Initializing Fort Knox state protection');
      
      // Start monitoring
      stateMonitor.startMonitoring();
      
      // Initialize cursor stability
      cursorStabilityManager.setEditorReady(false);
      
      isInitializedRef.current = true;
    }

    return () => {
      if (isInitializedRef.current) {
        stateMonitor.stopMonitoring();
        cursorStabilityManager.setEditorReady(false);
      }
    };
  }, []);

  const setEditor = useCallback((editor: BlockNoteEditor | null) => {
    console.log('HardenedState: Setting editor instance');
    editorRef.current = editor;
    cursorStabilityManager.setEditorReady(!!editor);
  }, []);

  const loadNote = useCallback(async (noteId: string, fallbackContent: Block[]) => {
    console.log('HardenedState: Loading note', noteId);
    const startTime = Date.now();
    
    try {
      // Validate fallback content
      const validation = stateValidator.validateContent(fallbackContent);
      if (!validation.isValid) {
        console.warn('HardenedState: Invalid fallback content, sanitizing');
        fallbackContent = stateValidator.sanitizeContent(fallbackContent);
      }
      
      // Attempt to load from state manager
      const success = await stateManager.loadNote(noteId);
      
      if (!success) {
        console.warn('HardenedState: State manager load failed, using fallback');
        await stateManager.saveNote(noteId, fallbackContent);
      }
      
      // Get final content from buffer
      const content = cursorStabilityManager.getBuffer(noteId) || fallbackContent;
      
      // Record operation performance
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, success);
      
      console.log('HardenedState: Note loaded successfully', noteId);
      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, false);
      
      console.error('HardenedState: Failed to load note', noteId, error);
      
      // Emergency fallback
      await cursorStabilityManager.setBuffer(noteId, fallbackContent);
      return fallbackContent;
    }
  }, []);

  const saveNote = useCallback(async (noteId: string, content: Block[]): Promise<boolean> => {
    console.log('HardenedState: Saving note', noteId);
    const startTime = Date.now();
    
    try {
      // Validate content before saving
      const validation = stateValidator.validateContent(content);
      if (!validation.isValid) {
        console.warn('HardenedState: Invalid content detected, attempting to sanitize');
        content = stateValidator.sanitizeContent(content);
      }
      
      // Save through state manager
      const success = await stateManager.saveNote(noteId, content);
      
      // Record operation performance
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, success);
      
      if (success) {
        console.log('HardenedState: Note saved successfully', noteId);
      } else {
        console.error('HardenedState: Failed to save note', noteId);
      }
      
      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, false);
      
      console.error('HardenedState: Save operation failed', noteId, error);
      return false;
    }
  }, []);

  const switchNote = useCallback(async (fromNoteId: string | null, toNoteId: string): Promise<boolean> => {
    console.log('HardenedState: Switching notes', fromNoteId, '->', toNoteId);
    const startTime = Date.now();
    
    try {
      // Save cursor position before switch
      if (editorRef.current) {
        cursorStabilityManager.saveCursorPosition(editorRef.current);
      }
      
      // Perform atomic switch operation
      const success = await stateManager.switchNote(fromNoteId, toNoteId);
      
      // Update current note reference
      currentNoteIdRef.current = toNoteId;
      
      // Record operation performance
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, success);
      
      if (success) {
        console.log('HardenedState: Note switch completed successfully');
        
        // Restore cursor position after switch
        setTimeout(() => {
          if (editorRef.current) {
            cursorStabilityManager.restoreCursorPosition(editorRef.current);
          }
        }, 100);
      } else {
        console.error('HardenedState: Note switch failed');
      }
      
      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, false);
      
      console.error('HardenedState: Switch operation failed', error);
      return false;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, content: Block[]): Promise<boolean> => {
    console.log('HardenedState: Updating note', noteId);
    const startTime = Date.now();
    
    try {
      // Validate content
      const validation = stateValidator.validateContent(content);
      if (!validation.isValid) {
        console.warn('HardenedState: Invalid update content, sanitizing');
        content = stateValidator.sanitizeContent(content);
      }
      
      // Update through state manager
      const success = await stateManager.updateNote(noteId, content);
      
      // Record operation performance
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, success);
      
      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      stateMonitor.recordOperation(duration, false);
      
      console.error('HardenedState: Update operation failed', noteId, error);
      return false;
    }
  }, []);

  const validateState = useCallback((noteId: string): boolean => {
    try {
      const bufferContent = cursorStabilityManager.getBuffer(noteId);
      if (!bufferContent) return true; // No content is valid
      
      const validation = stateValidator.validateContent(bufferContent);
      return validation.isValid;
    } catch (error) {
      console.error('HardenedState: State validation failed', noteId, error);
      return false;
    }
  }, []);

  const getHealthMetrics = useCallback(() => {
    return {
      stateHealth: stateManager.getHealth(),
      monitorMetrics: stateMonitor.getMetrics(),
      alerts: stateMonitor.getAlerts(),
      cursorDiagnostics: cursorStabilityManager.getDiagnostics()
    };
  }, []);

  const emergencyRecovery = useCallback(() => {
    console.warn('HardenedState: Initiating emergency recovery');
    
    // Reset all systems
    stateManager.emergencyReset();
    cursorStabilityManager.emergencyReset();
    
    // Force health check
    stateMonitor.forceHealthCheck();
    
    console.log('HardenedState: Emergency recovery completed');
  }, []);

  const getCurrentNoteId = useCallback((): string | null => {
    return currentNoteIdRef.current;
  }, []);

  return {
    // Core operations
    setEditor,
    loadNote,
    saveNote,
    switchNote,
    updateNote,
    
    // Validation and health
    validateState,
    getHealthMetrics,
    
    // Recovery
    emergencyRecovery,
    
    // Utilities
    getCurrentNoteId
  };
}
