
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom, notesAtom, createNote, deleteNote } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { PartialBlock } from '@blocknote/core';
import { debounce } from 'lodash';
import { Button } from './ui/button';
import { Plus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  
  const editor = useBlockNote({
    initialContent: activeNote?.content as PartialBlock[] || [],
    // Removing the onError property as it's not supported
  });

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
      const blocks = editor.document;
      setActiveNote({
        content: blocks,
      });
    }
  }, 500);

  useEffect(() => {
    if (!editor) return;
    
    // Subscribe to editor content changes
    editor.onEditorContentChange(() => {
      saveChanges();
    });
    
    return () => {
      saveChanges.cancel();
      // No need to manually unsubscribe - BlockNote handles this internally
    };
  }, [editor, saveChanges, activeNote]);

  useEffect(() => {
    if (editor && activeNote?.content) {
      try {
        editor.replaceBlocks(editor.document, activeNote.content as PartialBlock[]);
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

  const handleNewNote = useCallback(() => {
    const { id, note } = createNote();
    setNotes(prevNotes => [...prevNotes, note]);
    setActiveNoteId(id);
    
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  }, [setNotes, setActiveNoteId]);

  const handleDeleteNote = useCallback((id: string) => {
    if (notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    const noteIndex = notes.findIndex(note => note.id === id);
    const isActiveNote = id === activeNoteId;
    
    setNotes(prevNotes => deleteNote(prevNotes, id));
    
    if (isActiveNote) {
      const nextNoteIndex = noteIndex < notes.length - 1 ? noteIndex : noteIndex - 1;
      const nextNoteId = notes[nextNoteIndex === noteIndex ? nextNoteIndex - 1 : nextNoteIndex]?.id;
      
      if (nextNoteId) {
        setActiveNoteId(nextNoteId);
      }
    }
    
    toast("Note deleted", {
      description: "Your note has been removed",
    });
  }, [notes, activeNoteId, setNotes, setActiveNoteId]);

  if (!activeNote) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
        No note selected
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 dark:bg-[#0d0e18] light:bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <Input
            value={activeNote.title}
            onChange={handleTitleChange}
            className="text-xl font-semibold bg-transparent border-none focus-visible:ring-0 px-0 text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-[#9b87f5] dark:to-[#7c5bf1] light:bg-gradient-to-r light:from-[#614ac2] light:to-[#7460db]"
            placeholder="Note Title"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleNewNote}
            className="dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Note
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Switch Note <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {notes.map((note) => (
                <DropdownMenuItem
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                >
                  {note.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex-1 dark:bg-[#12141f] light:bg-[#f8f6ff] rounded-md shadow-xl border-border transition-all duration-200 overflow-auto">
        <BlockNoteView 
          editor={editor} 
          theme={theme}
          className="min-h-full"
        />
      </div>
    </div>
  );
}
