
import { useAtom } from 'jotai';
import { BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView, useBlockNote } from '@blocknote/react';
import '@blocknote/react/style.css';
import { activeNoteAtom } from '@/lib/store';
import { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';

export function NoteEditor() {
  const [activeNote, updateActiveNote] = useAtom(activeNoteAtom);
  const [editorContent, setEditorContent] = useState<any[]>([]);
  
  useEffect(() => {
    if (activeNote?.content) {
      // Make a deep copy to avoid mutating the stored note
      setEditorContent(JSON.parse(JSON.stringify(activeNote.content)));
    }
  }, [activeNote?.id]);

  // Create the editor instance
  const editor = useBlockNote({
    initialContent: editorContent,
    onEditorContentChange: (editor) => {
      const content = editor.topLevelBlocks;
      
      if (activeNote) {
        // Update note title based on first block content
        const firstBlock = content[0];
        let newTitle = 'Untitled Note';
        
        if (firstBlock && typeof firstBlock.content === 'string') {
          // Extract the first line or a portion of it as the title
          newTitle = firstBlock.content.split('\n')[0].substring(0, 40) || 'Untitled Note';
        } else if (firstBlock && Array.isArray(firstBlock.content)) {
          // Handle content that might be an array of text runs
          const textContent = firstBlock.content
            .map(run => typeof run === 'string' ? run : run.text)
            .join('');
          newTitle = textContent.substring(0, 40) || 'Untitled Note';
        }
        
        // Save the updated note with its content and new title
        updateActiveNote({
          title: newTitle,
          content: content
        });
      }
    }
  });

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No note selected
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-[#12141f] h-full">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-8">
          <BlockNoteView
            editor={editor}
            theme="light"
            className="min-h-[calc(100vh-10rem)]"
          />
        </div>
      </ScrollArea>
    </div>
  );
}
