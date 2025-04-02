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
  viewModeAtom
} from '@/lib/store';
import { FolderTreeProps } from './types';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { FolderForm } from './FolderForm';
import { DeleteFolderDialog } from './DeleteFolderDialog';

export function FolderTree({ parentId, path, level, clusterId, viewMode: propViewMode }: FolderTreeProps) {
  const [folders, setFolders] = useAtom(foldersAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [currentClusterId, setCurrentClusterId] = useAtom(currentClusterIdAtom);
  const [viewMode] = useAtom(viewModeAtom);
  
  const activeViewMode = propViewMode || viewMode;
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [movePopoverOpenForNoteId, setMovePopoverOpenForNoteId] = useState<string | null>(null);
  
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentForNewFolder, setParentForNewFolder] = useState<string | null>(null);
  const [folderPathForNewFolder, setFolderPathForNewFolder] = useState<string>("/");
  const [clusterIdForNewFolder, setClusterIdForNewFolder] = useState<string>('default-cluster');
  
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [newRenameFolderName, setNewRenameFolderName] = useState('');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const childFolders = folders.filter(folder => {
    const matchesParent = folder.parentId === parentId && (parentId !== null || folder.id !== 'root');
    
    if (activeViewMode === 'folders') {
      return matchesParent && folder.clusterId === 'default-cluster';
    } else {
      return matchesParent && folder.clusterId === (clusterId || currentClusterId);
    }
  });

  const folderNotes = notes.filter(note => {
    const matchesPath = note.path === path;
    
    if (activeViewMode === 'folders') {
      return matchesPath && note.clusterId === 'default-cluster';
    } else {
      return matchesPath && note.clusterId === (clusterId || currentClusterId);
    }
  });
  
  const allFolders = React.useMemo(() => {
    const rootFolder = { 
      id: 'root', 
      name: 'Home', 
      path: '/', 
      clusterId: activeViewMode === 'folders' ? 'default-cluster' : (clusterId || currentClusterId) 
    };
    
    let filteredFolders;
    if (activeViewMode === 'folders') {
      filteredFolders = folders.filter(f => f.id !== 'root' && f.clusterId === 'default-cluster');
    } else {
      filteredFolders = folders.filter(f => f.id !== 'root' && f.clusterId === (clusterId || currentClusterId));
    }
    
    return [rootFolder, ...filteredFolders];
  }, [folders, clusterId, currentClusterId, activeViewMode]);

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
    
    if (activeViewMode === 'folders') {
      setClusterIdForNewFolder('default-cluster');
    } else {
      setClusterIdForNewFolder(folderClusterId || clusterId || currentClusterId);
    }
    
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

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

    const hasSubFolders = folders.some(folder => folder.parentId === folderToDelete.id);
    
    if (hasSubFolders) {
      toast.error('Cannot delete a folder that contains subfolders');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      return;
    }

    const hasNotes = notes.some(note => note.path === folderToDelete.path);
    
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
    
    const noteCluster = activeViewMode === 'folders' ? 
      'default-cluster' : 
      (noteClusterId || clusterId || currentClusterId);
    
    const { id, note } = createNote(folderPath, noteCluster);
    
    setNotes(prevNotes => [...prevNotes, note]);
    setActiveNoteId(id);
    
    if (noteClusterId) {
      setCurrentClusterId(noteClusterId);
    } else if (clusterId) {
      setCurrentClusterId(clusterId);
    }
    
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
    
    setNotes(moveNote(notes, noteId, targetFolderPath, targetClusterId));
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
              {notes
                .filter(note => 
                  note.path === folder.path && 
                  (clusterId ? note.clusterId === clusterId : true)
                )
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
                clusterId={clusterId}
              />
            </>
          )}
        </div>
      ))}
      
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
