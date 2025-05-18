
import React, { createContext, useContext, useState, useEffect, useRef } from 'react'; // Add useRef
import { graphService } from '../services/GraphService';
import { syncManager } from '../services/SyncManager';
import { NodeType, EdgeType, ElementDefinition, GraphJSON, Thread, ThreadMessage } from '../services/types';
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
  noteLinksMapAtom,
  noteEntitiesMapAtom,
  noteTriplesMapAtom,
  schemaAtom
} from '@/lib/store';
import { ClusterId } from '@/lib/utils/ids';
import { schema } from '@/lib/schema';

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
  getConnections: (noteId: string) => Record<'tag' | 'concept' | 'mention' | 'entity' | 'triple', any[]>;
  addThread: (thread: Thread) => string;
  addThreadMessage: (msg: ThreadMessage) => string;
  updateThreadMessage: (id: string, updates: Partial<ThreadMessage>) => boolean;
  deleteThreadMessage: (id: string) => boolean;
  registerEntityType: (kind: string, labelProp: string, style?: any) => void;
  registerRelationshipType: (label: string, from: string | string[], to: string | string[], directed?: boolean, style?: any) => void;
  getEntityTypes: () => any[];
  getRelationshipTypes: () => any[];
  updateEntityAttributes: (kind: string, label: string, attributes: Record<string, any>) => boolean;
  getEntityAttributes: (kind: string, label: string) => Record<string, any> | null;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);
  const [tagsMap] = useAtom(noteTagsMapAtom);             // Subscribe to maps
  const [mentionsMap] = useAtom(noteMentionsMapAtom);
  const [linksMap] = useAtom(noteLinksMapAtom);
  const [entitiesMap] = useAtom(noteEntitiesMapAtom);     // Subscribe to entity map
  const [triplesMap] = useAtom(noteTriplesMapAtom);       // Subscribe to triple map
  const [schemaDefs, setSchemaDefs] = useAtom(schemaAtom);

  const previousTagsMap = useRef(tagsMap);
  const previousMentionsMap = useRef(mentionsMap);
  const previousLinksMap = useRef(linksMap);
  const previousEntitiesMap = useRef(entitiesMap);
  const previousTriplesMap = useRef(triplesMap);

  // Load schema from storage on mount
  useEffect(() => {
    if (schemaDefs.nodes.length > 0 || schemaDefs.edges.length > 0) {
      console.log("GraphProvider: Loading schema from storage", schemaDefs);
      schema.loadDefinitions(schemaDefs);
    }
  }, [schemaDefs]);

  // Effect for initial graph load from store
  useEffect(() => {
    if (!initialized && notes.length > 0) { // Ensure notes are loaded before initializing
      console.log("GraphProvider: Initializing graph with store data.");
      syncManager.importFromStore(notes, clusters);
      // Set initial refs *after* import to avoid redundant updates
      previousTagsMap.current = tagsMap;
      previousMentionsMap.current = mentionsMap;
      previousLinksMap.current = linksMap;
      previousEntitiesMap.current = entitiesMap;
      previousTriplesMap.current = triplesMap;
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized, tagsMap, mentionsMap, linksMap, entitiesMap, triplesMap]); // Add maps to dependency array

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
    
    // Compare Entities
    entitiesMap.forEach((currentEntities, noteId) => {
       if (previousEntitiesMap.current.get(noteId) !== currentEntities) {
          changedNoteIds.add(noteId);
       }
    });
    previousEntitiesMap.current.forEach((_, noteId) => {
         if (!entitiesMap.has(noteId)) changedNoteIds.add(noteId);
    });
    
    // Compare Triples
    triplesMap.forEach((currentTriples, noteId) => {
       if (previousTriplesMap.current.get(noteId) !== currentTriples) {
          changedNoteIds.add(noteId);
       }
    });
    previousTriplesMap.current.forEach((_, noteId) => {
         if (!triplesMap.has(noteId)) changedNoteIds.add(noteId);
    });

    if (changedNoteIds.size > 0) {
      console.log(`GraphProvider: Detected connection changes in ${changedNoteIds.size} notes. Updating graph...`, Array.from(changedNoteIds));
      changedNoteIds.forEach(noteId => {
        const tags = tagsMap.get(noteId) ?? [];
        const mentions = mentionsMap.get(noteId) ?? [];
        const links = linksMap.get(noteId) ?? [];
        const entities = entitiesMap.get(noteId) ?? [];
        const triples = triplesMap.get(noteId) ?? [];
        
        // Updated to pass entities and triples to updateNoteConnections
        graphService.updateNoteConnections(noteId, tags, mentions, links, entities, triples);
      });
    }

    // Update refs for the next comparison
    previousTagsMap.current = tagsMap;
    previousMentionsMap.current = mentionsMap;
    previousLinksMap.current = linksMap;
    previousEntitiesMap.current = entitiesMap;
    previousTriplesMap.current = triplesMap;

  }, [tagsMap, mentionsMap, linksMap, entitiesMap, triplesMap, initialized]); // Run when maps or initialized state change

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

    // Fix the argument count error in getConnections function
    getConnections: (noteId) => {
      // Use directly from the derived atoms
      return {
        tag: tagsMap.get(noteId)?.map(t => ({ id: t, title: t })) ?? [], // Format to match old structure
        mention: mentionsMap.get(noteId)?.map(m => ({ id: m, title: m })) ?? [],
        concept: linksMap.get(noteId)?.map(l => ({ id: l, title: l })) ?? [], // 'concept' was used for links
        entity: entitiesMap.get(noteId) ?? [],
        triple: triplesMap.get(noteId) ?? []
      };
    },
    
    // Thread operations
    addThread: (thread) => syncManager.addThreadToGraph(thread),
    addThreadMessage: (msg) => syncManager.addThreadMessageToGraph(msg),
    updateThreadMessage: (id, updates) => syncManager.updateThreadMessageInGraph(id, updates),
    deleteThreadMessage: (id) => syncManager.deleteThreadMessageFromGraph(id),
    
    // Schema operations
    registerEntityType: (kind: string, labelProp: string, style) => {
      schema.registerNode(kind, { kind, labelProp, defaultStyle: style });
      // Update stored schema
      setSchemaDefs(schema.list());
    },
    
    registerRelationshipType: (label, from, to, directed = true, style) => {
      schema.registerEdge(label, { from, to, directed, defaultStyle: style });
      // Update stored schema
      setSchemaDefs(schema.list());
    },
    
    getEntityTypes: () => {
      return schema.getAllNodeDefs().map(([kind, def]) => ({ kind, ...def }));
    },
    
    getRelationshipTypes: () => {
      return schema.getAllEdgeDefs().map(([label, def]) => ({ label, ...def }));
    },

    // Entity attribute methods - add these to fix the error
    updateEntityAttributes: (kind: string, label: string, attributes: Record<string, any>) => {
      return graphService.updateEntityAttributes(kind, label, attributes);
    },
    
    getEntityAttributes: (kind: string, label: string) => {
      return graphService.getEntityAttributes(kind, label);
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
