import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { BlockNoteEditor, useBlockNote } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/react";
import "@blocknote/core/style.css";
import { activeNoteAtom, activeNoteIdAtom, notesAtom } from '@/lib/store';
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Edit, FileText, Plus, Search, Tag, Trash2, Upload } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner';

interface NoteEditorProps {
  
}

export function NoteEditor({}: NoteEditorProps) {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  
  const [noteTitle, setNoteTitle] = useState(activeNote?.title || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const editor: BlockNoteEditor = useBlockNote({
    readOnly: false,
  });
  
  const editorRef = useRef(editor);
  
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  
  useEffect(() => {
    if (activeNote) {
      editorRef.current.blocks = activeNote.content;
      setNoteTitle(activeNote.title);
    } else {
      editorRef.current.blocks = [];
      setNoteTitle('');
    }
  }, [activeNote, setNoteTitle, editorRef]);
  
  // Update the note title in the store when it changes
  useEffect(() => {
    if (activeNote && noteTitle !== activeNote.title) {
      setActiveNote({ title: noteTitle });
    }
  }, [noteTitle, activeNote, setActiveNote]);
  
  // Update the note content in the store when it changes
  useEffect(() => {
    if (activeNote) {
      setActiveNote({ content: editorRef.current.blocks });
    }
  }, [editorRef.current.blocks, activeNote, setActiveNote]);
  
  const handleTagSelection = (tag: string) => {
    setSelectedTag(tag);
  };
  
  const handleAddTag = () => {
    if (!activeNote) return;
    
    if (!newTag.trim()) {
      toast({
        title: "No tag provided",
        description: "Please enter a tag name",
      });
      return;
    }
    
    if (activeNote.tags.includes(newTag)) {
      toast({
        title: "Tag already exists",
        description: "This tag is already added to the note",
      });
      return;
    }
    
    setActiveNote({ tags: [...activeNote.tags, newTag] });
    setNewTag('');
    setIsDialogOpen(false);
    
    toast({
      title: "Tag added",
      description: "The tag has been added to the note",
    });
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    
    setActiveNote({ tags: activeNote.tags.filter(tag => tag !== tagToRemove) });
    
    toast({
      title: "Tag removed",
      description: "The tag has been removed from the note",
    });
  };
  
  const filteredTags = useMemo(() => {
    if (!activeNote) return [];
    
    return activeNote.tags.filter(tag =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeNote, searchQuery]);
  
  if (!activeNote) {
    return (
      <div className="h-full flex-1 p-4">
        <div className="h-full flex flex-col items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a note to start editing
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b dark:border-galaxy-dark-purple dark:border-opacity-30 light:border-gray-200">
        <Input
          type="text"
          placeholder="Untitled"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          className="text-lg font-bold bg-transparent border-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
        />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto dark:border-galaxy-dark-purple dark:border-opacity-30 dark:bg-galaxy-dark-accent dark:hover:bg-galaxy-dark-purple dark:hover:bg-opacity-50 light:border-gray-200 light:bg-white light:hover:bg-gray-100">
              <Tag className="mr-2 h-3 w-3" /> Manage Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start rounded-md hover:bg-accent">
                  <Plus className="mr-2 h-3 w-3" /> Add Tag
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Tag</DialogTitle>
                  <DialogDescription>
                    Add a new tag to the current note.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Tag
                    </Label>
                    <Input id="name" value={newTag} onChange={(e) => setNewTag(e.target.value)} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleAddTag}>Add Tag</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Command>
              <CommandInput placeholder="Search tags..." value={searchQuery} onValueChange={setSearchQuery} />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup heading="Tags">
                  <ScrollArea className="h-72">
                    {filteredTags.map((tag) => (
                      <CommandItem key={tag} onSelect={() => handleTagSelection(tag)}>
                        <Tag className="mr-2 h-3 w-3" />
                        {tag}
                        <CommandShortcut>
                          <Trash2 className="h-3 w-3" onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag);
                          }} />
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex-1">
        <BlockNoteView editor={editor} />
      </div>
    </div>
  );
}
