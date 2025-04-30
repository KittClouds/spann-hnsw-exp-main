
import { useAtom } from 'jotai';
import { activeNoteIdAtom, STANDARD_ROOT_ID } from '@/lib/store';
import { syncManager } from '../services/SyncManager';
import { NodeType } from '../services/types';

// Provide a hook that wraps the atom usage
export function useActiveNoteId() {
  const [noteId, setNoteId] = useAtom(activeNoteIdAtom);
  // Make sure types are compatible with how it's used in components
  const setActiveId = (id: string) => setNoteId(id);
  return [noteId, setActiveId] as const;
}

// Helper hook to check if a note belongs to the standard root
export function useIsStandardNote(clusterId: string | null) {
  return clusterId === null;
}

// Additional helper that checks if a note exists in the graph
export function useNoteExists(noteId: string | null) {
  if (!noteId) return false;
  return syncManager.nodeExists(noteId);
}

// Get all notes of a specific type from the graph
export function useNotesByType(type: NodeType) {
  return syncManager.getNodesByType(type);
}
