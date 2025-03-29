
import { useAtom } from 'jotai';
import { Plus, Search, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  createNote, 
  notesAtom,
  activeNoteIdAtom,
  currentFolderPathAtom,
} from '@/lib/store';
import { Input } from '@/components/ui/input';
import { FolderTree } from './FolderTree';
import { toast } from 'sonner';
import { useCallback } from 'react';

export function NotesSidebar() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath] = useAtom(currentFolderPathAtom);

  const handleNewNote = useCallback(() => {
    const { id, note } = createNote(currentPath);
    
    // Add the new note to the notes array
    setNotes(prevNotes => [...prevNotes, note]);
    
    // Set the new note as active
    setActiveNoteId(id);
    
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  }, [setNotes, setActiveNoteId, currentPath]);

  return (
    <div className="w-64 border-r border-border dark:bg-[#12141f] light:bg-[#f8f6ff] h-full flex flex-col">
      <div className="p-4">
        <div className="relative">
          <Input
            placeholder="Search notes..."
            className="pl-8"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <Separator className="dark:bg-[#1e1f2e] light:bg-[#e5deff]" />
      
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white group transition-all duration-200 shadow-md"
        >
          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New Note
        </Button>
      </div>
      
      <Separator className="dark:bg-[#1e1f2e] light:bg-[#e5deff]" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 py-1">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">FOLDERS</div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="py-2">
            <FolderTree parentId={null} path="/" level={0} />
          </div>
        </ScrollArea>
      </div>
      
      <Separator className="dark:bg-[#1e1f2e] light:bg-[#e5deff]" />
      
      <div className="p-3">
        <Button variant="outline" className="w-full flex items-center" size="sm">
          <Tag className="mr-2 h-3 w-3" /> Manage Tags
        </Button>
      </div>
    </div>
  );
}
