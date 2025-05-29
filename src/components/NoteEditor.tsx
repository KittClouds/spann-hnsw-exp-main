
import { useActiveNote, useActiveNoteId, useNotes, useNoteActions } from '@/hooks/useLiveStore';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { Block } from '@blocknote/core';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionsPanel } from './connections/ConnectionsPanel';
import { EmptyNoteState } from './EmptyNoteState';
import { NoteSerializer } from '@/services/NoteSerializer';
import { createEmptyBlock } from '@/lib/utils/blockUtils';
import { entityEditorSchema } from '@/lib/editor/EntityEditorSchema';
import { EntityHighlighter } from '@/services/EntityHighlighter';
import { setBuffer, getBuffer, clearBuffer } from '@/hooks/useEditorBuffer';
import { useIdleCallback } from '@/hooks/useIdleCallback';

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
  
  const entityHighlighterRef = useRef<EntityHighlighter | null>(null);
  const currentNoteIdRef = useRef<string | null>(null);
  const editorInitializedRef = useRef(false);
  
  // Initialize editor with empty content first
  const editor = useBlockNote({
    schema: entityEditorSchema,
    initialContent: [createEmptyBlock()],
  });

  // Initialize entity highlighter
  useEffect(() => {
    if (editor) {
      entityHighlighterRef.current = new EntityHighlighter(editor as any);
    }
  }, [editor]);

  // Theme change handler
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

  // Idle save to LiveStore
  const idleSave = useIdleCallback(() => {
    if (!activeNote) return;
    
    const bufferedBlocks = getBuffer(activeNote.id);
    if (!bufferedBlocks) return;
    
    console.log("NoteEditor: Idle save triggered for note", activeNote.id);
    
    // Persist to LiveStore
    updateNote(activeNote.id, { content: bufferedBlocks });
    
    // Process entity highlighting after save
    if (entityHighlighterRef.current) {
      setTimeout(() => {
        entityHighlighterRef.current?.processAllInactiveBlocks();
      }, 100);
    }
  }, 2000);

  // Load content for a specific note
  const loadNoteContent = useCallback((noteId: string, note: any) => {
    if (!editor) return;
    
    console.log("NoteEditor: Loading content for note", noteId);
    
    // Try buffer first, then fallback to LiveStore content
    let contentToLoad: Block[] = [createEmptyBlock()];
    
    const bufferedContent = getBuffer(noteId);
    if (bufferedContent && bufferedContent.length > 0) {
      console.log("NoteEditor: Using buffered content for", noteId, bufferedContent);
      contentToLoad = bufferedContent;
    } else if (note?.content && Array.isArray(note.content) && note.content.length > 0) {
      console.log("NoteEditor: Using LiveStore content for", noteId, note.content);
      contentToLoad = note.content as Block[];
      // Initialize buffer with LiveStore content
      setBuffer(noteId, contentToLoad);
    } else {
      console.log("NoteEditor: Using empty content for", noteId);
      // Initialize buffer with empty content
      setBuffer(noteId, contentToLoad);
    }
    
    try {
      // Replace editor content
      editor.replaceBlocks(editor.document, contentToLoad);
      
      // Process entity highlighting after content load
      if (entityHighlighterRef.current) {
        setTimeout(() => {
          entityHighlighterRef.current?.processAllInactiveBlocks();
        }, 200);
      }
    } catch (error) {
      console.error("NoteEditor: Error loading content for note", noteId, error);
    }
  }, [editor]);

  // Editor content change handler - write to buffer only
  useEffect(() => {
    if (!editor || !activeNote) return;
    
    const handleContentChange = () => {
      const currentBlocks = editor.document as Block[];
      
      console.log("NoteEditor: Content changed for note", activeNote.id, "blocks:", currentBlocks.length);
      
      // Write to buffer (no re-renders)
      setBuffer(activeNote.id, currentBlocks);
      
      // Touch idle save timer
      idleSave.touch();
    };
    
    editor.onEditorContentChange(handleContentChange);
    
    return () => {
      // Cleanup - let pending saves complete
    };
  }, [editor, activeNote, idleSave]);

  // Handle note switching and initial load
  useEffect(() => {
    if (!editor || !activeNoteId) return;
    
    const previousNoteId = currentNoteIdRef.current;
    
    console.log("NoteEditor: Note change detected", {
      previous: previousNoteId,
      current: activeNoteId,
      editorInitialized: editorInitializedRef.current
    });
    
    // Skip if same note and already initialized
    if (activeNoteId === previousNoteId && editorInitializedRef.current) {
      return;
    }
    
    // Flush any pending saves from previous note
    if (previousNoteId && previousNoteId !== activeNoteId) {
      console.log("NoteEditor: Flushing pending saves for previous note", previousNoteId);
      idleSave.flush();
    }
    
    // Update current note reference
    currentNoteIdRef.current = activeNoteId;
    
    // Load content for the new note
    if (activeNote) {
      loadNoteContent(activeNoteId, activeNote);
      editorInitializedRef.current = true;
    }
    
  }, [activeNoteId, activeNote, editor, loadNoteContent, idleSave]);

  // Handle window blur/beforeunload to save immediately
  useEffect(() => {
    const handleBlur = () => {
      console.log("NoteEditor: Window blur - flushing pending saves");
      idleSave.flush();
    };
    
    const handleBeforeUnload = () => {
      console.log("NoteEditor: Before unload - flushing pending saves");
      idleSave.flush();
    };
    
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [idleSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      updateNote(activeNote.id, { title: e.target.value });
    }
  };

  const handleDeleteNote = useCallback(() => {
    if (!activeNote || notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    console.log("NoteEditor: Deleting note", activeNote.id);
    
    // Clear buffer for deleted note
    clearBuffer(activeNote.id);
    
    const noteIndex = notes.findIndex(note => note.id === activeNoteId);
    
    deleteNote(activeNote.id);
    
    const nextNoteIndex = noteIndex < notes.length - 1 ? noteIndex : noteIndex - 1;
    const nextNoteId = notes[nextNoteIndex === noteIndex ? nextNoteIndex - 1 : nextNoteIndex]?.id;
    
    if (nextNoteId) {
      // Reset editor initialized flag to force content reload
      editorInitializedRef.current = false;
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
