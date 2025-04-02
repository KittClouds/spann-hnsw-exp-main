
import React, { useState } from 'react';
import { ChevronRight, Edit, Layers, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FolderTree } from './FolderTree';
import { useAtom } from 'jotai';
import { currentFolderPathAtom } from '@/lib/store';
import { ClusterItemProps } from './types';

export function ClusterItem({
  cluster,
  isExpanded,
  isActive,
  hoveredClusterId,
  toggleCluster,
  handleClusterClick,
  openRenameClusterDialog,
  handleDeleteClick,
  handleCreateFolder,
  handleCreateNote,
  setHoveredClusterId
}: ClusterItemProps) {
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="flex flex-col">
          <div 
            className={cn(
              "flex items-center py-1 px-2 rounded-md text-sm cursor-pointer transition-colors group",
              isActive 
                ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
                : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
            )}
            onMouseEnter={() => setHoveredClusterId(cluster.id)}
            onMouseLeave={() => setHoveredClusterId(null)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleCluster(cluster.id);
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
              className="flex items-center gap-2 flex-1"
              onClick={() => handleClusterClick(cluster.id)}
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>{cluster.name}</span>
            </button>

            {hoveredClusterId === cluster.id && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleCreateFolder(cluster.id, e)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="New folder"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleCreateNote(cluster.id, e)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="New note"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => openRenameClusterDialog(cluster, e)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename cluster"
                >
                  <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(cluster, e)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete cluster"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </>
            )}
          </div>
          
          {isExpanded && (
            <div className="ml-4">
              <FolderTree 
                parentId={null} 
                path="/" 
                level={0} 
                clusterId={cluster.id}
                viewMode="clusters" 
              />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={(e) => handleCreateFolder(cluster.id, e as React.MouseEvent)}>
          New Folder
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => handleCreateNote(cluster.id, e as React.MouseEvent)}>
          New Note
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => openRenameClusterDialog(cluster, e as React.MouseEvent)}>
          Rename Cluster
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => handleDeleteClick(cluster, e as React.MouseEvent)}>
          Delete Cluster
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
