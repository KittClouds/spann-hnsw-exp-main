
import * as React from "react";
import { ChevronRight, File, Plus } from "lucide-react";
import { useAtom } from "jotai";
import { notesAtom, activeNoteIdAtom, createNote } from "@/lib/store";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  
  // Handle creating a new note
  const handleNewNote = React.useCallback(() => {
    const { id, note } = createNote();
    setNotes(prevNotes => [...prevNotes, note]);
    setActiveNoteId(id);
    
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  }, [setNotes, setActiveNoteId]);

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupAction onClick={handleNewNote}>
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  <NoteItem 
                    title={note.title} 
                    id={note.id}
                    isActive={activeNoteId === note.id}
                    onClick={() => setActiveNoteId(note.id)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button 
          onClick={handleNewNote}
          className="w-full dark:bg-[#7c5bf1] dark:hover:bg-[#6b4ad5] light:bg-[#614ac2] light:hover:bg-[#563db0] text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NoteItem({ 
  title, 
  id, 
  isActive, 
  onClick 
}: { 
  title: string; 
  id: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuButton
      isActive={isActive}
      onClick={onClick}
      className={`
        data-[active=true]:bg-transparent
        data-[active=true]:dark:sidebar-note-active-dark
        data-[active=true]:light:sidebar-note-active-light
      `}
    >
      <File className="shrink-0" />
      <span className="truncate">{title || "Untitled Note"}</span>
    </SidebarMenuButton>
  );
}
