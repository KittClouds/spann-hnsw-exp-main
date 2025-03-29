
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronRight, FolderIcon, FolderOpen, Plus, Trash2, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  currentFolderPathAtom, 
  foldersAtom, 
  notesAtom, 
  createFolder, 
  activeNoteIdAtom, 
  createNote 
} from '@/lib/store';
import { Button } from '@/components/ui/button';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FolderTreeProps {
  parentId: string | null;
  path: string;
  level: number;
}

export function FolderTree({ parentId, path, level }: FolderTreeProps) {
  const [folders, setFolders] = useAtom(foldersAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);

  // Find children of the current folder
  const childFolders = folders.filter(folder => 
    folder.parentId === parentId && 
    (parentId !== null || folder.id !== 'root')
  );

  // Find notes in the current folder
  const folderNotes = notes.filter(note => note.path === path);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev, 
      [folderId]: !prev[folderId]
    }));
  };

  const isExpanded = (folderId: string) => {
    return expandedFolders[folderId] || false;
  };

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    // Check if folder name already exists at this level
    const folderExists = folders.some(
      folder => folder.parentId === parentId && folder.name.toLowerCase() === newFolderName.toLowerCase()
    );

    if (folderExists) {
      toast.error('A folder with this name already exists');
      return;
    }

    const { folder } = createFolder(
      newFolderName, 
      path, 
      path === '/' ? null : folders.find(f => f.path === path)?.id || null
    );
    
    setFolders([...folders, folder]);
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    
    // Expand the parent folder
    if (parentId) {
      setExpandedFolders(prev => ({
        ...prev,
        [parentId]: true
      }));
    }
    
    toast.success('Folder created successfully');
  };

  const handleDeleteClick = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!folderToDelete) return;

    // Check if the folder has subfolders
    const hasSubFolders = folders.some(folder => folder.parentId === folderToDelete.id);
    
    if (hasSubFolders) {
      toast.error('Cannot delete a folder that contains subfolders');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      return;
    }

    // Check if the folder contains notes
    const hasNotes = notes.some(note => note.path === folderToDelete.path);
    
    if (hasNotes) {
      toast.error('Cannot delete a folder that contains notes');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      return;
    }
    
    // Navigate to parent folder if we're deleting the current folder
    if (currentPath === folderToDelete.path) {
      const parentPath = folderToDelete.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentPath(parentPath);
    }

    // Remove the folder
    setFolders(folders.filter(folder => folder.id !== folderToDelete.id));
    setIsDeleteDialogOpen(false);
    setFolderToDelete(null);
    toast.success('Folder deleted successfully');
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  // Handle creating a new note in a specific folder
  const handleCreateNote = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { id, note } = createNote(folderPath);
    
    // Add the new note to the notes array
    setNotes(prevNotes => [...prevNotes, note]);
    
    // Set the new note as active
    setActiveNoteId(id);
    
    // Auto-expand the folder if it's not already expanded
    if (folderPath !== '/') {
      const folderObj = folders.find(f => f.path === folderPath);
      if (folderObj) {
        setExpandedFolders(prev => ({
          ...prev,
          [folderObj.id]: true
        }));
      }
    }
    
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  };

  const handleNoteClick = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  // Handle note deletion
  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent deleting if it's the last note
    if (notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
      });
      return;
    }
    
    // Save the index for selecting another note
    const noteIndex = notes.findIndex(note => note.id === noteId);
    const isActiveNote = noteId === activeNoteId;
    
    // Delete the note
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    
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
  };
  
  return (
    <div className="pl-3">
      {childFolders.map((folder) => (
        <div key={folder.id} className="flex flex-col">
          <ContextMenu>
            <ContextMenuTrigger>
              <div 
                className={cn(
                  "flex items-center py-1 px-2 rounded-md text-sm cursor-pointer transition-colors group",
                  currentPath === folder.path 
                    ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                    : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
                )}
                onMouseEnter={() => setHoveredFolderId(folder.id)}
                onMouseLeave={() => setHoveredFolderId(null)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folder.id);
                  }}
                  className="p-1 rounded-sm hover:bg-sidebar-accent mr-1"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform",
                      isExpanded(folder.id) && "transform rotate-90"
                    )} 
                  />
                </button>
                
                <button 
                  className="flex gap-2 items-center flex-1"
                  onClick={() => handleFolderClick(folder.path)}
                >
                  {isExpanded(folder.id) ? (
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{folder.name}</span>
                </button>

                {hoveredFolderId === folder.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleCreateNote(folder.path, e)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="New note"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(folder, e)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete folder"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent>
              <ContextMenuItem onClick={() => {
                setFolderToDelete(folder);
                setIsDeleteDialogOpen(true);
              }}>
                Delete Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={(e) => handleCreateNote(folder.path, e as React.MouseEvent)}>
                New Note
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          
          {isExpanded(folder.id) && (
            <>
              {/* Notes for this folder */}
              {notes.filter(note => note.path === folder.path).map(note => (
                <div 
                  key={note.id}
                  className={cn(
                    "pl-6 py-1 pr-2 flex items-center text-sm cursor-pointer group",
                    activeNoteId === note.id 
                      ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                      : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
                  )}
                  onClick={() => handleNoteClick(note.id)}
                >
                  <FileIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span className="truncate flex-1">{note.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              ))}
              
              <FolderTree 
                parentId={folder.id} 
                path={folder.path} 
                level={level + 1} 
              />
            </>
          )}
        </div>
      ))}
      
      {/* Root level notes */}
      {path === '/' && 
        folderNotes.map(note => (
          <div 
            key={note.id}
            className={cn(
              "pl-6 py-1 pr-2 flex items-center text-sm cursor-pointer group",
              activeNoteId === note.id 
                ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
            )}
            onClick={() => handleNoteClick(note.id)}
          >
            <FileIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <span className="truncate flex-1">{note.title}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </div>
        ))
      }
      
      <div className="mt-1 pl-5">
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
            >
              <Plus className="h-3 w-3" /> New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
