import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    graphService, // The actual instance
    NodeType,
    CyElementJSON,
    GraphJSON, // Import GraphJSON type for export/import
    NodeCollection, // Import for search results if needed downstream
    Position // Import Position for moveNode
} from '../services/GraphService';
import { IGraphService } from '../services/IGraphService'; // Import the interface
import { useAtom } from 'jotai';
import { notesAtom, clustersAtom, Note, Cluster, graphInitializedAtom } from '@/lib/store';
import { ClusterId, NodeId } from '@/lib/utils/ids'; // Import NodeId if needed
import { LayoutOptions } from 'cytoscape';

// --- Define the Context Type based on IGraphService ---
interface GraphContextType {
    // Custom/Store specific
    importNotesFromStore: () => void; // Renamed for clarity
    exportNotesToStore: () => { notes: Note[], clusters: Cluster[] }; // Renamed for clarity

    // Data I/O (matching IGraphService where applicable)
    exportGraphJSON: (includeStyle?: boolean) => GraphJSON;
    importGraphJSON: (graphData: GraphJSON) => Promise<void>; // Service method is async
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
    addNote: (note: Partial<Note>, folderId?: string, clusterId?: string) => Promise<string>; // Async
    updateNote: (id: string, updates: Partial<Note>) => void; // Returns void
    deleteNote: (id: string) => void; // Returns void
    moveNode: (nodeId: string, newPosition: Position) => void; // Positional move
    moveNodeToParent: (nodeId: string, newParentId?: string | null) => void; // Compound move

    // Cluster Operations
    addCluster: (cluster: Partial<Cluster>) => Promise<string>; // Async
    updateCluster: (id: string, updates: Partial<Cluster>) => void; // Returns void
    deleteCluster: (id: string) => void; // Returns void
    moveNodeToCluster: (nodeId: string, clusterId: string | null) => void; // Returns void
    addNodeToCluster: (nodeId: string, clusterId: string) => void;
    removeNodeFromCluster: (nodeId: string) => void;

    // Tag Operations
    tagNote: (noteId: string, tagName: string) => void; // Returns void
    untagNote: (noteId: string, tagName: string) => void; // Add untag

    // Querying & Selection
    searchNodes: (query: string, types: NodeType[]) => any[]; // Keep mapped result for now
    getRelatedNotes: (noteId: string, includeClusters?: boolean) => any[]; // Keep mapped result for now
    getBacklinks: (noteId: string) => any[]; // Keep existing
    getConnections: (noteId: string) => Record<'tag' | 'concept' | 'mention', any[]>; // Keep existing
    selectNode: (nodeId: string) => void;
    selectEdge: (edgeId: string) => void;
    selectCluster: (clusterId: string) => void;
    clearSelection: () => void;

    // Utility (optional, depends if context needs direct access)
    // isCluster: (elementId: string) => boolean;
    // isNote: (elementId: string) => boolean;
    // isEdge: (elementId: string) => boolean;
}

// --- Create Context ---
// Type hint the context creator with the new type
const GraphContext = createContext<GraphContextType | undefined>(undefined);

// --- Graph Provider Component ---
export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);

  // Use graphService instance which implements IGraphService
  // Type hint the service instance for clarity during development (optional)
  const service: IGraphService = graphService;

  useEffect(() => {
    // Initialize from store only once
    if (!initialized && notes.length > 0) { // Check if notes exist to avoid empty import
      console.log("GraphContext: Initializing graph from store", { noteCount: notes.length, clusterCount: clusters.length });
      // graphService is already typed via the import, but using 'service' highlights interface usage
      service.importFromStore(notes, clusters);
      setInitialized(true);
    } else if (!initialized && notes.length === 0) {
        // Handle case where store is empty on first load
        console.log("GraphContext: Store is empty, initializing empty graph.");
        // Optionally clear graphService state if needed, though constructor does this
        // service.clearGraph(); // If you want to ensure it's pristine
        setInitialized(true); // Mark as initialized even if empty
    }
  }, [notes, clusters, initialized, setInitialized, service]); // Add service to dependency array

  // --- Define Context Value ---
  // Implement methods using the 'service' instance
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
        // Optionally resync with store atoms after import?
        // const { notes: importedNotes, clusters: importedClusters } = service.exportToStore();
        // setNotesAtom(importedNotes);
        // setClustersAtom(importedClusters);
    }, [service]), // Add atom setters if needed

    exportElement: useCallback((elementId) => {
      const element = service.findElementById(elementId); // Use service method
      if (!element || element.empty()) return undefined;
      // Assuming exportElement takes the CollectionReturnValue or similar
      // The service's exportElement expects SingularElementArgument
      return service.exportElement(element.first()); // Pass the first element if found
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
      // Service method expects folderId/clusterId as separate args now
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
    searchNodes: useCallback((query, types = [NodeType.NOTE]) => { // Default types
      return service.searchNodes(query, types).map(node => ({ // Keep mapping for consumers
        id: node.id(),
        title: node.data('title'),
        type: node.data('type')
      }));
    }, [service]),

    getRelatedNotes: useCallback((noteId, includeClusters = false) => {
      // Service returns typed array, map it for context consumers if needed
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
      return service.getConnections(noteId);
    }, [service]),

    selectNode: useCallback((nodeId: string) => service.selectNode(nodeId), [service]),
    selectEdge: useCallback((edgeId: string) => service.selectEdge(edgeId), [service]),
    selectCluster: useCallback((clusterId: string) => service.selectCluster(clusterId), [service]),
    clearSelection: useCallback(() => service.clearSelection(), [service]),

  };

  // Wrap methods in useCallback for potential performance optimization if needed
  // (As done above)

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
    // This error signifies that the hook is used outside of the provider's scope
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};

export default GraphContext;