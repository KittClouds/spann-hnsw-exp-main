
import { useActiveNote, useActiveNoteId, useNotes, useNoteActions } from '@/hooks/useLiveStore';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { Block } from '@blocknote/core';
import { debounce } from 'lodash';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionsPanel } from './connections/ConnectionsPanel';
import { EmptyNoteState } from './EmptyNoteState';
import { NoteSerializer } from '@/services/NoteSerializer';
import { createEmptyBlock } from '@/lib/utils/blockUtils';
import { entityEditorSchema, EntityEditorSchema } from '@/lib/editor/EntityEditorSchema';
import { EntityHighlighter } from '@/services/EntityHighlighter';

export function NoteEditor() {
  const activeNote = useActiveNote();
  const [activeNoteId, setActiveNoteId] = useActiveNoteId();
  const notes = useNotes();
  const { updateNote, deleteNote } = useNoteActions();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  // Track the current note being edited to prevent cross-contamination
  const currentNoteRef = useRef<string | null>(null);
  const entityHighlighterRef = useRef<EntityHighlighter | null>(null);
  
  // Ensure we always have valid initial content
  const getInitialContent = useCallback((): Block[] => {
    console.log("NoteEditor: getInitialContent called", { activeNote, content: activeNote?.content });
    
    // If no active note, return default content
    if (!activeNote) {
      console.log("NoteEditor: No active note, returning default content");
      return [createEmptyBlock()];
    }
    
    // Check if content exists and is a valid array
    if (activeNote.content && Array.isArray(activeNote.content) && activeNote.content.length > 0) {
      console.log("NoteEditor: Using existing content", activeNote.content);
      return activeNote.content as Block[];
    }
    
    // Return a default empty paragraph block if no content
    console.log("NoteEditor: No valid content found, creating default block");
    return [createEmptyBlock()];
  }, [activeNote]);
  
  const editor = useBlockNote({
    schema: entityEditorSchema,
    initialContent: getInitialContent(),
  });

  // Initialize entity highlighter when editor is ready
  useEffect(() => {
    if (editor) {
      entityHighlighterRef.current = new EntityHighlighter(editor as any);
    }
  }, [editor]);

  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    handleThemeChange();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (!editor || !activeNote) return;
      
      const currentBlocks = editor.document as Block[];
      console.log("NoteEditor: Saving changes for", activeNote.id);
      
      // Update the note content
      updateNote(activeNote.id, { content: currentBlocks });
      
      // Serialize the note for potential external usage
      try {
        const updatedNote = { ...activeNote, content: currentBlocks };
        const doc = NoteSerializer.toDocument(updatedNote);
        const json = doc.toJSON();
        console.log("NoteEditor: Serialized note:", json);
      } catch (err) {
        console.error("Error serializing note:", err);
      }
    }, 500),
    [editor, activeNote, updateNote]
  );

  // Debounced entity processing
  const debouncedEntityProcessing = useCallback(
    debounce(() => {
      if (entityHighlighterRef.current) {
        entityHighlighterRef.current.processAllInactiveBlocks();
      }
    }, 1000), // Longer delay to ensure user has stopped typing
    []
  );

  // Set up content change listener with simplified debouncing
  useEffect(() => {
    if (!editor) return;
    
    const handleContentChange = () => {
      // Save changes with debouncing
      debouncedSave();
      
      // Process entity highlighting with longer debouncing
      debouncedEntityProcessing();
    };
    
    editor.onEditorContentChange(handleContentChange);
    
    return () => {
      // Cancel any pending operations when component unmounts or editor changes
      debouncedSave.cancel();
      debouncedEntityProcessing.cancel();
    };
  }, [editor, debouncedSave, debouncedEntityProcessing]);

  // Handle note switching
  useEffect(() => {
    if (!editor) return;
    
    // Cancel any pending operations from the previous note
    debouncedSave.cancel();
    debouncedEntityProcessing.cancel();
    
    // Update the current note reference
    currentNoteRef.current = activeNoteId;
    
    if (activeNote) {
      try {
        const newContent = getInitialContent();
        console.log("NoteEditor: Switching to note", activeNoteId, "with content", newContent);
        
        // Replace blocks with new content
        editor.replaceBlocks(editor.document, newContent);
        
        // Process entity highlighting for initial content after a short delay
        if (entityHighlighterRef.current) {
          setTimeout(() => {
            entityHighlighterRef.current?.processAllInactiveBlocks();
          }, 200);
        }
      } catch (error) {
        console.error("Error replacing blocks:", error);
      }
    }
  }, [activeNoteId, activeNote, editor, getInitialContent, debouncedSave, debouncedEntityProcessing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      updateNote(activeNote.id, { title: e.target.value });
      
      // Serialize the updated note
      try {
        const updatedNote = { ...activeNote, title: e.target.value };
        const doc = NoteSerializer.toDocument(updatedNote);
        const json = doc.toJSON();
        console.log("NoteEditor: Serialized note with updated title:", json);
      } catch (err) {
        console.error("Error serializing note:", err);
      }
    }
  };

  const handleDeleteNote = useCallback(() => {
    if (!activeNote || notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    const noteIndex = notes.findIndex(note => note.id === activeNoteId);
    
    deleteNote(activeNote.id);
    
    const nextNoteIndex = noteIndex < notes.length - 1 ? noteIndex : noteIndex - 1;
    const nextNoteId = notes[nextNoteIndex === noteIndex ? nextNoteIndex - 1 : nextNoteIndex]?.id;
    
    if (nextNoteId) {
      setActiveNoteId(nextNoteId);
    }
    
    toast("Note deleted", {
      description: "Your note has been removed",
    });
  }, [notes, activeNoteId, activeNote, deleteNote, setActiveNoteId]);

  if (!activeNote) {
    return <EmptyNoteState />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col p-6 bg-[#0a0a0d] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Input
              value={activeNote.title || ''}
              onChange={handleTitleChange}
              className="text-xl font-semibold bg-transparent border-none focus-visible:ring-0 px-0 text-primary"
              placeholder="Note Title"
            />
          </div>
          <Button 
            onClick={handleDeleteNote} 
            variant="outline" 
            size="icon" 
            className="ml-2 text-destructive hover:bg-destructive/10 border-[#1a1b23] bg-[#12141f]"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 bg-[#12141f] rounded-md shadow-xl border-[#1a1b23] transition-all duration-200 mb-12 overflow-auto">
          <BlockNoteView 
            editor={editor} 
            theme={theme}
            className="min-h-full"
          />
        </div>
      </div>
      <ConnectionsPanel />
    </div>
  );
}
