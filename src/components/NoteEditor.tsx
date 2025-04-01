
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from 'react';
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
  
  // Create editor instance with default content if activeNote.content is empty
  const editor = useBlockNote({
    initialContent: activeNote?.content && Array.isArray(activeNote.content) && activeNote.content.length > 0 
      ? activeNote.content as PartialBlock[] 
      : [{ type: "paragraph", content: [] }],
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

  // Reference to keep track of the debounced save function
  const saveChangesRef = useRef<ReturnType<typeof debounce>>();
  
  // Create a debounced save function
  useEffect(() => {
    saveChangesRef.current = debounce(() => {
      if (editor && activeNote) {
        const blocks = editor.document;
        setActiveNote({
          content: blocks,
        });
      }
    }, 500);
    
    return () => {
      // Cancel the debounce on unmount
      saveChangesRef.current?.cancel();
    };
  }, [editor, activeNote, setActiveNote]);

  // Set up editor change handler
  useEffect(() => {
    if (!editor || !saveChangesRef.current) return;
    
    const unsubscribe = editor.onEditorContentChange(() => {
      if (saveChangesRef.current) {
        saveChangesRef.current();
      }
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [editor]);

  // Load note content when active note changes, but only once
  useEffect(() => {
    if (editor && activeNote?.content && Array.isArray(activeNote.content) && activeNote.content.length > 0) {
      try {
        // Use a try/catch to avoid breaking if the content format is unexpected
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
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center p-8 max-w-md">
          <h3 className="text-xl font-medium mb-2">No note selected</h3>
          <p className="text-sm">Select a note from the sidebar or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1 flex flex-col overflow-hidden" direction="vertical">
      <ResizablePanel 
        defaultSize={70} 
        minSize={40}
        className="flex flex-col p-6 dark:bg-galaxy-dark light:bg-white"
      >
        <NoteBreadcrumb />
        
        <Input
          value={activeNote.title}
          onChange={handleTitleChange}
          className="text-xl font-semibold mb-4 bg-transparent border-none focus-visible:ring-0 px-0 dark:cosmic-text-gradient-dark light:cosmic-text-gradient-light"
          placeholder="Note Title"
        />

        <div className="flex-1 dark:cosmic-editor-dark light:cosmic-editor-light rounded-lg overflow-auto transition-all duration-200">
          <BlockNoteView 
            editor={editor} 
            theme={theme}
            className="min-h-full"
          />
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />
      
      <ResizablePanel 
        defaultSize={30} 
        minSize={20}
        className="dark:bg-galaxy-dark-accent light:bg-gray-50 border-t dark:border-galaxy-dark-purple dark:border-opacity-30 light:border-gray-200"
      >
        <ConnectionsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
