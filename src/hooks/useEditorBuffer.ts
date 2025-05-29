
import { atom, createStore } from 'jotai';
import { Block } from '@blocknote/core';

// Create isolated Jotai store outside React's render cycle
export const editorBufferStore = createStore();

// Buffer atom keyed by noteId -> blocks
const bufferAtom = atom<Record<string, Block[]>>({});

// Helper functions that don't trigger renders
export const setBuffer = (noteId: string, blocks: Block[]) => {
  console.log('Buffer: Setting buffer for note', noteId, 'with', blocks.length, 'blocks');
  editorBufferStore.set(bufferAtom, (prev) => ({ ...prev, [noteId]: blocks }));
};

export const getBuffer = (noteId: string): Block[] | undefined => {
  const buffer = editorBufferStore.get(bufferAtom)[noteId];
  console.log('Buffer: Getting buffer for note', noteId, 'found', buffer?.length || 0, 'blocks');
  return buffer;
};

export const clearBuffer = (noteId: string) => {
  console.log('Buffer: Clearing buffer for note', noteId);
  editorBufferStore.set(bufferAtom, (prev) => {
    const { [noteId]: _, ...rest } = prev;
    return rest;
  });
};

export const clearAllBuffers = () => {
  console.log('Buffer: Clearing all buffers');
  editorBufferStore.set(bufferAtom, {});
};

export const hasBuffer = (noteId: string): boolean => {
  const buffer = editorBufferStore.get(bufferAtom)[noteId];
  return buffer !== undefined && buffer.length > 0;
};

export const validateBuffer = (noteId: string, expectedLength?: number): boolean => {
  const buffer = getBuffer(noteId);
  if (!buffer) return false;
  if (expectedLength !== undefined && buffer.length !== expectedLength) {
    console.warn('Buffer: Length mismatch for note', noteId, 'expected', expectedLength, 'got', buffer.length);
    return false;
  }
  return true;
};
