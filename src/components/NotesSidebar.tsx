
import { useAtom } from 'jotai';
import { FolderIcon, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  activeNoteIdAtom, 
  createNote, 
  deleteNote, 
  notesAtom,
  currentFolderPathAtom,
  currentFolderNotesAtom,
  foldersAtom,
} from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { FolderTree } from './FolderTree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotesSidebar() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [currentFolderNotes] = useAtom(currentFolderNotesAtom);
  const [folders] = useAtom(foldersAtom);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleMoveNoteToFolder = useCallback((noteId: string, folderPath: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === noteId 
          ? { ...note, path: folderPath, updatedAt: new Date().toISOString() } 
          : note
      )
    );
    
    toast("Note moved", {
      description: `Note moved to ${folderPath === '/' ? 'Home' : folderPath}`,
    });
  }, [setNotes]);

  // Get the current folder name
  const getCurrentFolderName = () => {
    if (currentPath === '/') return 'Home';
    
    const folderName = folders.find(f => f.path === currentPath)?.name;
    return folderName || 'Unknown Folder';
  };

  // Filter notes based on search term
  const filteredNotes = searchTerm 
    ? currentFolderNotes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : currentFolderNotes;

  return (
    <div className="w-64 border-r border-border dark:bg-[#12141f] light:bg-[#f8f6ff] h-full flex flex-col">
      <div className="p-4">
        <div className="relative">
          <Input
            placeholder="Search notes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        <div className="px-2 py-3">
          <div className="px-2 py-1 text-muted-foreground text-xs font-semibold">FOLDERS</div>
          <ScrollArea className="h-[200px]">
            <div className="mt-2">
              <div 
                className={cn(
                  "flex items-center py-1 px-2 rounded-md text-sm cursor-pointer transition-colors",
                  currentPath === '/' 
                    ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                    : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
                )}
                onClick={() => setCurrentPath('/')}
              >
                <FolderIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Home</span>
              </div>
              <FolderTree parentId={null} path="/" level={0} />
            </div>
          </ScrollArea>
        </div>
        
        <div className="px-2 py-1">
          <div className="flex items-center px-2 py-1 text-xs font-semibold text-muted-foreground">
            <span>NOTES IN</span>
            <span className="ml-1 text-foreground">{getCurrentFolderName()}</span>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="py-2">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
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
                  <div className="flex gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 dark:bg-[#1e1f2e]/60 dark:hover:bg-[#1e1f2e] light:bg-[#e5deff]/60 light:hover:bg-[#e5deff]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onSelect={() => handleMoveNoteToFolder(note.id, '/')}
                          disabled={note.path === '/'}
                        >
                          Move to Home
                        </DropdownMenuItem>
                        {folders
                          .filter(folder => folder.path !== '/' && folder.path !== note.path)
                          .map(folder => (
                            <DropdownMenuItem 
                              key={folder.id}
                              onSelect={() => handleMoveNoteToFolder(note.id, folder.path)}
                              disabled={note.path === folder.path}
                            >
                              Move to {folder.name}
                            </DropdownMenuItem>
                          ))
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 dark:bg-[#1e1f2e]/60 dark:hover:bg-[#1e1f2e] light:bg-[#e5deff]/60 light:hover:bg-[#e5deff]"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {searchTerm ? 'No matching notes found' : 'No notes in this folder'}
              </div>
            )}
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
