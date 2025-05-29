
import { atom, createStore } from 'jotai';
import { Block } from '@blocknote/core';

// Create isolated Jotai store outside React's render cycle
export const editorBufferStore = createStore();

// Buffer atom keyed by noteId -> blocks
const bufferAtom = atom<Record<string, Block[]>>({});

// Helper functions that don't trigger renders
export const setBuffer = (noteId: string, blocks: Block[]) => {
  console.log("EditorBuffer: Setting buffer for note", noteId, "with", blocks.length, "blocks");
  editorBufferStore.set(bufferAtom, (prev) => ({ ...prev, [noteId]: blocks }));
};

export const getBuffer = (noteId: string): Block[] | undefined => {
  const buffer = editorBufferStore.get(bufferAtom)[noteId];
  console.log("EditorBuffer: Getting buffer for note", noteId, "found:", buffer ? buffer.length + " blocks" : "none");
  return buffer;
};

export const clearBuffer = (noteId: string) => {
  console.log("EditorBuffer: Clearing buffer for note", noteId);
  editorBufferStore.set(bufferAtom, (prev) => {
    const { [noteId]: _, ...rest } = prev;
    return rest;
  });
};

export const clearAllBuffers = () => {
  console.log("EditorBuffer: Clearing all buffers");
  editorBufferStore.set(bufferAtom, {});
};

// Debug helper to see all buffer states
export const getAllBuffers = () => {
  const buffers = editorBufferStore.get(bufferAtom);
  console.log("EditorBuffer: All buffers:", Object.keys(buffers).map(noteId => ({ 
    noteId, 
    blockCount: buffers[noteId]?.length || 0 
  })));
  return buffers;
};
