
import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView, useBlockNote } from '@blocknote/react';
import '@blocknote/core/style.css';
import { cn } from '@/lib/utils';

export function NoteEditor() {
  const [note, setNote] = useAtom(activeNoteAtom);
  const [activeNoteId] = useAtom(activeNoteIdAtom);
  const [title, setTitle] = useState('');
  
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const unsubscribeRef = useRef<(() => void) | undefined>();
  
  // Initialize the editor with the note content
  const editor = useBlockNote({
    initialContent: note?.content,
    editable: true,
    onContentChange: (editor) => {
      if (note) {
        // Update the note content when the editor content changes
        setNote({
          content: editor.topLevelBlocks,
        });
      }
    },
  });
  
  // Store the editor instance in a ref
  if (editor) {
    editorRef.current = editor;
  }
  
  // Update title state when the active note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
    }
  }, [note?.id]);
  
  // Update the note title when the user types in the title input
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (note) {
      // Update the note title in the store
      setNote({
        title: newTitle,
      });
    }
  };
  
  // Set up observer for content changes to maintain scroll position
  useEffect(() => {
    if (!editorRef.current) return;
    
    const previousUnsubscribe = unsubscribeRef.current;
    if (previousUnsubscribe) {
      previousUnsubscribe();
      unsubscribeRef.current = undefined;
    }
    
    // Disable freezing cursor position on editor re-renders
    // This helps with line jumping issues
    const editor = editorRef.current;
    if (editor._tiptapEditor) {
      editor._tiptapEditor.options.enableInputRules = false;
    }
    
    return () => {
      // Clean up the unsubscribe function when the component unmounts
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [activeNoteId, editorRef.current]);
  
  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No note selected</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b dark:border-galaxy-dark-purple dark:border-opacity-30 light:border-gray-200">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled Note"
          className="w-full text-xl font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 dark:text-white light:text-gray-900"
        />
      </div>
      
      <div className={cn("flex-1 overflow-auto p-4 prose prose-sm max-w-none dark:prose-invert")}>
        <BlockNoteView
          editor={editor}
          className="min-h-[calc(100vh-8rem)]"
          theme="light"
        />
      </div>
    </div>
  );
}
