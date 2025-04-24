
import * as React from "react";
import { ChevronRight, File, Folder, Plus } from "lucide-react";
import { useAtom } from "jotai";
import { notesAtom, activeNoteIdAtom, createNote, createFolder, Note } from "@/lib/store";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  
  const rootNotes = notes.filter(note => note.parentId === null);

  // Handle creating a new note at root level
  const handleNewItem = React.useCallback((type: 'note' | 'folder', parentId: string | null = null) => {
    const creator = type === 'note' ? createNote : createFolder;
    const { id, note } = creator(parentId);
    setNotes(prevNotes => [...prevNotes, note]);
    if (type === 'note') {
      setActiveNoteId(id);
    }
    
    toast(`New ${type} created`, {
      description: type === 'note' ? "Start typing to edit your note" : "You can add notes inside this folder",
    });
  }, [setNotes, setActiveNoteId]);

  return (
    <Sidebar {...props}>
      <SidebarContent>
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
  const children = notes.filter(n => n.parentId === note.id);
  const isFolder = note.type === 'folder';

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
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="[&[data-state=open]>svg:first-child]:rotate-90">
            <ChevronRight className="shrink-0 transition-transform" />
            <Folder className="shrink-0" />
            <span className="truncate">{note.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-full justify-start px-2 hover:bg-accent/50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onNewItem('note', note.id)}>
                  <File className="mr-2 h-4 w-4" />
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNewItem('folder', note.id)}>
                  <Folder className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
