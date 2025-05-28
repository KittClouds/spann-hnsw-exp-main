
import React, { useState, useCallback } from "react";
import { ChevronRight, File, Folder, Plus, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { useNotes, useActiveNoteId, useNoteActions } from "@/hooks/useLiveStore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { generateNoteId } from "@/lib/utils/ids";

interface ClusterNoteTreeProps {
  clusterId: string;
}

export function ClusterNoteTree({ clusterId }: ClusterNoteTreeProps) {
  const notes = useNotes();
  const [activeNoteId, setActiveNoteId] = useActiveNoteId();
  const { createNote } = useNoteActions();
  
  const rootNotes = notes.filter(note => note.parentId === null && note.clusterId === clusterId);

  const handleNewItem = useCallback((type: 'note' | 'folder', parentId: string | null = null) => {
    const newNote = {
      id: generateNoteId(),
      parentId,
      clusterId,
      title: type === 'note' ? 'Untitled Note' : 'New Folder',
      content: [],
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      path: null,
      tags: null,
      mentions: null
    };
    
    createNote(newNote);
    if (type === 'note') {
      setActiveNoteId(newNote.id);
    }
    
    toast(`New ${type} created`, {
      description: type === 'note' ? "Start typing to edit your note" : "You can add notes inside this folder",
    });
  }, [setActiveNoteId, clusterId, createNote]);

  if (rootNotes.length === 0) {
    return (
      <div className="py-2 px-1">
        <div className="text-xs text-muted-foreground mb-2">No items yet</div>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 flex-1"
            onClick={() => handleNewItem('folder')}
          >
            <Folder className="mr-1 h-3.5 w-3.5" />
            Add Folder
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 flex-1"
            onClick={() => handleNewItem('note')}
          >
            <File className="mr-1 h-3.5 w-3.5" />
            Add Note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarMenu>
      <div className="flex justify-end mb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost"
              size="sm"
              className="h-6 w-6"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleNewItem('note')}>
              <File className="mr-2 h-4 w-4" />
              New Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNewItem('folder')}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {rootNotes.map((note) => (
        <ClusterNoteTreeItem
          key={note.id}
          note={note}
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={setActiveNoteId}
          onNewItem={handleNewItem}
          clusterId={clusterId}
        />
      ))}
    </SidebarMenu>
  );
}

interface ClusterNoteTreeItemProps {
  note: any;
  notes: any[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  onNewItem: (type: 'note' | 'folder', parentId: string | null) => void;
  clusterId: string;
}

function ClusterNoteTreeItem({ note, notes, activeNoteId, onSelect, onNewItem, clusterId }: ClusterNoteTreeItemProps) {
  const { updateNote, deleteNote } = useNoteActions();
  const isFolder = note.type === 'folder';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  
  const childNotes = notes.filter(n => n.parentId === note.id && n.clusterId === clusterId);

  const handleRename = () => {
    if (editTitle.trim() === '') {
      toast.error("Folder name cannot be empty");
      setEditTitle(note.title);
      return;
    }
    
    updateNote(note.id, { title: editTitle });
    setIsEditing(false);
    toast.success("Renamed successfully");
  };

  const handleDelete = () => {
    if (isFolder && notes.filter(n => n.type === 'folder' && n.clusterId === clusterId).length <= 1) {
      toast.error("Cannot delete the last folder");
      return;
    }
    
    deleteNote(note.id);
    toast.success("Deleted successfully");
  };

  if (!isFolder) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeNoteId === note.id}
          onClick={() => onSelect(note.id)}
        >
          <File className="shrink-0" />
          <span className="truncate">{note.title || "Untitled Note"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between pr-2">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="flex-1 [&[data-state=open]>svg:first-child]:rotate-90">
              <ChevronRight className="shrink-0 transition-transform" />
              <Folder className="shrink-0" />
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditTitle(note.title);
                    }
                  }}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 px-1 flex-1"
                  autoFocus
                />
              ) : (
                <span className="truncate">{note.title}</span>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open folder menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onNewItem('note', note.id)}>
                <File className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewItem('folder', note.id)}>
                <Folder className="mr-2 h-4 w-4" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setIsEditing(true);
                setEditTitle(note.title);
              }}>
                <PenLine className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <CollapsibleContent>
          <SidebarMenuSub>
            {childNotes.map((child) => (
              <ClusterNoteTreeItem
                key={child.id}
                note={child}
                notes={notes}
                activeNoteId={activeNoteId}
                onSelect={onSelect}
                onNewItem={onNewItem}
                clusterId={clusterId}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
