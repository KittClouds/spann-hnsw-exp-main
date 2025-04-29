
import { useAtom } from 'jotai';
import { activeNoteIdAtom, STANDARD_ROOT_ID } from '@/lib/store';

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
