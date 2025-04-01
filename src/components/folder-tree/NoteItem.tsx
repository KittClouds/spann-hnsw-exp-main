
import React from 'react';
import { FileIcon, MoveIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
      className={cn(
        "pl-6 py-1 pr-2 flex items-center text-sm cursor-pointer group",
        isActive 
          ? "dark:bg-[#1c1f2e]/60 dark:text-white light:bg-[#e5deff]/60 light:text-[#614ac2]" 
          : "hover:dark:bg-[#1c1f2e]/30 hover:light:bg-[#e5deff]/30"
      )}
      onClick={handleNoteClick}
      onMouseEnter={() => setHoveredNoteId(noteId)}
      onMouseLeave={() => setHoveredNoteId(null)}
    >
      <FileIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
      <span className="truncate flex-1">{title}</span>
      
      {hoveredNoteId === noteId && (
        <>
          <Popover 
            open={movePopoverOpenForNoteId === noteId}
            onOpenChange={(open) => {
              if (!open) setHoveredNoteId(null);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => toggleMovePopover(noteId, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                title="Move note"
              >
                <MoveIcon className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 w-48" 
              align="end"
              side="right"
            >
              <div className="py-1 bg-popover rounded-md shadow-md border border-border">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Move to folder
                </div>
                {allFolders
                  .filter(f => 
                    f.path !== (path === '/' ? '/' : path.split('/').slice(0, -1).join('/') || '/')
                  )
                  .map(targetFolder => (
                    <button 
                      key={targetFolder.id}
                      className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => handleMoveNote(noteId, targetFolder.path, e, targetFolder.clusterId)}
                    >
                      {targetFolder.name === 'Home' ? 'Root' : targetFolder.name}
                    </button>
                  ))
                }
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDeleteNote(noteId, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
          </Button>
        </>
      )}
    </div>
  );
}
