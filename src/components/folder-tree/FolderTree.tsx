
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Folder,
  currentFolderPathAtom,
  foldersAtom,
  notesAtom,
  activeNoteIdAtom,
  createFolder,
  createNote,
  moveNote,
  renameFolder as renameFolderUtil,
  currentClusterIdAtom,
} from '@/lib/store';
import { FolderTreeProps } from './types';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { FolderForm } from './FolderForm';
import { DeleteFolderDialog } from './DeleteFolderDialog';

export function FolderTree({ parentId, path, level, clusterId, viewMode }: FolderTreeProps) {
  const [folders, setFolders] = useAtom(foldersAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [currentClusterId, setCurrentClusterId] = useAtom(currentClusterIdAtom);
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [movePopoverOpenForNoteId, setMovePopoverOpenForNoteId] = useState<string | null>(null);
  
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentForNewFolder, setParentForNewFolder] = useState<string | null>(null);
  const [folderPathForNewFolder, setFolderPathForNewFolder] = useState<string>("/");
  const [clusterIdForNewFolder, setClusterIdForNewFolder] = useState<string | undefined>(undefined);
  
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [newRenameFolderName, setNewRenameFolderName] = useState('');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  // Filter child folders based on viewMode and clusterId
  const childFolders = folders.filter(folder => {
    const matchesParent = folder.parentId === parentId && (parentId !== null || folder.id !== 'root');
    
    if (viewMode === 'folders') {
      // In folders view, only show folders with no clusterId or default clusterId
      return matchesParent && (!folder.clusterId || folder.clusterId === 'default-cluster');
    } else if (viewMode === 'clusters' && clusterId) {
      // In clusters view, only show folders that belong to the current cluster
      return matchesParent && folder.clusterId === clusterId;
    }
    
    return false;
  });

  // Filter notes based on viewMode and clusterId
  const folderNotes = notes.filter(note => {
    const matchesPath = note.path === path;
    
    if (viewMode === 'folders') {
      // In folders view, only show notes with no clusterId or default clusterId
      return matchesPath && (!note.clusterId || note.clusterId === 'default-cluster');
    } else if (viewMode === 'clusters' && clusterId) {
      // In clusters view, only show notes that belong to the current cluster
      return matchesPath && note.clusterId === clusterId;
    }
    
    return false;
  });
  
  // Build list of available folders for move operations
  const allFolders = React.useMemo(() => {
    const rootFolder = { id: 'root', name: 'Home', path: '/', clusterId: clusterId };
    
    let availableFolders;
    if (viewMode === 'folders') {
      availableFolders = folders.filter(f => 
        f.id !== 'root' && 
        (!f.clusterId || f.clusterId === 'default-cluster')
      );
    } else if (viewMode === 'clusters' && clusterId) {
      availableFolders = folders.filter(f => 
        f.id !== 'root' && 
        f.clusterId === clusterId
      );
    } else {
      availableFolders = [];
    }
    
    return [rootFolder, ...availableFolders];
  }, [folders, clusterId, viewMode]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev, 
      [folderId]: !prev[folderId]
    }));
  };

  const isExpanded = (folderId: string) => {
    return expandedFolders[folderId] || false;
  };

  const handleFolderClick = (folderPath: string, folderClusterId?: string) => {
    setCurrentPath(folderPath);
    if (folderClusterId) {
      setCurrentClusterId(folderClusterId);
    }
  };

  const openNewFolderDialog = (parentFolderId: string | null, folderPath: string, folderClusterId?: string) => {
    setParentForNewFolder(parentFolderId);
    setFolderPathForNewFolder(folderPath);
    setNewFolderName('');
    
    // Set the appropriate clusterId for the new folder
    if (viewMode === 'clusters' && clusterId) {
      setClusterIdForNewFolder(clusterId);
    } else {
      // For folders view, use default cluster or none
      setClusterIdForNewFolder('default-cluster');
    }
    
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    // Check if folder exists in the same parent with the same name and cluster context
    const folderExists = folders.some(
      folder => 
        folder.parentId === parentForNewFolder && 
        folder.name.toLowerCase() === newFolderName.toLowerCase() &&
        folder.clusterId === clusterIdForNewFolder
    );

    if (folderExists) {
      toast.error('A folder with this name already exists');
      return;
    }

    // Create the new folder with the correct clusterId
    const { folder } = createFolder(
      newFolderName, 
      folderPathForNewFolder, 
      folderPathForNewFolder === '/' ? null : folders.find(f => f.path === folderPathForNewFolder)?.id || null,
      clusterIdForNewFolder
    );
    
    setFolders([...folders, folder]);
    setIsNewFolderDialogOpen(false);
    
    if (parentForNewFolder) {
      setExpandedFolders(prev => ({
        ...prev,
        [parentForNewFolder]: true
      }));
    }
    
    toast.success('Folder created successfully');
  };

  const closeNewFolderDialog = () => {
    setIsNewFolderDialogOpen(false);
  };

  const openRenameFolderDialog = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToRename(folder);
    setNewRenameFolderName(folder.name);
    setIsRenameFolderDialogOpen(true);
  };

  const handleRenameFolder = () => {
    if (!folderToRename) return;
    
    if (!newRenameFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }
    
    // Check if folder with new name already exists in the same parent and cluster context
    const folderExists = folders.some(
      folder => 
        folder.parentId === folderToRename.parentId && 
        folder.id !== folderToRename.id &&
        folder.name.toLowerCase() === newRenameFolderName.toLowerCase() &&
        folder.clusterId === folderToRename.clusterId
    );

    if (folderExists) {
      toast.error('A folder with this name already exists');
      return;
    }
    
    const { folders: updatedFolders, notes: updatedNotes } = renameFolderUtil(
      folders,
      notes,
      folderToRename.id,
      newRenameFolderName
    );
    
    setFolders(updatedFolders);
    setNotes(updatedNotes);
    
    if (currentPath === folderToRename.path) {
      const folder = updatedFolders.find(f => f.id === folderToRename.id);
      if (folder) {
        setCurrentPath(folder.path);
      }
    }
    
    setIsRenameFolderDialogOpen(false);
    setFolderToRename(null);
    
    toast.success('Folder renamed successfully');
  };

  const closeRenameFolderDialog = () => {
    setIsRenameFolderDialogOpen(false);
    setFolderToRename(null);
  };

  const handleDeleteClick = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!folderToDelete) return;

    // Check for subfolders
    const hasSubFolders = folders.some(
      folder => folder.parentId === folderToDelete.id
    );
    
    if (hasSubFolders) {
      toast.error('Cannot delete a folder that contains subfolders');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      return;
    }

    // Check for notes
    const hasNotes = notes.some(
      note => note.path === folderToDelete.path && 
      (viewMode === 'folders' 
        ? (!note.clusterId || note.clusterId === 'default-cluster')
        : note.clusterId === clusterId)
    );
    
    if (hasNotes) {
      toast.error('Cannot delete a folder that contains notes');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      return;
    }
    
    if (currentPath === folderToDelete.path) {
      const parentPath = folderToDelete.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentPath(parentPath);
    }

    setFolders(folders.filter(folder => folder.id !== folderToDelete.id));
    setIsDeleteDialogOpen(false);
    setFolderToDelete(null);
    toast.success('Folder deleted successfully');
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  const handleCreateNote = (folderPath: string, e: React.MouseEvent, noteClusterId?: string) => {
    e.stopPropagation();
    
    // Determine the correct clusterId based on the view mode
    const effectiveClusterId = 
      viewMode === 'clusters' && clusterId ? 
        clusterId : 
        'default-cluster';
    
    const { id, note } = createNote(folderPath, effectiveClusterId);
    
    setNotes(prevNotes => [...prevNotes, note]);
    setActiveNoteId(id);
    
    // Update current cluster ID if we're in clusters mode
    if (viewMode === 'clusters' && clusterId) {
      setCurrentClusterId(clusterId);
    }
    
    // Expand the parent folder if the note is not in root
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

  const handleNoteClick = (noteId: string, noteClusterId?: string) => {
    setActiveNoteId(noteId);
    if (noteClusterId) {
      setCurrentClusterId(noteClusterId);
    }
  };

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (notes.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one note",
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
    
    toast("Note deleted", {
      description: "Your note has been removed",
    });
  };
  
  const toggleMovePopover = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovePopoverOpenForNoteId(movePopoverOpenForNoteId === noteId ? null : noteId);
  };
  
  const handleMoveNote = (noteId: string, targetFolderPath: string, e: React.MouseEvent, targetClusterId?: string) => {
    e.stopPropagation();
    
    // Determine the correct clusterId based on the view mode
    const effectiveTargetClusterId = 
      viewMode === 'clusters' ? 
        clusterId || targetClusterId : 
        'default-cluster';
    
    setNotes(moveNote(notes, noteId, targetFolderPath, effectiveTargetClusterId));
    
    setMovePopoverOpenForNoteId(null);
    
    toast("Note moved", {
      description: "Your note has been moved to another folder",
    });
  };

  return (
    <div className="pl-3">
      {/* Render child folders */}
      {childFolders.map((folder) => (
        <div key={folder.id} className="flex flex-col">
          <FolderItem 
            folder={folder}
            isExpanded={isExpanded(folder.id)}
            isCurrentPath={currentPath === folder.path}
            hoveredFolderId={hoveredFolderId}
            toggleFolder={toggleFolder}
            handleFolderClick={() => handleFolderClick(folder.path, folder.clusterId)}
            openNewFolderDialog={(folderId, folderPath) => openNewFolderDialog(folderId, folderPath, folder.clusterId)}
            openRenameFolderDialog={openRenameFolderDialog}
            handleDeleteClick={handleDeleteClick}
            handleCreateNote={(folderPath, e) => handleCreateNote(folderPath, e, folder.clusterId)}
            setHoveredFolderId={setHoveredFolderId}
          />
          
          {isExpanded(folder.id) && (
            <>
              {/* Render notes inside this folder */}
              {notes
                .filter(note => {
                  if (viewMode === 'folders') {
                    return note.path === folder.path && (!note.clusterId || note.clusterId === 'default-cluster');
                  } else if (viewMode === 'clusters') {
                    return note.path === folder.path && note.clusterId === clusterId;
                  }
                  return false;
                })
                .map(note => (
                  <NoteItem
                    key={note.id}
                    noteId={note.id}
                    title={note.title}
                    path={note.path}
                    clusterId={note.clusterId}
                    isActive={activeNoteId === note.id}
                    hoveredNoteId={hoveredNoteId}
                    movePopoverOpenForNoteId={movePopoverOpenForNoteId}
                    allFolders={allFolders}
                    handleNoteClick={() => handleNoteClick(note.id, note.clusterId)}
                    handleDeleteNote={handleDeleteNote}
                    toggleMovePopover={toggleMovePopover}
                    handleMoveNote={handleMoveNote}
                    setHoveredNoteId={setHoveredNoteId}
                  />
                ))
              }
              
              {/* Recursively render subfolders */}
              <FolderTree 
                parentId={folder.id} 
                path={folder.path} 
                level={level + 1} 
                clusterId={clusterId}
                viewMode={viewMode}
              />
            </>
          )}
        </div>
      ))}
      
      {/* Render root-level notes */}
      {path === '/' && 
        folderNotes.map(note => (
          <NoteItem
            key={note.id}
            noteId={note.id}
            title={note.title}
            path={note.path}
            clusterId={note.clusterId}
            isActive={activeNoteId === note.id}
            hoveredNoteId={hoveredNoteId}
            movePopoverOpenForNoteId={movePopoverOpenForNoteId}
            allFolders={allFolders.filter(f => f.path !== '/')}
            handleNoteClick={() => handleNoteClick(note.id, note.clusterId)}
            handleDeleteNote={handleDeleteNote}
            toggleMovePopover={toggleMovePopover}
            handleMoveNote={handleMoveNote}
            setHoveredNoteId={setHoveredNoteId}
          />
        ))
      }
      
      {/* New Folder button for root level only */}
      {path === '/' && (
        <div className="flex items-center py-1 px-2 mt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
            onClick={() => openNewFolderDialog(parentId, path, clusterId)}
          >
            <Plus className="h-3 w-3" /> New Folder
          </Button>
        </div>
      )}

      {/* Folder dialogs */}
      <FolderForm
        isOpen={isNewFolderDialogOpen}
        title="Create new folder"
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        onClose={closeNewFolderDialog}
        onSubmit={handleCreateFolder}
      />
      
      <FolderForm
        isOpen={isRenameFolderDialogOpen}
        title="Rename folder"
        folderName={newRenameFolderName}
        setFolderName={setNewRenameFolderName}
        onClose={closeRenameFolderDialog}
        onSubmit={handleRenameFolder}
      />

      <DeleteFolderDialog
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
