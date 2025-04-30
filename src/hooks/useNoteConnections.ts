import { useState, useEffect } from 'react';
import { Block } from '@blocknote/core';
import { useGraph } from '@/contexts/GraphContext';
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { processDocument } from '@/lib/utils/contentParser';

export function useNoteConnections() {
  const [activeNote] = useAtom(activeNoteAtom);
  const [activeNoteId] = useAtom(activeNoteIdAtom);
  const graph = useGraph();
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * Updates connections in the graph based on the content of blocks
   */
  const updateConnections = async (noteId: string, blocks: Block[]) => {
    if (!noteId || !blocks || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Extract all connections from the document
      const { links, tags, mentions } = processDocument(blocks);
      
      // Process tags (create tag nodes and connect to this note)
      for (const tag of tags) {
        graph.tagNote(noteId, tag);
      }
      
      // Process wiki links (find or create notes for each link)
      for (const link of links) {
        const matchingNotes = graph.searchNotes(link);
        
        if (matchingNotes.length > 0) {
          // If a note with this title exists, create a link to it
          const targetNoteId = matchingNotes[0].id;
          // Use the graph service to create a concept link
          graph.addConceptLink(noteId, targetNoteId);
        } else {
          // Otherwise, register the concept for future linking
          graph.registerConcept(noteId, link);
        }
      }
      
      // Process mentions 
      for (const mention of mentions) {
        const matchingNotes = graph.searchNotes(mention);
        
        if (matchingNotes.length > 0) {
          // If a note with this title exists, create a mention link
          const targetNoteId = matchingNotes[0].id;
          graph.addMention(noteId, targetNoteId);
        }
      }
      
    } catch (error) {
      console.error("Error updating connections:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Process connections whenever the active note's content changes
  useEffect(() => {
    if (activeNote?.content && activeNoteId) {
      updateConnections(activeNoteId, activeNote.content);
    }
  }, [activeNote?.content]);
  
  return {
    updateConnections,
    isProcessing
  };
}
