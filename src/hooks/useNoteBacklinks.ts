
import { useMemo } from 'react';
import { useNotes, useActiveNote } from './useLiveStore';
import { backlinkService } from '@/services/BacklinkService';
import { Note } from '@/lib/store';

/**
 * Hook to get backlinks for a specific note title
 * Returns all notes that contain <<noteTitle>> references
 */
export function useNoteBacklinks(noteTitle: string) {
  const notes = useNotes();
  
  return useMemo(() => {
    // Update backlink service with current notes
    backlinkService.updateFromNotes(notes);
    
    // Get backlinks to this note title
    const backlinkRefs = backlinkService.getBacklinksTo(noteTitle);
    
    // Convert to the format expected by UI components
    return backlinkRefs.map(ref => ({
      id: ref.noteId,
      title: ref.noteTitle,
      backlinkTitle: ref.backlinkTitle
    }));
  }, [notes, noteTitle]);
}

/**
 * Hook to get backlinks for the currently active note
 */
export function useActiveNoteBacklinks() {
  const activeNote = useActiveNote();
  
  return useNoteBacklinks(activeNote?.title || '');
}

/**
 * Hook to get all backlink titles that a note contains (outgoing backlinks)
 */
export function useNoteOutgoingBacklinks(noteId: string | null) {
  const notes = useNotes();
  
  return useMemo(() => {
    if (!noteId) return [];
    
    // Update backlink service with current notes
    backlinkService.updateFromNotes(notes);
    
    // Get outgoing backlinks from this note
    return backlinkService.getNoteBacklinks(noteId);
  }, [notes, noteId]);
}

/**
 * Hook to get comprehensive backlink statistics
 */
export function useBacklinkStats() {
  const notes = useNotes();
  
  return useMemo(() => {
    // Update backlink service with current notes
    backlinkService.updateFromNotes(notes);
    
    return backlinkService.getStats();
  }, [notes]);
}
