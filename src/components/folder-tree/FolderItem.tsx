
import React from 'react';
import { ChevronRight, FolderIcon, FolderOpen, Plus, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FolderItemProps } from './types';

export function FolderItem({
  folder,
  isExpanded,
  isCurrentPath,
  hoveredFolderId,
  toggleFolder,
  handleFolderClick,
  openNewFolderDialog,
  openRenameFolderDialog,
  handleDeleteClick,
  handleCreateNote,
  setHoveredFolderId
}: FolderItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div 
          className={cn(
            "flex items-center py-1 px-2 rounded-md text-sm cursor-pointer transition-colors group",
            isCurrentPath 
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
                isExpanded && "transform rotate-90"
              )} 
            />
          </button>
          
          <button 
            className="flex gap-2 items-center flex-1"
            onClick={() => handleFolderClick(folder.path)}
          >
            {isExpanded ? (
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
                onClick={(e) => {
                  e.stopPropagation();
                  openNewFolderDialog(folder.id, folder.path);
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="New folder"
              >
                <FolderIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </Button>
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
                onClick={(e) => openRenameFolderDialog(folder, e)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Rename folder"
              >
                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
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
          openNewFolderDialog(folder.id, folder.path);
        }}>
          New Folder
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => handleCreateNote(folder.path, e as React.MouseEvent)}>
          New Note
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => openRenameFolderDialog(folder, e as React.MouseEvent)}>
          Rename Folder
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          handleDeleteClick(folder, {} as React.MouseEvent);
        }}>
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
