
import React, { useState } from "react";
import { ChevronRight, File, Folder, Plus, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { useAtom } from "jotai";
import { notesAtom, activeNoteIdAtom, createNote, createFolder, Note, clustersAtom, activeClusterIdAtom, deleteNote } from "@/lib/store";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { ClusterView } from "./ClusterView";
import { NoteId, ClusterId } from "@/lib/utils/ids";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [activeClusterId] = useAtom(activeClusterIdAtom);
  const [activeTab, setActiveTab] = useState<string>("folders");
  
  const rootNotes = notes.filter(note => note.parentId === null && note.clusterId === activeClusterId);
  
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

  const handleNewItem = React.useCallback((type: 'note' | 'folder', parentId: NoteId | null = null) => {
    const creator = type === 'note' ? createNote : createFolder;
    const { id, note } = creator(parentId, activeClusterId as ClusterId);
    setNotes(prevNotes => [...prevNotes, note]);
    if (type === 'note') {
      setActiveNoteId(id);
    }
    
    toast(`New ${type} created`, {
      description: type === 'note' ? "Start typing to edit your note" : "You can add notes inside this folder",
    });
  }, [setNotes, setActiveNoteId, activeClusterId]);

  return (
    <Sidebar className="bg-black border-r border-[#1a1b23]" {...props}>
      <SidebarContent>
        <Tabs defaultValue="folders" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-transparent border-b border-[#1a1b23] rounded-none p-0 h-auto">
            <TabsTrigger 
              value="folders" 
              className="rounded-none border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 sidebar-tab-inactive data-[state=active]:sidebar-tab-active"
            >
              Folders
            </TabsTrigger>
            <TabsTrigger 
              value="clusters" 
              className="rounded-none border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 sidebar-tab-inactive data-[state=active]:sidebar-tab-active"
            >
              Clusters
            </TabsTrigger>
          </TabsList>
          <TabsContent value="folders" className="mt-0">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">Notes</SidebarGroupLabel>
              <SidebarGroupAction>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Plus className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
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
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu className="px-1">
                  {rootNotes.map((note, index) => (
                    <NoteTree 
                      key={note.id} 
                      note={note} 
                      notes={notes}
                      activeNoteId={activeNoteId}
                      onSelect={setActiveNoteId}
                      onNewItem={handleNewItem}
                      index={index}
                      getIndicatorProps={getIndicatorProps}
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
            <Button className="w-full bg-[#7C5BF1] hover:bg-[#7C5BF1]/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {activeTab === "folders" ? (
              <>
                <DropdownMenuItem onClick={() => handleNewItem('note')}>
                  <File className="mr-2 h-4 w-4 text-[#7C5BF1]" />
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNewItem('folder')}>
                  <Folder className="mr-2 h-4 w-4 text-[#FFBE0B]" />
                  New Folder
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => {
                const clusterButton = document.querySelector('.ClusterView button:has(.h-3\\.5.w-3\\.5)') as HTMLButtonElement;
                if (clusterButton) clusterButton.click();
              }}>
                <Folder className="mr-2 h-4 w-4 text-[#FFBE0B]" />
                New Cluster
              </DropdownMenuItem>
            )}
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
  onNewItem: (type: 'note' | 'folder', parentId: NoteId | null) => void;
  index: number;
  getIndicatorProps: (index: number, isFolder: boolean) => { color: string; counter: string | null };
}

function NoteTree({ note, notes, activeNoteId, onSelect, onNewItem, index, getIndicatorProps }: NoteTreeProps) {
  const [notes_, setNotes] = useAtom(notesAtom);
  const isFolder = note.type === 'folder';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  
  const childNotes = notes.filter(n => n.parentId === note.id);
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
        <div className="flex items-center">
          <div className={`sidebar-indicator indicator-${color} mr-2`}></div>
          {counter && <span className="indicator-counter mr-1">{counter}</span>}
          <SidebarMenuButton
            isActive={activeNoteId === note.id}
            className={`rounded-md transition-colors duration-200 hover:bg-[#12141f] ${
              activeNoteId === note.id ? 'sidebar-note-active-dark' : ''
            }`}
            onClick={() => onSelect(note.id)}
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
          <div className="flex items-center flex-1">
            <div className={`sidebar-indicator indicator-${color} mr-2`}></div>
            {counter && <span className="indicator-counter mr-1">{counter}</span>}
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex-1 rounded-md transition-colors duration-200 hover:bg-[#12141f] [&[data-state=open]>svg:first-child]:rotate-90">
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
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
              >
                <MoreVertical className="h-4 w-4" />
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
              <NoteTree
                key={child.id}
                note={child}
                notes={notes}
                activeNoteId={activeNoteId}
                onSelect={onSelect}
                onNewItem={onNewItem}
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
