import React, { useState } from "react";
import { ChevronRight, File, Folder, Plus, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { useAtom } from "jotai";
import { notesAtom, activeNoteIdAtom, createNote, createFolder, Note, clustersAtom, activeClusterIdAtom, deleteNote } from "@/lib/store";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarGroupAction,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { ClusterView } from "./ClusterView";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [activeClusterId] = useAtom(activeClusterIdAtom);
  
  const rootNotes = notes.filter(note => note.parentId === null && note.clusterId === activeClusterId);

  const handleNewItem = React.useCallback((type: 'note' | 'folder', parentId: string | null = null) => {
    const creator = type === 'note' ? createNote : createFolder;
    const { id, note } = creator(parentId, activeClusterId);
    setNotes(prevNotes => [...prevNotes, note]);
    if (type === 'note') {
      setActiveNoteId(id);
    }
    
    toast(`New ${type} created`, {
      description: type === 'note' ? "Start typing to edit your note" : "You can add notes inside this folder",
    });
  }, [setNotes, setActiveNoteId, activeClusterId]);

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <Tabs defaultValue="folders" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="folders">Folders</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
          </TabsList>
          <TabsContent value="folders" className="mt-0">
            <SidebarGroup>
              <SidebarGroupLabel>Notes</SidebarGroupLabel>
              <SidebarGroupAction>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Plus className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
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
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {rootNotes.map((note) => (
                    <NoteTree 
                      key={note.id} 
                      note={note} 
                      notes={notes}
                      activeNoteId={activeNoteId}
                      onSelect={setActiveNoteId}
                      onNewItem={handleNewItem}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
          <TabsContent value="clusters" className="mt-0">
            <ClusterView />
          </TabsContent>
        </Tabs>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface NoteTreeProps {
  note: Note;
  notes: Note[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  onNewItem: (type: 'note' | 'folder', parentId: string | null) => void;
}

function NoteTree({ note, notes, activeNoteId, onSelect, onNewItem }: NoteTreeProps) {
  const [notes_, setNotes] = useAtom(notesAtom);
  const isFolder = note.type === 'folder';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);

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
    if (notes.filter(n => n.type === 'folder').length <= 1) {
      toast.error("Cannot delete the last folder");
      return;
    }
    
    setNotes(prevNotes => deleteNote(prevNotes, note.id));
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
            {children.map((child) => (
              <NoteTree
                key={child.id}
                note={child}
                notes={notes}
                activeNoteId={activeNoteId}
                onSelect={onSelect}
                onNewItem={onNewItem}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
