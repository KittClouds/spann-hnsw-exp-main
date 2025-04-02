
import React, { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { activeNoteAtom, notesAtom } from '@/lib/store';
import { debounce } from 'lodash';
import '@blocknote/core/fonts/inter.css';

// Import the required styles
import '@blocknote/mantine/style.css';

export function NoteEditor() {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [notes] = useAtom(notesAtom);
  
  // Create a reference to track if content has been initialized
  const contentInitializedRef = useRef(false);
  
  // Editor initialization with note content
  const editor = useCreateBlockNote({
    initialContent: activeNote?.content || undefined,
  });
  
  // Debounced function for saving changes
  const saveChanges = debounce(async () => {
    if (!activeNote) return;
    
    try {
      // Using JSON.stringify/parse to create a deep copy of the blocks
      const content = JSON.parse(JSON.stringify(editor.document));
      setActiveNote({ content });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, 500);
  
  // Listen for content changes from the editor
  useEffect(() => {
    if (!editor || !activeNote) return;
    
    const unsubscribe = editor.onChange(saveChanges);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      saveChanges.cancel();
    };
  }, [editor, activeNote, setActiveNote, saveChanges]);
  
  // Update the editor when the active note changes
  useEffect(() => {
    if (!editor || !activeNote) return;
    
    // Only update content when a new note is selected or on first load
    if (!contentInitializedRef.current || notes.some(note => note.id === activeNote.id)) {
      try {
        editor.replaceBlocks(editor.document, activeNote.content || []);
        contentInitializedRef.current = true;
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }
  }, [activeNote, editor, notes]);
  
  if (!activeNote) {
    return <div className="flex items-center justify-center h-full">No note selected</div>;
  }
  
  return (
    <div className="p-4 h-full overflow-y-auto">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
