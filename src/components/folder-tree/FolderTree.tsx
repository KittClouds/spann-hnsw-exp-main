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
  viewModeAtom,
} from '@/lib/store';
import { FolderTreeProps } from './types';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { FolderForm } from './FolderForm';
import { DeleteFolderDialog } from './DeleteFolderDialog';

export function FolderTree({ parentId, path, level, clusterId }: FolderTreeProps) {
  const [folders, setFolders] = useAtom(foldersAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [currentClusterId, setCurrentClusterId] = useAtom(currentClusterIdAtom);
  const [viewMode] = useAtom(viewModeAtom);
  
  // State for UI interactions
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [movePopoverOpenForNoteId, setMovePopoverOpenForNoteId] = useState<string | null>(null);
  
  // State for folder creation dialog
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentForNewFolder, setParentForNewFolder] = useState<string | null>(null);
  const [folderPathForNewFolder, setFolderPathForNewFolder] = useState<string>("/");
  const [clusterIdForNewFolder, setClusterIdForNewFolder] = useState<string>('default-cluster');
  
  // State for folder renaming dialog
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [newRenameFolderName, setNewRenameFolderName] = useState('');
  
  // State for folder deletion dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  // Find children of the current folder, filtered by view mode
  const childFolders = folders.filter(folder => {
    // Basic parent matching
    const matchesParent = folder.parentId === parentId && (parentId !== null || folder.id !== 'root');
    
    // Apply different filtering based on view mode
    if (viewMode === 'folders') {
      // In folders mode, show all folders without considering cluster
      return matchesParent;
    } else {
      // In clusters mode, only show folders from the specified cluster
      const matchesCluster = clusterId ? folder.clusterId === clusterId : false;
      return matchesParent && matchesCluster;
    }
  });

  // Find notes in the current folder, filtered by view mode
  const folderNotes = notes.filter(note => {
    const matchesPath = note.path === path;
    
    // Apply different filtering based on view mode
    if (viewMode === 'folders') {
      // In folders mode, show all notes in this path
      return matchesPath;
    } else {
      // In clusters mode, only show notes from the specified cluster
      const matchesCluster = clusterId ? note.clusterId === clusterId : false;
      return matchesPath && matchesCluster;
    }
  });
  
  // Generate a list of all folders for the move note dropdown
  // Filter based on the current view mode
  const allFolders = React.useMemo(() => {
    // Start with the root folder
    const rootFolder = { id: 'root', name: 'Home', path: '/', clusterId: clusterId || 'default-cluster' };
    
    if (viewMode === 'clusters' && clusterId) {
      // In clusters view, only show folders from the current cluster
      return [rootFolder, ...folders.filter(f => f.id !== 'root' && f.clusterId === clusterId)];
    } else if (viewMode === 'folders') {
      // In folders view, show all folders regardless of cluster
      return [rootFolder, ...folders.filter(f => f.id !== 'root')];
    }
    
    return [rootFolder];
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
    if (folderClusterId && viewMode === 'clusters') {
      setCurrentClusterId(folderClusterId);
    }
  };

  const openNewFolderDialog = (parentFolderId: string | null, folderPath: string, folderClusterId?: string) => {
    setParentForNewFolder(parentFolderId);
    setFolderPathForNewFolder(folderPath);
    setNewFolderName('');
    
    // Set the cluster ID based on the view mode
    if (viewMode === 'clusters' && folderClusterId) {
      setClusterIdForNewFolder(folderClusterId);
    } else if (viewMode === 'clusters' && clusterId) {
      setClusterIdForNewFolder(clusterId);
    } else {
      // In folders view, use the default cluster ID
      setClusterIdForNewFolder('default-cluster');
    }
    
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    // Check if folder name already exists at this level and in the appropriate scope
    let folderExists;
    
    if (viewMode === 'clusters') {
      // In clusters view, check only within the current cluster
      folderExists = folders.some(
        folder => 
          folder.parentId === parentForNewFolder && 
          folder.name.toLowerCase() === newFolderName.toLowerCase() &&
          folder.clusterId === clusterIdForNewFolder
      );
    } else {
      // In folders view, check across all folders at this level
      folderExists = folders.some(
        folder => 
          folder.parentId === parentForNewFolder && 
          folder.name.toLowerCase() === newFolderName.toLowerCase()
      );
    }

    if (folderExists) {
      toast.error('A folder with this name already exists');
      return;
    }

    const { folder } = createFolder(
      newFolderName, 
      folderPathForNewFolder, 
      folderPathForNewFolder === '/' ? null : folders.find(f => f.path === folderPathForNewFolder)?.id || null,
      clusterIdForNewFolder
    );
    
    setFolders([...folders, folder]);
    setIsNewFolderDialogOpen(false);
    
    // Expand the parent folder
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

  // Functions for folder renaming
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
    
    // Check if the new name is the same as the old one
    if (folderToRename.name === newRenameFolderName) {
      setIsRenameFolderDialogOpen(false);
      setFolderToRename(null);
      return;
    }
    
    // Check if folder name already exists at this level
    const folderExists = folders.some(
      folder => 
        folder.parentId === folderToRename.parentId && 
        folder.id !== folderToRename.id &&
        folder.name.toLowerCase() === newRenameFolderName.toLowerCase() &&
        (viewMode === 'clusters' ? folder.clusterId === folderToRename.clusterId : true)
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
    
    // Update current path if we're renaming the current folder
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

  // Functions for folder deletion
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
  const handleCreateNote = (folderPath: string, e: React.MouseEvent, noteClusterId?: string) => {
    e.stopPropagation();
    
    // Determine the correct cluster ID based on view mode
    let targetClusterId;
    
    if (viewMode === 'clusters') {
      targetClusterId = noteClusterId || clusterId;
    } else {
      // In folders view, use the default cluster
      targetClusterId = 'default-cluster';
    }
    
    const { id, note } = createNote(
      folderPath, 
      targetClusterId
    );
    
    // Add the new note to the notes array
    setNotes(prevNotes => [...prevNotes, note]);
    
    // Set the new note as active
    setActiveNoteId(id);
    
    // Set current cluster ID if in clusters view
    if (viewMode === 'clusters' && targetClusterId) {
      setCurrentClusterId(targetClusterId);
    }
    
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

  const handleNoteClick = (noteId: string, noteClusterId?: string) => {
    setActiveNoteId(noteId);
    
    // Only update cluster ID in clusters view
    if (viewMode === 'clusters' && noteClusterId) {
      setCurrentClusterId(noteClusterId);
    }
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
  
  // Toggle the move popover for a specific note
  const toggleMovePopover = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // If the popover is already open for this note, close it; otherwise, open it
    setMovePopoverOpenForNoteId(movePopoverOpenForNoteId === noteId ? null : noteId);
  };
  
  // Handle moving a note to a folder
  const handleMoveNote = (noteId: string, targetFolderPath: string, e: React.MouseEvent, targetClusterId?: string) => {
    e.stopPropagation();
    
    // Determine the correct target cluster ID based on view mode
    let effectiveTargetClusterId = targetClusterId;
    
    if (!effectiveTargetClusterId) {
      effectiveTargetClusterId = viewMode === 'clusters' ? clusterId : undefined;
    }
    
    // Update the notes array with the moved note
    setNotes(moveNote(notes, noteId, targetFolderPath, effectiveTargetClusterId));
    
    // Close the popover
    setMovePopoverOpenForNoteId(null);
    
    toast("Note moved", {
      description: "Your note has been moved to another folder",
    });
  };

  return (
    <div className="pl-3">
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
              {/* Notes for this folder */}
              {notes
                .filter(note => {
                  const noteInFolder = note.path === folder.path;
                  
                  // Filter notes based on view mode
                  if (viewMode === 'clusters') {
                    return noteInFolder && note.clusterId === folder.clusterId;
                  } else {
                    return noteInFolder;
                  }
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
              
              <FolderTree 
                parentId={folder.id} 
                path={folder.path} 
                level={level + 1} 
                clusterId={viewMode === 'clusters' ? folder.clusterId : undefined}
              />
            </>
          )}
        </div>
      ))}
      
      {/* Root level notes */}
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
      
      {/* Root level "New Folder" button */}
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

      {/* Dialog for creating new folders */}
      <FolderForm
        isOpen={isNewFolderDialogOpen}
        title="Create new folder"
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        onClose={closeNewFolderDialog}
        onSubmit={handleCreateFolder}
      />
      
      {/* Dialog for renaming folders */}
      <FolderForm
        isOpen={isRenameFolderDialogOpen}
        title="Rename folder"
        folderName={newRenameFolderName}
        setFolderName={setNewRenameFolderName}
        onClose={closeRenameFolderDialog}
        onSubmit={handleRenameFolder}
      />

      {/* Alert dialog for confirming folder deletion */}
      <DeleteFolderDialog
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
