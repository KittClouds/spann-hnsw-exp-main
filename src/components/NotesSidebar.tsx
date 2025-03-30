
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
    <div className="w-64 dark:cosmic-sidebar-dark light:cosmic-sidebar-light h-full flex flex-col">
      <div className="p-4">
        <div className="relative">
          <Input
            placeholder="Search notes..."
            className="pl-8 dark:bg-galaxy-dark-accent dark:border-galaxy-dark-purple dark:border-opacity-30 light:bg-white"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />
      
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full dark:cosmic-button-dark light:cosmic-button-light group"
        >
          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New Note
        </Button>
      </div>
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />
      
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
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />
      
      <div className="p-3">
        <Button 
          variant="outline" 
          className="w-full flex items-center dark:border-galaxy-dark-purple dark:border-opacity-30 dark:bg-galaxy-dark-accent dark:hover:bg-galaxy-dark-purple dark:hover:bg-opacity-50 light:border-gray-200 light:bg-white light:hover:bg-gray-100" 
          size="sm"
        >
          <Tag className="mr-2 h-3 w-3" /> Manage Tags
        </Button>
      </div>
    </div>
  );
}
