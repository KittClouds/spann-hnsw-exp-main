
import React from 'react';
import { FileIcon, Trash2Icon, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder } from '@/lib/store';
import { NoteItemProps } from './types';

export function NoteItem({
  noteId,
  title,
  path,
  clusterId,
  isActive,
  hoveredNoteId,
  movePopoverOpenForNoteId,
  allFolders,
  handleNoteClick,
  handleDeleteNote,
  toggleMovePopover,
  handleMoveNote,
  setHoveredNoteId
}: NoteItemProps) {
  return (
    <div 
      className={`
        flex items-center ml-3 px-2 py-1 text-sm rounded-md
        ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 hover:text-accent-foreground cursor-pointer'}
      `}
      onClick={() => handleNoteClick(noteId)}
      onMouseEnter={() => setHoveredNoteId(noteId)}
      onMouseLeave={() => setHoveredNoteId(null)}
    >
      <FileIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
      <span className="truncate flex-1">{title}</span>
      
      {/* Show actions when hovered or dropdown is open */}
      {(hoveredNoteId === noteId || movePopoverOpenForNoteId === noteId) && (
        <div className="flex items-center">
          <Trash2Icon 
            className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive cursor-pointer ml-1"
            onClick={(e) => handleDeleteNote(noteId, e)}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground cursor-pointer ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              {allFolders.map((folder: Folder) => (
                <DropdownMenuItem 
                  key={folder.id}
                  onClick={(e: React.MouseEvent) => handleMoveNote(noteId, folder.path, e, folder.clusterId)}
                  disabled={folder.path === path}
                >
                  Move to {folder.path === '/' ? 'Home' : folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
