
import React, { createContext, useContext, useState, useEffect } from 'react';
import { graphService } from '../services/GraphService';
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
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);

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
      return graphService.exportToStore();
    },
    addNote: (note) => {
      const parentCluster = clusters.find(c => c.id === note.clusterId);
      return graphService.addNote(note, parentCluster?.id).id();
    },
    updateNote: (id, updates) => {
      return graphService.updateNote(id, updates);
    },
    deleteNote: (id) => {
      return graphService.deleteNote(id);
    },
    addCluster: (cluster) => {
      return graphService.addCluster(cluster).id();
    },
    updateCluster: (id, updates) => {
      return graphService.updateCluster(id, updates);
    },
    deleteCluster: (id) => {
      return graphService.deleteCluster(id);
    },
    moveNode: (nodeId, newParentId) => {
      return graphService.moveNode(nodeId, newParentId);
    },
    searchNotes: (query) => {
      return graphService.searchNodes(query);
    },
    getRelatedNotes: (noteId) => {
      return graphService.getRelatedNotes(noteId);
    },
    getBacklinks: (noteId) => {
      return graphService.getBacklinks(noteId);
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
