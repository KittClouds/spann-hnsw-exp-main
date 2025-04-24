
import React, { createContext, useContext, useState, useEffect } from 'react';
import { graphService, NodeType } from '../services/GraphService';
import { useAtom } from 'jotai';
import { notesAtom, clustersAtom, Note, Cluster, graphInitializedAtom } from '@/lib/store';

interface GraphContextType {
  importNotes: () => void;
  exportNotes: () => { notes: Note[], clusters: Cluster[] };
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

  // Initialize the graph with existing notes and clusters
  useEffect(() => {
    if (!initialized) {
      graphService.importFromStore(notes, clusters);
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized]);

  const value: GraphContextType = {
    importNotes: () => {
      graphService.importFromStore(notes, clusters);
    },
    
    exportNotes: () => {
      const { notes, clusters } = graphService.exportToStore();
      return { notes, clusters };
    },
    
    addNote: (note) => {
      // First ensure the cluster exists if clusterId is provided
      let clusterId = note.clusterId || undefined;
      
      const node = graphService.addNote({
        title: note.title || 'Untitled Note',
        content: note.content || [],
        ...note
      }, note.parentId, clusterId);
      
      return node.id();
    },
    
    updateNote: (id, updates) => {
      return graphService.updateNote(id, updates);
    },
    
    deleteNote: (id) => {
      return graphService.deleteNote(id);
    },
    
    addCluster: (cluster) => {
      return graphService.addCluster({
        title: cluster.title || 'Untitled Cluster',
        ...cluster
      }).id();
    },
    
    updateCluster: (id, updates) => {
      return graphService.updateCluster(id, updates);
    },
    
    deleteCluster: (id) => {
      return graphService.deleteCluster(id);
    },
    
    moveNode: (nodeId, newParentId) => {
      const result = graphService.moveNode(nodeId, newParentId);
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
      return graphService.getRelatedNotes(noteId).map(node => ({
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
