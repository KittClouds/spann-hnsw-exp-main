
import React, { createContext, useContext, useState, useEffect } from 'react';
import { graphService } from '../services/GraphService';
import { syncManager } from '../services/SyncManager';
import { NodeType, EdgeType, ElementDefinition, GraphJSON } from '../services/types';
import { useAtom } from 'jotai';
import { notesAtom, clustersAtom, Note, Cluster, graphInitializedAtom, STANDARD_ROOT_ID } from '@/lib/store';
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

  useEffect(() => {
    if (!initialized) {
      console.log("Initializing graph with notes and clusters", { notes, clusters });
      console.log(`Standard root node ID: ${STANDARD_ROOT_ID} - Notes with clusterId: null will be associated with this node`);
      
      if (!clusters.some(c => c.id === 'cluster-default')) {
        console.warn("Default cluster missing from store during initialization");
      }
      
      const standardNotes = notes.filter(note => note.clusterId === null);
      console.log(`Found ${standardNotes.length} notes associated with standard_root`);
      
      syncManager.importFromStore(notes, clusters);
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized]);

  const value: GraphContextType = {
    importNotes: () => {
      syncManager.importFromStore(notes, clusters);
    },
    
    exportNotes: () => {
      return syncManager.exportToStore();
    },
    
    exportGraphJSON: () => {
      return graphService.exportGraph();
    },
    
    importGraphJSON: (graphData) => {
      graphService.importGraph(graphData);
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
      let clusterId = note.clusterId || undefined;
      
      const id = syncManager.addNoteToGraph(
        {
          title: note.title || 'Untitled Note',
          content: note.content || [],
          ...note
        },
        note.parentId || null, 
        note.clusterId || null
      );
      
      return id;
    },
    
    updateNote: (id, updates) => {
      return syncManager.updateNoteInGraph(id, updates);
    },
    
    deleteNote: (id) => {
      return syncManager.deleteNoteFromGraph(id);
    },
    
    addCluster: (cluster) => {
      return syncManager.addClusterToGraph({
        title: cluster.title || 'Untitled Cluster',
        ...cluster
      });
    },
    
    updateCluster: (id, updates) => {
      return syncManager.updateClusterInGraph(id, updates);
    },
    
    deleteCluster: (id) => {
      return syncManager.deleteClusterFromGraph(id);
    },
    
    moveNode: (nodeId, newParentId) => {
      const result = syncManager.moveNoteInGraph(nodeId, newParentId);
      return !!result;
    },
    
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
      const result = graphService.tagNote(noteId, tagName);
      return !!result;
    },
    
    getConnections: (noteId) => {
      return graphService.getConnections(noteId);
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
