
import { useAtom } from 'jotai';
import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { activeNoteIdAtom, createNote, deleteNote, notesAtom } from '@/lib/store';
import { cn } from '@/lib/utils';

export function NotesSidebar() {
  const [notes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [, setNotes] = useAtom(notesAtom);

  const handleNewNote = () => {
    const newNoteId = createNote(setNotes);
    setActiveNoteId(newNoteId);
  };

  return (
    <div className="w-64 border-r border-border bg-sidebar h-full flex flex-col">
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {notes.map((note) => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={cn(
                "px-4 py-2 cursor-pointer hover:bg-sidebar-accent transition-colors duration-200",
                activeNoteId === note.id && "bg-sidebar-accent border-l-2 border-primary"
              )}
            >
              <div className="font-medium truncate">{note.title}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
