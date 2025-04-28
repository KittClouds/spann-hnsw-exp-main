
import React, { useState } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine"; 
import { useNoteInterface } from '../hooks/useNoteInterface';
import { Button } from './ui/button';
import { useGraph } from '../contexts/GraphContext';
import { Block } from '@blocknote/core';

export const NoteInterfaceExample = () => {
  const editor = useBlockNote({
    initialContent: [{
      type: "paragraph",
      content: "Try out the note interface!",
      id: "example-block-1"
    }] as Block[],
  });
  
  const noteInterface = useNoteInterface(editor);
  const graph = useGraph();
  const [graphJson, setGraphJson] = useState<string>('');
  
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
  
  const handleExportGraph = () => {
    // Fix: Remove the argument as exportGraphJSON doesn't accept any arguments
    const exportedGraph = graph.exportGraphJSON();
    setGraphJson(JSON.stringify(exportedGraph, null, 2));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleAddBlock}>Add Block</Button>
        <Button onClick={handleBoldSelection}>Bold Selection</Button>
        <Button onClick={handleInsertText}>Insert Text</Button>
        <Button onClick={handleExportGraph} variant="outline">Export Graph</Button>
      </div>
      <div className="p-4 border rounded-lg">
        <BlockNoteView editor={editor} theme="light" />
      </div>
      
      {graphJson && (
        <div className="p-4 border rounded-lg mt-4 bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Graph Export (JSON)</h3>
          <div className="max-h-40 overflow-auto text-xs">
            <pre>{graphJson}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
