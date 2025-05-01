import React, { createContext, useContext, useState, useEffect, useRef } from 'react'; // Add useRef
import { graphService } from '../services/GraphService';
import { syncManager } from '../services/SyncManager';
import { NodeType, EdgeType, ElementDefinition, GraphJSON } from '../services/types';
import { useAtom } from 'jotai';
import {
  notesAtom,
  clustersAtom,
  Note,
  Cluster,
  graphInitializedAtom,
  STANDARD_ROOT_ID,
  noteTagsMapAtom,    // Import derived map atoms
  noteMentionsMapAtom,
  noteLinksMapAtom
} from '@/lib/store';
import { ClusterId } from '@/lib/utils/ids';

interface GraphContextType {
  importNotes: () => void;
  exportNotes: () => { notes: Note[], clusters: Cluster[] };
  exportGraphJSON: () => GraphJSON;
  importGraphJSON: (graphData: GraphJSON) => void;
  exportElement: (elementId: string) => ElementDefinition | undefined;
  importElement: (elementJson: ElementDefinition) => void;
  addNote: (note: Partial<Note>) => string;
  updateNote: (id: string, updates: Partial<Note>) => boolean;
  deleteNote: (id: string) => boolean;
  addCluster: (cluster: Partial<Cluster>) => string;
  updateCluster: (id: string, updates: Partial<Cluster>) => boolean;
  deleteCluster: (id: string) => boolean;
  moveNode: (nodeId: string, newParentId?: string) => boolean;
  searchNotes: (query: string) => any[];
  getRelatedNotes: (noteId: string) => any[];
  getBacklinks: (noteId: string) => any[];
  tagNote: (noteId: string, tagName: string) => boolean;
  getConnections: (noteId: string) => Record<'tag' | 'concept' | 'mention', any[]>;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);
  const [tagsMap] = useAtom(noteTagsMapAtom);             // Subscribe to maps
  const [mentionsMap] = useAtom(noteMentionsMapAtom);
  const [linksMap] = useAtom(noteLinksMapAtom);

  const previousTagsMap = useRef(tagsMap);
  const previousMentionsMap = useRef(mentionsMap);
  const previousLinksMap = useRef(linksMap);

  // Effect for initial graph load from store
  useEffect(() => {
    if (!initialized && notes.length > 0) { // Ensure notes are loaded before initializing
      console.log("GraphProvider: Initializing graph with store data.");
      syncManager.importFromStore(notes, clusters);
      // Set initial refs *after* import to avoid redundant updates
      previousTagsMap.current = tagsMap;
      previousMentionsMap.current = mentionsMap;
      previousLinksMap.current = linksMap;
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized, tagsMap, mentionsMap, linksMap]); // Add maps to dependency array

   // Effect to synchronize derived connections TO the graph
  useEffect(() => {
    if (!initialized) return; // Don't run if graph isn't ready

    console.log("GraphProvider: Checking for connection changes...");

    const changedNoteIds = new Set<string>();

    // Compare Tags
    tagsMap.forEach((currentTags, noteId) => {
      if (previousTagsMap.current.get(noteId) !== currentTags) { // Basic check, improve if needed
        changedNoteIds.add(noteId);
      }
    });
    previousTagsMap.current.forEach((_, noteId) => {
        if (!tagsMap.has(noteId)) changedNoteIds.add(noteId); // Note removed or tags cleared
    });

    // Compare Mentions
    mentionsMap.forEach((currentMentions, noteId) => {
       if (previousMentionsMap.current.get(noteId) !== currentMentions) {
         changedNoteIds.add(noteId);
       }
    });
    previousMentionsMap.current.forEach((_, noteId) => {
        if (!mentionsMap.has(noteId)) changedNoteIds.add(noteId);
    });

    // Compare Links
    linksMap.forEach((currentLinks, noteId) => {
       if (previousLinksMap.current.get(noteId) !== currentLinks) {
          changedNoteIds.add(noteId);
       }
    });
    previousLinksMap.current.forEach((_, noteId) => {
         if (!linksMap.has(noteId)) changedNoteIds.add(noteId);
    });

    if (changedNoteIds.size > 0) {
      console.log(`GraphProvider: Detected connection changes in ${changedNoteIds.size} notes. Updating graph...`, Array.from(changedNoteIds));
      changedNoteIds.forEach(noteId => {
        const tags = tagsMap.get(noteId) ?? [];
        const mentions = mentionsMap.get(noteId) ?? [];
        const links = linksMap.get(noteId) ?? [];
        // Call graph service to update connections for this specific note
        graphService.updateNoteConnections(noteId, tags, mentions, links);
      });
    }

    // Update refs for the next comparison
    previousTagsMap.current = tagsMap;
    previousMentionsMap.current = mentionsMap;
    previousLinksMap.current = linksMap;

  }, [tagsMap, mentionsMap, linksMap, initialized]); // Run when maps or initialized state change

  const value: GraphContextType = {
    importNotes: () => {
      // Re-import might be needed if external changes happen, but generally not for internal ops
      console.warn("GraphProvider: Explicit importNotes called. Re-importing from store.");
      setInitialized(false); // Force re-initialization
    },

    exportNotes: () => {
      return syncManager.exportToStore();
    },

    exportGraphJSON: () => {
      return graphService.exportGraph();
    },

    importGraphJSON: (graphData) => {
      // Importing raw graph JSON bypasses store sync, handle with care
      console.warn("GraphProvider: Importing raw graph JSON. Store state might become inconsistent.");
      graphService.importGraph(graphData);
      setInitialized(true); // Assume graph is now initialized
    },

    exportElement: (elementId) => { 
      const element = graphService.getGraph().getElementById(elementId);
      if (element.empty()) return undefined;
      return graphService.exportElement(element);
    },
    
    importElement: (elementJson) => { 
      graphService.importElement(elementJson);
    },

    addNote: (note) => {
      const id = syncManager.addNoteToGraph(
        { title: 'Untitled Note', ...note }, // Ensure defaults
        note.parentId || null,
        note.clusterId || null
      );
      // No explicit connection update needed here; store change triggers derived atoms.
      return id;
    },
    
    updateNote: (id, updates) => {
      // Update the note data (title, content etc.)
      const success = syncManager.updateNoteInGraph(id, updates);
      // If content changed, notesAtom updates, derived atoms recalculate, useEffect updates graph connections.
      return success;
    },
    
    deleteNote: (id) => {
      // Deleting the note from the store will trigger derived atoms recalculation.
      // GraphService needs to handle node removal correctly.
      return syncManager.deleteNoteFromGraph(id);
    },

    addCluster: (cluster) => syncManager.addClusterToGraph({ title: 'Untitled Cluster', ...cluster }),
    updateCluster: (id, updates) => syncManager.updateClusterInGraph(id, updates),
    deleteCluster: (id) => syncManager.deleteClusterFromGraph(id),
    moveNode: (nodeId, newParentId) => syncManager.moveNoteInGraph(nodeId, newParentId),

    searchNotes: (query) => { 
      return graphService.searchNodes(query, [NodeType.NOTE]).map(node => ({
        id: node.id(),
        title: node.data('title'),
        type: node.data('type')
      }));
    },
    
    getRelatedNotes: (noteId) => { 
      return graphService.getRelatedNodes(noteId).map(node => ({
        id: node.id(),
        title: node.data('title'),
        type: node.data('type')
      }));
    },
    
    getBacklinks: (noteId) => {
      // This directly queries the graph, which should be up-to-date
      return graphService.getBacklinks(noteId);
    },
    
    tagNote: (noteId, tagName) => {
      // DEPRECATED? Tagging should happen by editing note content,
      // which updates derived atoms and syncs to the graph.
      console.warn("GraphProvider: Direct tagNote is likely deprecated. Modify note content instead.");
      return false; // Return false to indicate deprecation/non-implementation
    },

    getConnections: (noteId) => {
      // Use directly from the derived atoms
      return {
        tag: tagsMap.get(noteId as NoteId)?.map(t => ({ id: t, title: t })) ?? [], // Format to match old structure
        mention: mentionsMap.get(noteId as NoteId)?.map(m => ({ id: m, title: m })) ?? [],
        concept: linksMap.get(noteId as NoteId)?.map(l => ({ id: l, title: l })) ?? [], // 'concept' was used for links
      };
    }
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};

export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};

export default GraphContext;
