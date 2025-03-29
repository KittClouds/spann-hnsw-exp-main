
import { useAtom } from 'jotai';
import { BlockNoteEditor } from '@blocknote/core';
import { useBlockNote, BlockNoteViewRaw as BlockNoteView } from '@blocknote/react';
import '@blocknote/react/style.css';
import { activeNoteAtom } from '@/lib/store';
import { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';

export function NoteEditor() {
  const [activeNote, updateActiveNote] = useAtom(activeNoteAtom);
  const [editorContent, setEditorContent] = useState<any[]>([
    {
      id: `default-block-${Date.now()}`,
      type: 'paragraph',
      content: '',
      props: {}
    }
  ]);
  
  useEffect(() => {
    if (activeNote?.content && Array.isArray(activeNote.content) && activeNote.content.length > 0) {
      // Make a deep copy to avoid mutating the stored note
      setEditorContent(JSON.parse(JSON.stringify(activeNote.content)));
    } else if (activeNote) {
      // If content is invalid, set a default paragraph block
      setEditorContent([
        {
          id: `default-block-${Date.now()}`,
          type: 'paragraph',
          content: '',
          props: {}
        }
      ]);
    }
  }, [activeNote?.id]);

  // Function to handle content changes
  const handleEditorContentChange = (editor: BlockNoteEditor) => {
    const content = editor.topLevelBlocks;
    
    if (activeNote) {
      // Update note title based on first block content
      const firstBlock = content[0];
      let newTitle = 'Untitled Note';
      
      if (firstBlock) {
        if (firstBlock.type === 'paragraph') {
          // Try to extract a title from text content in the first block
          const blockContent = firstBlock.content;
          if (Array.isArray(blockContent)) {
            const textContent = blockContent
              .map(item => {
                if (typeof item === 'string') return item;
                // Handle different types of content safely
                return item && typeof item === 'object' && 'text' in item ? item.text : '';
              })
              .join('');
            newTitle = textContent.substring(0, 40) || 'Untitled Note';
          } else if (typeof blockContent === 'string') {
            newTitle = String(blockContent).substring(0, 40) || 'Untitled Note';
          }
        }
      }
      
      // Save the updated note with its content and new title
      updateActiveNote({
        ...activeNote,
        title: newTitle,
        content: content
      });
    }
  };

  // Create the editor instance with necessary configs
  const editor = useBlockNote({
    initialContent: editorContent,
  });

  // Set up the onChange handler after initialization
  useEffect(() => {
    if (editor) {
      editor.onChange(handleEditorContentChange);
    }
    // Clean up the event handler when the component unmounts
    return () => {
      if (editor) {
        editor.onChange(null);
      }
    };
  }, [editor, activeNote]);

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
