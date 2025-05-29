
import { atom, createStore } from 'jotai';
import { Block } from '@blocknote/core';

// Create isolated Jotai store outside React's render cycle
export const editorBufferStore = createStore();

// Buffer atom keyed by noteId -> blocks
const bufferAtom = atom<Record<string, Block[]>>({});

// Helper functions that don't trigger renders
export const setBuffer = (noteId: string, blocks: Block[]) => {
  editorBufferStore.set(bufferAtom, (prev) => ({ ...prev, [noteId]: blocks }));
};

export const getBuffer = (noteId: string): Block[] | undefined => {
  return editorBufferStore.get(bufferAtom)[noteId];
};

export const clearBuffer = (noteId: string) => {
  editorBufferStore.set(bufferAtom, (prev) => {
    const { [noteId]: _, ...rest } = prev;
    return rest;
  });
};

export const clearAllBuffers = () => {
  editorBufferStore.set(bufferAtom, {});
};
