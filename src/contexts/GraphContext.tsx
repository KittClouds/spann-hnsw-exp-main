import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  noteTagsMapAtom,
  noteMentionsMapAtom,
  noteLinksMapAtom,
  noteEntitiesMapAtom,
  noteTriplesMapAtom,
  schemaAtom
} from '@/lib/store';
import { ClusterId } from '@/lib/utils/ids';
import { schema } from '@/lib/schema';
import { Entity } from '@/lib/utils/parsingUtils';
import { EntityWithReferences } from '@/components/entity-browser/EntityBrowser';
import { SchemaDefinitions } from '@/lib/schema';

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
  getAllEntities: () => EntityWithReferences[];
  createEntity: (entity: Entity) => boolean;
  getEntityReferences: (kind: string, label: string) => {id: string, title: string}[];
  getEntityRelationships: (kind: string, label: string) => any[];
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);
  const [tagsMap] = useAtom(noteTagsMapAtom);
  const [mentionsMap] = useAtom(noteMentionsMapAtom);
  const [linksMap] = useAtom(noteLinksMapAtom);
  const [entitiesMap] = useAtom(noteEntitiesMapAtom);
  const [triplesMap] = useAtom(noteTriplesMapAtom);
  const [schemaDefs, setSchemaDefs] = useAtom(schemaAtom);

  const previousTagsMap = useRef(tagsMap);
  const previousMentionsMap = useRef(mentionsMap);
  const previousLinksMap = useRef(linksMap);
  const previousEntitiesMap = useRef(entitiesMap);
  const previousTriplesMap = useRef(triplesMap);

  // Load schema from storage on mount
  useEffect(() => {
    const validSchemaDefs = schemaDefs as SchemaDefinitions;
    if (validSchemaDefs && validSchemaDefs.nodes && validSchemaDefs.edges && 
        (validSchemaDefs.nodes.length > 0 || validSchemaDefs.edges.length > 0)) {
      console.log("GraphProvider: Loading schema from storage", validSchemaDefs);
      schema.loadDefinitions(validSchemaDefs);
    }
  }, [schemaDefs]);

  // Effect for initial graph load from store
  useEffect(() => {
    const notesArray = Array.isArray(notes) ? notes : [];
    const clustersArray = Array.isArray(clusters) ? clusters : [];
    
    if (!initialized && notesArray.length > 0) {
      console.log("GraphProvider: Initializing graph with store data.");
      syncManager.importFromStore(notesArray, clustersArray);
      previousTagsMap.current = tagsMap;
      previousMentionsMap.current = mentionsMap;
      previousLinksMap.current = linksMap;
      previousEntitiesMap.current = entitiesMap;
      previousTriplesMap.current = triplesMap;
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized, tagsMap, mentionsMap, linksMap, entitiesMap, triplesMap]);

  // Effect to synchronize derived connections TO the graph
  useEffect(() => {
    if (!initialized) return;

    console.log("GraphProvider: Checking for connection changes...");

    const changedNoteIds = new Set<string>();

    // Compare Tags
    if (tagsMap instanceof Map) {
      tagsMap.forEach((currentTags, noteId) => {
        if (previousTagsMap.current.get(noteId) !== currentTags) {
          changedNoteIds.add(noteId);
        }
      });
      previousTagsMap.current.forEach((_, noteId) => {
        if (!tagsMap.has(noteId)) changedNoteIds.add(noteId);
      });
    }

    // Compare Mentions
    if (mentionsMap instanceof Map) {
      mentionsMap.forEach((currentMentions, noteId) => {
        if (previousMentionsMap.current.get(noteId) !== currentMentions) {
          changedNoteIds.add(noteId);
        }
      });
      previousMentionsMap.current.forEach((_, noteId) => {
        if (!mentionsMap.has(noteId)) changedNoteIds.add(noteId);
      });
    }

    // Compare Links
    if (linksMap instanceof Map) {
      linksMap.forEach((currentLinks, noteId) => {
        if (previousLinksMap.current.get(noteId) !== currentLinks) {
          changedNoteIds.add(noteId);
        }
      });
      previousLinksMap.current.forEach((_, noteId) => {
        if (!linksMap.has(noteId)) changedNoteIds.add(noteId);
      });
    }
    
    // Compare Entities
    if (entitiesMap instanceof Map) {
      entitiesMap.forEach((currentEntities, noteId) => {
        if (previousEntitiesMap.current.get(noteId) !== currentEntities) {
          changedNoteIds.add(noteId);
        }
      });
      previousEntitiesMap.current.forEach((_, noteId) => {
        if (!entitiesMap.has(noteId)) changedNoteIds.add(noteId);
      });
    }
    
    // Compare Triples
    if (triplesMap instanceof Map) {
      triplesMap.forEach((currentTriples, noteId) => {
        if (previousTriplesMap.current.get(noteId) !== currentTriples) {
          changedNoteIds.add(noteId);
        }
      });
      previousTriplesMap.current.forEach((_, noteId) => {
        if (!triplesMap.has(noteId)) changedNoteIds.add(noteId);
      });
    }

    if (changedNoteIds.size > 0) {
      console.log(`GraphProvider: Detected connection changes in ${changedNoteIds.size} notes. Updating graph...`, Array.from(changedNoteIds));
      changedNoteIds.forEach(noteId => {
        const tags = tagsMap instanceof Map ? (tagsMap.get(noteId) ?? []) : [];
        const mentions = mentionsMap instanceof Map ? (mentionsMap.get(noteId) ?? []) : [];
        const links = linksMap instanceof Map ? (linksMap.get(noteId) ?? []) : [];
        const entities = entitiesMap instanceof Map ? (entitiesMap.get(noteId) ?? []) : [];
        const triples = triplesMap instanceof Map ? (triplesMap.get(noteId) ?? []) : [];
        
        graphService.updateNoteConnections(noteId, tags, mentions, links, entities, triples);
      });
    }

    // Update refs for the next comparison
    previousTagsMap.current = tagsMap;
    previousMentionsMap.current = mentionsMap;
    previousLinksMap.current = linksMap;
    previousEntitiesMap.current = entitiesMap;
    previousTriplesMap.current = triplesMap;

  }, [tagsMap, mentionsMap, linksMap, entitiesMap, triplesMap, initialized]);

  const value: GraphContextType = {
    importNotes: () => {
      console.warn("GraphProvider: Explicit importNotes called. Re-importing from store.");
      setInitialized(false);
    },

    exportNotes: () => {
      return syncManager.exportToStore();
    },

    exportGraphJSON: () => {
      return graphService.exportGraph();
    },

    importGraphJSON: (graphData) => {
      console.warn("GraphProvider: Importing raw graph JSON. Store state might become inconsistent.");
      graphService.importGraph(graphData);
      setInitialized(true);
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
        { title: 'Untitled Note', ...note },
        note.parentId || null,
        note.clusterId || null
      );
      return id;
    },
    
    updateNote: (id, updates) => {
      const success = syncManager.updateNoteInGraph(id, updates);
      return success;
    },
    
    deleteNote: (id) => {
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
      return graphService.getBacklinks(noteId);
    },
    
    tagNote: (noteId, tagName) => {
      console.warn("GraphProvider: Direct tagNote is likely deprecated. Modify note content instead.");
      return false;
    },

    getConnections: (noteId) => {
      return {
        tag: tagsMap instanceof Map ? (tagsMap.get(noteId)?.map(t => ({ id: t, title: t })) ?? []) : [],
        mention: mentionsMap instanceof Map ? (mentionsMap.get(noteId)?.map(m => ({ id: m, title: m })) ?? []) : [],
        concept: linksMap instanceof Map ? (linksMap.get(noteId)?.map(l => ({ id: l, title: l })) ?? []) : [],
        entity: entitiesMap instanceof Map ? (entitiesMap.get(noteId) ?? []) : [],
        triple: triplesMap instanceof Map ? (triplesMap.get(noteId) ?? []) : []
      };
    },
    
    addThread: (thread) => syncManager.addThreadToGraph(thread),
    addThreadMessage: (msg) => syncManager.addThreadMessageToGraph(msg),
    updateThreadMessage: (id, updates) => syncManager.updateThreadMessageInGraph(id, updates),
    deleteThreadMessage: (id) => syncManager.deleteThreadMessageFromGraph(id),
    
    registerEntityType: (kind: string, labelProp: string, style) => {
      schema.registerNode(kind, { kind, labelProp, defaultStyle: style });
      setSchemaDefs(schema.list());
    },
    
    registerRelationshipType: (label, from, to, directed = true, style) => {
      schema.registerEdge(label, { from, to, directed, defaultStyle: style });
      setSchemaDefs(schema.list());
    },
    
    getEntityTypes: () => {
      return schema.getAllNodeDefs().map(([kind, def]) => ({ kind, ...def }));
    },
    
    getRelationshipTypes: () => {
      return schema.getAllEdgeDefs().map(([label, def]) => ({ label, ...def }));
    },

    updateEntityAttributes: (kind: string, label: string, attributes: Record<string, any>) => {
      return graphService.updateEntityAttributes(kind, label, attributes);
    },
    
    getEntityAttributes: (kind: string, label: string) => {
      return graphService.getEntityAttributes(kind, label);
    },
    
    getAllEntities: () => {
      return graphService.getAllEntities ? graphService.getAllEntities() : [];
    },
    
    createEntity: (entity: Entity) => {
      return graphService.createEntity ? graphService.createEntity(entity) : false;
    },
    
    getEntityReferences: (kind: string, label: string) => {
      return graphService.getEntityReferences ? graphService.getEntityReferences(kind, label) : [];
    },
    
    getEntityRelationships: (kind: string, label: string) => {
      return graphService.getEntityRelationships ? graphService.getEntityRelationships(kind, label) : [];
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
