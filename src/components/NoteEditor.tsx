import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom, notesAtom, deleteNote } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from 'react';
import { useBlockNote } from "@blocknote/react";
import { defaultBlockSchema, Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { debounce } from 'lodash';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionsPanel } from './connections/ConnectionsPanel';
import { EmptyNoteState } from './EmptyNoteState';
import { useNoteConnections } from '@/hooks/useNoteConnections';
import { useNoteInterface } from '@/hooks/useNoteInterface';

export function NoteEditor() {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  // Initialize the editor with content and custom styling through CSS
  const editor = useBlockNote({
    initialContent: (activeNote?.content ?? []) as Block[],
    // Add basic styling for the editor
    domAttributes: {
      editor: {
        class: "prose dark:prose-invert"
      },
      blockContent: {
        // Apply special styling for wiki links, tags, and mentions via CSS selectors
        class: "wiki-links tags-and-mentions"
      }
    }
  });

  // Initialize hooks for note connections and interface
  const { updateConnections } = useNoteConnections();
  const noteInterface = useNoteInterface(editor);

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

  const saveChanges = debounce(() => {
    if (editor && activeNote) {
      const blocks = editor.document as Block[];
      setActiveNote({
        content: blocks,
      });
      
      // Update connections when content changes
      if (activeNoteId) {
        updateConnections(activeNoteId, blocks);
      }
    }
  }, 500);

  useEffect(() => {
    if (!editor) return;
    
    editor.onEditorContentChange(() => {
      saveChanges();
    });
    
    return () => {
      saveChanges.cancel();
    };
  }, [editor, saveChanges, activeNote, activeNoteId]);

  useEffect(() => {
    if (editor && activeNote?.content) {
      try {
        editor.replaceBlocks(editor.document, activeNote.content);
      } catch (error) {
        console.error("Error replacing blocks:", error);
      }
    }
  }, [activeNoteId, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      setActiveNote({
        title: e.target.value
      });
    }
  };

  const handleDeleteNote = useCallback(() => {
    if (notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    const noteIndex = notes.findIndex(note => note.id === activeNoteId);
    
    setNotes(deleteNote(notes, activeNoteId || ''));
    
    const nextNoteIndex = noteIndex < notes.length - 1 ? noteIndex : noteIndex - 1;
    const nextNoteId = notes[nextNoteIndex === noteIndex ? nextNoteIndex - 1 : nextNoteIndex]?.id;
    
    if (nextNoteId) {
      setActiveNoteId(nextNoteId);
    }
    
    toast("Note deleted", {
      description: "Your note has been removed",
    });
  }, [notes, activeNoteId, setNotes, setActiveNoteId]);

  if (!activeNote) {
    return <EmptyNoteState />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col p-6 bg-[#0a0a0d] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Input
              value={activeNote.title}
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
          <style>
            {`
            /* Custom styling for wiki links, tags and mentions */
            .wiki-links .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("[["), :contains("]]"))) {
              background-color: rgba(59, 130, 246, 0.1);
              border-radius: 0.25rem;
              padding: 0 0.25rem;
            }
            
            .tags-and-mentions .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("#"))) {
              color: rgb(22, 163, 74);
              font-weight: 500;
            }
            
            .tags-and-mentions .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("@"))) {
              color: rgb(147, 51, 234);
              font-weight: 500;
            }
            
            @media (prefers-color-scheme: dark) {
              .wiki-links .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("[["), :contains("]]"))) {
                background-color: rgba(30, 64, 175, 0.3);
              }
              .tags-and-mentions .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("#"))) {
                color: rgb(74, 222, 128);
              }
              .tags-and-mentions .bn-text:has(:is(span, div):not(.bn-link):-webkit-any(:contains("@"))) {
                color: rgb(192, 132, 252);
              }
            }
            `}
          </style>
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
