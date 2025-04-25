
import React from 'react';
import { useBlockNote } from "@blocknote/react";
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
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={handleAddBlock}>Add Block</Button>
        <Button onClick={handleBoldSelection}>Bold Selection</Button>
      </div>
      <div className="p-4 border rounded-lg">
        <BlockNoteView editor={editor} theme="light" />
      </div>
    </div>
  );
};
