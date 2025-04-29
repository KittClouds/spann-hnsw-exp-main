
import { useAtom } from 'jotai';
import { activeNoteIdAtom } from '@/lib/store';

// Provide a hook that wraps the atom usage
export function useActiveNoteId() {
  const [noteId, setNoteId] = useAtom(activeNoteIdAtom);
  // Make sure types are compatible with how it's used in components
  const setActiveId = (id: string) => setNoteId(id);
  return [noteId, setActiveId] as const;
}
