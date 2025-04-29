
import React, { useState } from 'react';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine"; 
import { useNoteInterface } from '../hooks/useNoteInterface';
import { Button } from './ui/button';
import { useGraph } from '../contexts/GraphContext';
import { Block } from '@blocknote/core';
import { createParagraphBlock } from '../lib/utils/blockUtils';

export const NoteInterfaceExample = () => {
  const editor = useBlockNote({
    initialContent: [
      createParagraphBlock("Try out the note interface!", "example-block-1")
    ],
  });
  
  const noteInterface = useNoteInterface(editor);
  const graph = useGraph();
  const [graphJson, setGraphJson] = useState<string>('');
  
  const handleAddBlock = () => {
    const blocks = noteInterface.getDocument();
    const lastBlockId = blocks[blocks.length - 1].id;
    
    noteInterface.insertBlocks([{
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left"
      },
      content: [{
        type: "text",
        text: "New block added programmatically!",
        styles: {}
      }]
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
