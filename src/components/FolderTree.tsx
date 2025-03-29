
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronRight, FolderIcon, FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Folder, currentFolderPathAtom, foldersAtom, createFolder } from '@/lib/store';
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

interface FolderTreeProps {
  parentId: string | null;
  path: string;
  level: number;
}

export function FolderTree({ parentId, path, level }: FolderTreeProps) {
  const [folders, setFolders] = useAtom(foldersAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Find children of the current folder
  const childFolders = folders.filter(folder => 
    folder.parentId === parentId && 
    (parentId !== null || folder.id !== 'root')
  );

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

  const handleDeleteFolder = (folderId: string, folderPath: string) => {
    // Check if the folder has children
    const hasChildFolders = folders.some(folder => folder.parentId === folderId);
    
    if (hasChildFolders) {
      toast.error('Cannot delete a folder that contains other folders');
      return;
    }
    
    setFolders(folders.filter(folder => folder.id !== folderId));
    
    // If we're deleting the current folder, navigate to parent
    if (currentPath === folderPath) {
      const parentPath = folderPath.split('/').slice(0, -1).join('/') || '/';
      setCurrentPath(parentPath);
    }
    
    toast.success('Folder deleted');
  };

  return (
    <div className="pl-3">
      {childFolders.map((folder) => (
        <div key={folder.id} className="flex flex-col">
          <ContextMenu>
            <ContextMenuTrigger>
              <div 
                className={cn(
                  "flex items-center py-1 px-2 rounded-md text-sm cursor-pointer transition-colors",
                  currentPath === folder.path 
                    ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                    : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
                )}
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
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleDeleteFolder(folder.id, folder.path)}>
                Delete Folder
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          
          {isExpanded(folder.id) && (
            <FolderTree 
              parentId={folder.id} 
              path={folder.path} 
              level={level + 1} 
            />
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
    </div>
  );
}
