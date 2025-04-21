
import { useAtom } from 'jotai';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { activeNoteIdAtom, createNote, deleteNote, notesAtom } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

export function NotesSidebar() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);

  const handleNewNote = () => {
    const newNoteId = createNote(setNotes);
    setActiveNoteId(newNoteId);
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  };
  
  const handleDeleteNote = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNote(setNotes, id);
    
    // If we deleted the active note, select the first available note
    if (id === activeNoteId) {
      // Get the notes array safely
      const notesArray = Array.isArray(notes) ? notes : [];
      // Filter out the deleted note
      const remainingNotes = notesArray.filter(note => note.id !== id);
      
      if (remainingNotes.length > 0) {
        setActiveNoteId(remainingNotes[0].id);
      }
    }
    
    toast("Note deleted", {
      description: "Your note has been removed",
    });
  };

  return (
    <div className="w-64 border-r border-border dark:bg-[#141824] light:bg-white h-full flex flex-col">
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white group transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New Note
        </Button>
      </div>
      
      <Separator className="dark:bg-[#222533] light:bg-[#f0f2f5]" />
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {Array.isArray(notes) ? notes.map((note) => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={cn(
                "px-4 py-3 cursor-pointer dark:hover:bg-[#1c1f2e] light:hover:bg-[#f5f7fa] transition-all duration-200 flex justify-between items-center group",
                activeNoteId === note.id 
                  ? "dark:sidebar-note-active-dark light:sidebar-note-active-light" 
                  : ""
              )}
            >
              <div className="font-medium truncate">{note.title}</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDeleteNote(note.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </div>
          )) : <div className="px-4 py-2">Loading notes...</div>}
        </div>
      </ScrollArea>
    </div>
  );
}
