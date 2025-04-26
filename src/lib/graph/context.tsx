
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { graphService } from './GraphService'; // Import from the new location
import { IGraphService } from './IGraphService'; 
import { NodeType, CyElementJSON, GraphJSON } from './types';
import { Position, LayoutOptions } from 'cytoscape';
import { useAtom } from 'jotai';
import { notesAtom, clustersAtom, Note, Cluster, graphInitializedAtom } from '@/lib/store';

// --- Define the Context Type ---
interface GraphContextType {
    // Custom/Store specific
    importNotesFromStore: () => void;
    exportNotesToStore: () => { notes: Note[], clusters: Cluster[] };

    // Data I/O
    exportGraphJSON: (includeStyle?: boolean) => GraphJSON;
    importGraphJSON: (graphData: GraphJSON) => Promise<void>;
    exportElement: (elementId: string) => CyElementJSON | undefined;
    importElement: (elementJson: CyElementJSON) => void;

    // Undo/Redo
    undo: () => void;
    redo: () => void;
    clearUndoStack: () => void;

    // Layout & View
    applyLayout: (options?: LayoutOptions) => void;
    focusNode: (nodeId: string) => void;
    fitView: (elementIds?: string[]) => void;

    // Node Operations
    addNote: (note: Partial<Note>, folderId?: string, clusterId?: string) => Promise<string>;
    updateNote: (id: string, updates: Partial<Note>) => void;
    deleteNote: (id: string) => void;
    moveNode: (nodeId: string, newPosition: Position) => void;
    moveNodeToParent: (nodeId: string, newParentId?: string | null) => void;

    // Cluster Operations
    addCluster: (cluster: Partial<Cluster>) => Promise<string>;
    updateCluster: (id: string, updates: Partial<Cluster>) => void;
    deleteCluster: (id: string) => void;
    moveNodeToCluster: (nodeId: string, clusterId: string | null) => void;
    addNodeToCluster: (nodeId: string, clusterId: string) => void;
    removeNodeFromCluster: (nodeId: string) => void;

    // Tag Operations
    tagNote: (noteId: string, tagName: string) => void;
    untagNote: (noteId: string, tagName: string) => void;

    // Querying & Selection
    searchNodes: (query: string, types: NodeType[]) => Array<{id: string; title: string; type: string}>;
    getRelatedNotes: (noteId: string, includeClusters?: boolean) => Array<{id: string; title: string; type: string}>;
    getBacklinks: (noteId: string) => Array<{id: string; title: string}>;
    getConnections: (noteId: string) => Record<'tag' | 'concept' | 'mention', Array<{id: string; title: string}>>;
    selectNode: (nodeId: string) => void;
    selectEdge: (edgeId: string) => void;
    selectCluster: (clusterId: string) => void;
    clearSelection: () => void;
}

// --- Create Context ---
const GraphContext = createContext<GraphContextType | undefined>(undefined);

