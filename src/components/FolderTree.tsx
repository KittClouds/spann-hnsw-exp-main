
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronRight, FolderIcon, FolderOpen, Plus, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  currentFolderPathAtom, 
  foldersAtom, 
  notesAtom,
  createFolder,
  activeNoteIdAtom,
} from '@/lib/store';
import { Button } from '@/components/ui/button';
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
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // Find children of the current folder
  const childFolders = folders.filter(folder => 
    folder.parentId === parentId && 
    (parentId !== null || folder.id !== 'root')
  );

  // Get notes for the current folder
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

  const handleNoteClick = (noteId: string) => {
    setActiveNoteId(noteId);
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

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent deleting if it's the last note
    if (notes.length <= 1) {
      toast.error('Cannot delete', {
        description: 'You must keep at least one note',
      });
      return;
    }
    
    const noteIndex = notes.findIndex(note => note.id === noteId);
    const isActiveNote = noteId === activeNoteId;
    
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    
    if (isActiveNote) {
      const nextNoteIndex = noteIndex < notes.length - 1 ? noteIndex : noteIndex - 1;
      const nextNoteId = notes[nextNoteIndex === noteIndex ? nextNoteIndex - 1 : nextNoteIndex]?.id;
      
      if (nextNoteId) {
        setActiveNoteId(nextNoteId);
      }
    }
    
    toast.success('Note deleted');
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

  return (
    <div className="pl-3">
      {childFolders.map((folder) => (
        <div key={folder.id} className="flex flex-col">
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
              onClick={() => toggleFolder(folder.id)}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(folder, e)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
          
          {isExpanded(folder.id) && (
            <>
              <FolderTree 
                parentId={folder.id} 
                path={folder.path} 
                level={level + 1} 
              />
              {folderNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note.id)}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId(null)}
                  className={cn(
                    "ml-7 px-4 py-2 cursor-pointer transition-all duration-200 flex justify-between items-center group rounded-md",
                    activeNoteId === note.id 
                      ? "dark:sidebar-note-active-dark light:sidebar-note-active-light" 
                      : "dark:hover:bg-[#1c1f2e] light:hover:bg-[#efeaff]"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium truncate">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{note.title}</span>
                  </div>
                  {hoveredNoteId === note.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ))}
      
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
