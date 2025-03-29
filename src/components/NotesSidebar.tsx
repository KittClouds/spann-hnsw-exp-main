
import { useAtom } from 'jotai';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { activeNoteIdAtom, createNote, deleteNote, notesAtom } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { useCallback } from 'react';

export function NotesSidebar() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);

  const handleNewNote = useCallback(() => {
    const { id, note } = createNote();
    
    // Add the new note to the notes array
    setNotes(prevNotes => [...prevNotes, note]);
    
    // Set the new note as active
    setActiveNoteId(id);
    
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  }, [setNotes, setActiveNoteId]);
  
  const handleDeleteNote = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent deleting if it's the last note
    if (notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    // Save the index for selecting another note
    const noteIndex = notes.findIndex(note => note.id === id);
    const isActiveNote = id === activeNoteId;
    
    // Delete the note
    setNotes(prevNotes => deleteNote(prevNotes, id));
    
    // If we deleted the active note, select another note
    if (isActiveNote) {
      // Find the next note to select (prefer the one after, otherwise take the one before)
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

  const handleNoteClick = useCallback((id: string) => {
    setActiveNoteId(id);
  }, [setActiveNoteId]);

  return (
    <div className="w-64 border-r border-border dark:bg-[#12141f] light:bg-[#f8f6ff] h-full flex flex-col">
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white group transition-all duration-200 shadow-md"
        >
          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New Note
        </Button>
      </div>
      
      <Separator className="dark:bg-[#1e1f2e] light:bg-[#e5deff]" />
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div 
                key={note.id}
                onClick={() => handleNoteClick(note.id)}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-all duration-200 flex justify-between items-center group",
                  activeNoteId === note.id 
                    ? "dark:sidebar-note-active-dark light:sidebar-note-active-light" 
                    : "dark:hover:bg-[#1c1f2e] light:hover:bg-[#efeaff]"
                )}
              >
                <div className="font-medium truncate">{note.title}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 dark:bg-[#1e1f2e]/60 dark:hover:bg-[#1e1f2e] light:bg-[#e5deff]/60 light:hover:bg-[#e5deff]"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-muted-foreground">No notes available</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