// --- Graph Provider Component ---
export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);

  const service: IGraphService = graphService;

  useEffect(() => {
    // Initialize from store only once
    if (!initialized && notes.length > 0) {
      console.log("GraphContext: Initializing graph from store", { noteCount: notes.length, clusterCount: clusters.length });
      service.importFromStore(notes, clusters);
      setInitialized(true);
    } else if (!initialized && notes.length === 0) {
      console.log("GraphContext: Store is empty, initializing empty graph.");
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized, service]);

  // --- Define Context Value ---
  const value: GraphContextType = {
    importNotesFromStore: useCallback(() => {
      console.log("GraphContext: Manually importing notes from store.");
      service.importFromStore(notes, clusters);
    }, [service, notes, clusters]),

    exportNotesToStore: useCallback(() => {
      return service.exportToStore();
    }, [service]),

    exportGraphJSON: useCallback((includeStyle = false) => {
      return service.exportGraph({ includeStyle });
    }, [service]),

    importGraphJSON: useCallback(async (graphData) => {
        console.log("GraphContext: Importing graph from JSON.");
        await service.importGraph(graphData);
    }, [service]),

    exportElement: useCallback((elementId) => {
      const element = service.findElementById(elementId);
      if (!element || element.empty()) return undefined;
      return service.exportElement(element.first());
    }, [service]),

    importElement: useCallback((elementJson) => {
      service.importElement(elementJson);
    }, [service]),

    // Undo/Redo
    undo: useCallback(() => service.undo(), [service]),
    redo: useCallback(() => service.redo(), [service]),
    clearUndoStack: useCallback(() => service.clearUndoStack(), [service]),

    // Layout & View
    applyLayout: useCallback((options?: LayoutOptions) => service.applyLayout(options), [service]),
    focusNode: useCallback((nodeId: string) => service.focusNode(nodeId), [service]),
    fitView: useCallback((elementIds?: string[]) => service.fitView(elementIds), [service]),

    // Note Operations
    addNote: useCallback(async (note, folderId, clusterId) => {
      console.log("GraphContext: Adding note", { title: note.title, folderId, clusterId });
      return await service.addNote(note, folderId, clusterId);
    }, [service]),

    updateNote: useCallback((id, updates) => {
      service.updateNote(id, updates);
    }, [service]),

    deleteNote: useCallback((id) => {
      service.deleteNote(id);
    }, [service]),

    moveNode: useCallback((nodeId: string, newPosition: Position) => {
       service.moveNode(nodeId, newPosition);
    }, [service]),

    moveNodeToParent: useCallback((nodeId, newParentId) => {
      service.moveNodeToParent(nodeId, newParentId);
    }, [service]),

    // Cluster Operations
    addCluster: useCallback(async (cluster) => {
      console.log("GraphContext: Adding cluster", { title: cluster.title });
      return await service.addCluster(cluster);
    }, [service]),

    updateCluster: useCallback((id, updates) => {
      service.updateCluster(id, updates);
    }, [service]),

    deleteCluster: useCallback((id) => {
      service.deleteCluster(id);
    }, [service]),

    moveNodeToCluster: useCallback((nodeId: string, clusterId: string | null) => {
        service.moveNodeToCluster(nodeId, clusterId);
    }, [service]),

    addNodeToCluster: useCallback((nodeId: string, clusterId: string) => {
        service.addNodeToCluster(nodeId, clusterId);
    }, [service]),

    removeNodeFromCluster: useCallback((nodeId: string) => {
        service.removeNodeFromCluster(nodeId);
    }, [service]),

    // Tag Operations
    tagNote: useCallback((noteId, tagName) => {
      service.tagNote(noteId, tagName);
    }, [service]),

    untagNote: useCallback((noteId, tagName) => {
        service.untagNote(noteId, tagName);
    }, [service]),

    // Querying & Selection
    searchNodes: useCallback((query, types = [NodeType.NOTE]) => {
      return service.searchNodes(query, types).map(node => ({
        id: node.id(),
        title: node.data('title'),
        type: node.data('type')
      }));
    }, [service]),

    getRelatedNotes: useCallback((noteId, includeClusters = false) => {
      return service.getRelatedNodes(noteId, includeClusters).map(data => ({
        id: data.id,
        title: data.title,
        type: data.type
      }));
    }, [service]),

    getBacklinks: useCallback((noteId) => {
      return service.getBacklinks(noteId);
    }, [service]),

    getConnections: useCallback((noteId) => {
      return service.getConnections(nodeId);
    }, [service]),

    selectNode: useCallback((nodeId: string) => service.selectNode(nodeId), [service]),
    selectEdge: useCallback((edgeId: string) => service.selectEdge(edgeId), [service]),
    selectCluster: useCallback((clusterId: string) => service.selectCluster(clusterId), [service]),
    clearSelection: useCallback(() => service.clearSelection(), [service]),
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};

// --- Consumer Hook ---
export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};

export default GraphContext;
