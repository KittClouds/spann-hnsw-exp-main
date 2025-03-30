
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useState } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { PartialBlock } from '@blocknote/core';
import { debounce } from 'lodash';
import { NoteBreadcrumb } from './NoteBreadcrumb';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { ConnectionsPanel } from './ConnectionsPanel';

export function NoteEditor() {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [activeNoteId] = useAtom(activeNoteIdAtom);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  // Create editor instance
  const editor = useBlockNote({
    initialContent: activeNote?.content as PartialBlock[] || [],
  });

  // Update theme when app theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    // Initial check
    handleThemeChange();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Save changes to note content when editor changes
  const saveChanges = debounce(() => {
    if (editor && activeNote) {
      const blocks = editor.document;
      setActiveNote({
        content: blocks,
      });
    }
  }, 500);

  // Set up editor change handler
  useEffect(() => {
    if (!editor) return;
    
    const handleEditorChange = () => {
      saveChanges();
    };
    
    // Use the returned unsubscribe function
    const unsubscribe = editor.onEditorContentChange(handleEditorChange);
    
    return () => {
      saveChanges.cancel();
      if (unsubscribe) unsubscribe();
    };
  }, [editor, saveChanges, activeNote]);

  // Load note content when active note changes
  useEffect(() => {
    if (editor && activeNote?.content) {
      try {
        // Replace the editor content with the active note content
        editor.replaceBlocks(editor.document, activeNote.content as PartialBlock[]);
      } catch (error) {
        console.error("Error replacing blocks:", error);
      }
    }
  }, [activeNoteId, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      setActiveNote({
        title: e.target.value
      });
    }
  };

  if (!activeNote) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
        <p className="italic">No note selected</p>
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1 flex flex-col overflow-hidden" direction="vertical">
      <ResizablePanel 
        defaultSize={70} 
        minSize={40}
        className="flex flex-col p-6 dark:bg-[#0f1729]/70 light:bg-white/80 backdrop-blur-sm"
      >
        <NoteBreadcrumb />
        
        <Input
          value={activeNote.title}
          onChange={handleTitleChange}
          className="text-xl font-semibold mb-4 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-accent/50 px-0 cosmos-text-gradient"
          placeholder="Note Title"
        />
        
        <div className="flex-1 note-container transition-all duration-200 overflow-auto">
          <BlockNoteView 
            editor={editor} 
            theme={theme}
            className="min-h-full"
          />
        </div>
      </ResizablePanel>
      
      <ResizableHandle className="h-1 bg-border/30 hover:bg-accent/30 transition-colors" withHandle />
      
      <ResizablePanel 
        defaultSize={30} 
        minSize={20}
        className="border-t border-border/50 dark:bg-[#0f1729]/90 light:bg-gray-50/90 backdrop-blur-sm"
      >
        <ConnectionsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
