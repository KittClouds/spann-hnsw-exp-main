
import React from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine"; 
import { useNoteInterface } from '../hooks/useNoteInterface';
import { Button } from './ui/button';

export const NoteInterfaceExample = () => {
  const editor = useBlockNote({
    initialContent: [{
      type: "paragraph",
      content: "Try out the note interface!"
    }],
  });
  
  const noteInterface = useNoteInterface(editor);
  
  const handleAddBlock = () => {
    const blocks = noteInterface.getDocument();
    const lastBlockId = blocks[blocks.length - 1].id;
    
    noteInterface.insertBlocks([{
      type: "paragraph",
      content: "New block added programmatically!"
    }], lastBlockId, 'after');
  };
  
  const handleBoldSelection = () => {
    noteInterface.addStyles({ bold: true });
  };
  
  const handleInsertText = () => {
    const blocks = noteInterface.getDocument();
    if (blocks.length > 0) {
      const firstBlockId = blocks[0].id;
      noteInterface.insertText("Text inserted programmatically!");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleAddBlock}>Add Block</Button>
        <Button onClick={handleBoldSelection}>Bold Selection</Button>
        <Button onClick={handleInsertText}>Insert Text</Button>
      </div>
      <div className="p-4 border rounded-lg">
        <BlockNoteView editor={editor} theme="light" />
      </div>
    </div>
  );
};
