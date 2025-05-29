
import { useCallback, useRef, useEffect } from 'react';
import { Block, BlockNoteEditor } from '@blocknote/core';
import { cursorStabilityManager } from './CursorStabilityManager';

/**
 * Fort Knox level hardened editor buffer hook
 * Replaces the original useEditorBuffer with comprehensive protection
 */
export function useHardenedEditorBuffer() {
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize cursor stability protection
  useEffect(() => {
    if (!isInitializedRef.current) {
      cursorStabilityManager.setEditorReady(false);
      isInitializedRef.current = true;
    }
  }, []);

  const setEditor = useCallback((editor: BlockNoteEditor | null) => {
    editorRef.current = editor;
    if (editor) {
      cursorStabilityManager.setEditorReady(true);
      console.log('CursorStability: Editor instance registered');
    } else {
      cursorStabilityManager.setEditorReady(false);
      console.log('CursorStability: Editor instance unregistered');
    }
  }, []);

  const setBuffer = useCallback(async (noteId: string, blocks: Block[]) => {
    console.log('HardenedBuffer: Setting buffer for note', noteId, 'with', blocks.length, 'blocks');
    
    // Save cursor position before buffer change
    if (editorRef.current) {
      cursorStabilityManager.saveCursorPosition(editorRef.current);
    }
    
    const success = await cursorStabilityManager.setBuffer(noteId, blocks);
    if (!success) {
      console.error('HardenedBuffer: Failed to set buffer, attempting recovery');
      // Could trigger emergency protocols here
    }
    
    return success;
  }, []);

  const getBuffer = useCallback((noteId: string): Block[] | undefined => {
    const buffer = cursorStabilityManager.getBuffer(noteId);
    console.log('HardenedBuffer: Getting buffer for note', noteId, 'found', buffer?.length || 0, 'blocks');
    return buffer || undefined;
  }, []);

  const clearBuffer = useCallback(async (noteId: string) => {
    console.log('HardenedBuffer: Clearing buffer for note', noteId);
    await cursorStabilityManager.clearBuffer(noteId);
  }, []);

  const clearAllBuffers = useCallback(async () => {
    console.log('HardenedBuffer: Emergency clear all buffers');
    cursorStabilityManager.emergencyReset();
  }, []);

  const hasBuffer = useCallback((noteId: string): boolean => {
    return cursorStabilityManager.hasBuffer(noteId);
  }, []);

  const validateBuffer = useCallback((noteId: string, expectedLength?: number): boolean => {
    return cursorStabilityManager.validateBuffer(noteId, expectedLength);
  }, []);

  const setEditorLoading = useCallback((isLoading: boolean) => {
    cursorStabilityManager.setEditorLoading(isLoading);
  }, []);

  const restoreCursor = useCallback(() => {
    if (editorRef.current) {
      cursorStabilityManager.restoreCursorPosition(editorRef.current);
    }
  }, []);

  const getDiagnostics = useCallback(() => {
    return cursorStabilityManager.getDiagnostics();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitializedRef.current) {
        cursorStabilityManager.setEditorReady(false);
      }
    };
  }, []);

  return {
    setEditor,
    setBuffer,
    getBuffer,
    clearBuffer,
    clearAllBuffers,
    hasBuffer,
    validateBuffer,
    setEditorLoading,
    restoreCursor,
    getDiagnostics
  };
}
