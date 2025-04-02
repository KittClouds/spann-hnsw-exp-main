
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef, useCallback } from 'react';
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
  const contentInitializedRef = useRef(false);
  
  // Initialize editor with proper defaults
  const editor = useBlockNote({
    initialContent: activeNote?.content && Array.isArray(activeNote.content) && activeNote.content.length > 0 
      ? activeNote.content as PartialBlock[] 
      : [{ type: "paragraph", content: [] }],
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    handleThemeChange();

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

  // Use callback to create a stable debounced function reference
  const saveChanges = useCallback(
    debounce((editor, activeNote, setActiveNote) => {
      if (editor && activeNote) {
        const blocks = editor.document;
        setActiveNote({
          content: blocks,
        });
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (!editor) return;
    
    const unsubscribe = editor.onEditorContentChange(() => {
      saveChanges(editor, activeNote, setActiveNote);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      saveChanges.cancel();
    };
  }, [editor, activeNote, setActiveNote, saveChanges]);

  // Fix the editor content update logic to prevent cursor jumping
  useEffect(() => {
    if (!editor || !activeNoteId || !activeNote) return;
    
    // Only update content when note ID changes or on first load
    if (!contentInitializedRef.current || editor.document.length === 0) {
      if (activeNote?.content && Array.isArray(activeNote.content) && activeNote.content.length > 0) {
        try {
          editor.replaceBlocks(editor.document, activeNote.content as PartialBlock[]);
          contentInitializedRef.current = true;
        } catch (error) {
          console.error("Error replacing blocks:", error);
          editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
          contentInitializedRef.current = true;
        }
      } else {
        editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
        contentInitializedRef.current = true;
      }
    }
  }, [activeNoteId, editor, activeNote]);

  // Reset content initialized flag when note changes
  useEffect(() => {
    contentInitializedRef.current = false;
  }, [activeNoteId]);

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
