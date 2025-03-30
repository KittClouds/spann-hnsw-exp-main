
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
    
    const unsubscribe = editor.onEditorContentChange(() => {
      saveChanges();
    });
    
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
  }, [activeNoteId, editor, activeNote]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      setActiveNote({
        title: e.target.value
      });
    }
  };

  if (!activeNote) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground bg-slate-100 dark:bg-galaxy-charcoal">
        No note selected
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1 flex flex-col overflow-hidden" direction="vertical">
      <ResizablePanel 
        defaultSize={70} 
        minSize={40}
        className="flex flex-col p-6 bg-white dark:bg-galaxy-charcoal"
      >
        <NoteBreadcrumb />
        
        <Input
          value={activeNote.title}
          onChange={handleTitleChange}
          className="text-xl font-semibold mb-4 bg-transparent border-none focus-visible:ring-0 px-0 cosmic-text"
          placeholder="Note Title"
        />
        <div className="flex-1 bg-white dark:bg-galaxy-editor rounded-md shadow-sm dark:shadow-cosmic border border-slate-200 dark:border-galaxy-dark-gray/30 transition-all duration-200 overflow-auto">
          <BlockNoteView 
            editor={editor} 
            theme={theme}
            className="min-h-full"
          />
        </div>
      </ResizablePanel>
      
      <ResizableHandle 
        withHandle 
        className="bg-slate-200 hover:bg-slate-300 dark:bg-galaxy-purple/20 dark:hover:bg-galaxy-purple/40 transition-colors"
      />
      
      <ResizablePanel 
        defaultSize={30} 
        minSize={20}
        className="border-t border-slate-200 dark:border-galaxy-dark-gray/50 bg-slate-50 dark:bg-galaxy-black"
      >
        <ConnectionsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
