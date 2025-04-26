
import React, { useState, useCallback } from "react";
import { ChevronRight, File, Folder, Plus, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { useAtom } from "jotai";
import { notesAtom, activeNoteIdAtom, createNote, createFolder, deleteNote } from "@/lib/store";
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
import { NoteId, ClusterId } from "@/lib/utils/ids";

interface ClusterNoteTreeProps {
  clusterId: string;
}

export function ClusterNoteTree({ clusterId }: ClusterNoteTreeProps) {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  
  const rootNotes = notes.filter(note => note.parentId === null && note.clusterId === clusterId);

  // Function to assign indicator colors and counters based on index
  const getIndicatorProps = (index: number, isFolder: boolean) => {
    if (isFolder) {
      if (index % 10 === 0) return { color: 'yellow', counter: null };
      if (index % 7 === 0) return { color: 'green', counter: null };
      
      // Add counters to some items
      if (index % 5 === 0) return { color: 'purple', counter: '+1' };
      if (index % 6 === 0) return { color: 'purple', counter: '+2' };
      if (index % 8 === 0) return { color: 'purple', counter: '+3' };
      if (index % 9 === 0) return { color: 'purple', counter: '+4' };
    }
    
    return { color: 'purple', counter: null };
  };

  const handleNewItem = useCallback((type: 'note' | 'folder', parentId: NoteId | null = null) => {
    const creator = type === 'note' ? createNote : createFolder;
    const { id, note } = creator(parentId, clusterId as ClusterId);
    setNotes(prevNotes => [...prevNotes, note]);
    if (type === 'note') {
      setActiveNoteId(id);
    }
    
    toast(`New ${type} created`, {
      description: type === 'note' ? "Start typing to edit your note" : "You can add notes inside this folder",
    });
  }, [setNotes, setActiveNoteId, clusterId]);

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
            <Folder className="mr-1 h-3.5 w-3.5 text-[#FFBE0B]" />
            Add Folder
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 flex-1"
            onClick={() => handleNewItem('note')}
          >
            <File className="mr-1 h-3.5 w-3.5 text-[#7C5BF1]" />
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
              <File className="mr-2 h-4 w-4 text-[#7C5BF1]" />
              New Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNewItem('folder')}>
              <Folder className="mr-2 h-4 w-4 text-[#FFBE0B]" />
              New Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {rootNotes.map((note, index) => (
        <ClusterNoteTreeItem
          key={note.id}
          note={note}
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={setActiveNoteId}
          onNewItem={handleNewItem}
          clusterId={clusterId}
          index={index}
          getIndicatorProps={getIndicatorProps}
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
  onNewItem: (type: 'note' | 'folder', parentId: NoteId | null) => void;
  clusterId: string;
  index: number;
  getIndicatorProps: (index: number, isFolder: boolean) => { color: string; counter: string | null };
}

function ClusterNoteTreeItem({ 
  note, 
  notes, 
  activeNoteId, 
  onSelect, 
  onNewItem, 
  clusterId,
  index,
  getIndicatorProps 
}: ClusterNoteTreeItemProps) {
  const [notes_, setNotes] = useAtom(notesAtom);
  const isFolder = note.type === 'folder';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  
  const childNotes = notes.filter(n => n.parentId === note.id && n.clusterId === clusterId);
  const { color, counter } = getIndicatorProps(index, isFolder);

  const handleRename = () => {
    if (editTitle.trim() === '') {
      toast.error("Folder name cannot be empty");
      setEditTitle(note.title);
      return;
    }
    
    setNotes(prevNotes => 
      prevNotes.map(n => 
        n.id === note.id 
          ? { ...n, title: editTitle, updatedAt: new Date().toISOString() }
          : n
      )
    );
    setIsEditing(false);
    toast.success("Renamed successfully");
  };

  const handleDelete = () => {
    if (isFolder && notes.filter(n => n.type === 'folder' && n.clusterId === clusterId).length <= 1) {
      toast.error("Cannot delete the last folder");
      return;
    }
    
    setNotes(prevNotes => deleteNote(prevNotes, note.id));
    toast.success("Deleted successfully");
  };

  if (!isFolder) {
    return (
      <SidebarMenuItem>
        <div className="flex items-center">
          <div className={`sidebar-indicator indicator-${color} mr-2`}></div>
          {counter && <span className="indicator-counter mr-1">{counter}</span>}
          <SidebarMenuButton
            isActive={activeNoteId === note.id}
            onClick={() => onSelect(note.id)}
            className={`flex-1 ${activeNoteId === note.id ? 'bg-[#12141f]' : ''}`}
          >
            <File className="shrink-0 text-[#7C5BF1]" />
            <span className="truncate">{note.title || "Untitled Note"}</span>
          </SidebarMenuButton>
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between pr-2">
          <div className="flex items-center">
            <div className={`sidebar-indicator indicator-${color} mr-2`}></div>
            {counter && <span className="indicator-counter mr-1">{counter}</span>}
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex-1 [&[data-state=open]>svg:first-child]:rotate-90">
                <ChevronRight className="shrink-0 transition-transform" />
                <Folder className="shrink-0 text-[#FFBE0B]" />
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
          </div>
          
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
                <File className="mr-2 h-4 w-4 text-[#7C5BF1]" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewItem('folder', note.id)}>
                <Folder className="mr-2 h-4 w-4 text-[#FFBE0B]" />
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
            {childNotes.map((child, childIndex) => (
              <ClusterNoteTreeItem
                key={child.id}
                note={child}
                notes={notes}
                activeNoteId={activeNoteId}
                onSelect={onSelect}
                onNewItem={onNewItem}
                clusterId={clusterId}
                index={index * 10 + childIndex}
                getIndicatorProps={getIndicatorProps}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
