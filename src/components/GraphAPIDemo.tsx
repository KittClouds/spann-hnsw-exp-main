
import React, { useState } from 'react';
import { useGraph } from '../contexts/GraphContext';
import { Button } from './ui/button';
import { NodeType } from '../services/GraphService';

export const GraphAPIDemo = () => {
  const graph = useGraph(); // This is typed as GraphAPI
  const [graphJson, setGraphJson] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  const handleExportGraph = () => {
    const exportedGraph = graph.exportGraph(true);
    setGraphJson(JSON.stringify(exportedGraph, null, 2));
  };
  
  const handleAddNote = () => {
    const newNote = graph.addNote({
      title: `New Note ${Date.now()}`,
      content: [{ type: 'paragraph', content: 'This is a note created using GraphAPI' }]
    });
    
    if (newNote) {
      setGraphJson(JSON.stringify(graph.exportElement(newNote), null, 2));
    }
  };
  
  const handleSearch = () => {
    const results = graph.searchNodes('Note', [NodeType.NOTE]);
    setSearchResults(results.map(node => `${node.id()}: ${node.data('title')}`));
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Graph API Demo</h2>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleAddNote}>Add Note</Button>
        <Button onClick={handleExportGraph}>Export Graph</Button>
        <Button onClick={handleSearch} variant="outline">Search Notes</Button>
      </div>
      
      {searchResults.length > 0 && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Search Results</h3>
          <ul className="list-disc pl-5 text-sm">
            {searchResults.map((result, i) => (
              <li key={i}>{result}</li>
            ))}
          </ul>
        </div>
      )}
      
      {graphJson && (
        <div className="p-4 border rounded-lg mt-4 bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Graph Data (JSON)</h3>
          <div className="max-h-60 overflow-auto text-xs">
            <pre>{graphJson}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
