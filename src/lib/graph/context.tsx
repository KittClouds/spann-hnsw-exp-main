
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { notesAtom, clustersAtom, Note, Cluster, graphInitializedAtom } from '@/lib/store';
import { graphService } from './GraphService';
import { GraphContextType, NodeType } from './types';
import { ClusterId } from './utils';

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes] = useAtom(notesAtom);
  const [clusters] = useAtom(clustersAtom);
  const [initialized, setInitialized] = useAtom(graphInitializedAtom);

  useEffect(() => {
    if (!initialized) {
      console.log("Initializing graph with notes and clusters", { notes, clusters });
      
      if (!clusters.some(c => c.id === 'cluster-default')) {
        console.warn("Default cluster missing from store during initialization");
      }
      
      graphService.importFromStore(notes, clusters);
      setInitialized(true);
    }
  }, [notes, clusters, initialized, setInitialized]);

  // Context value contains all the graph service methods
  const value: GraphContextType = {
    importNotes: () => graphService.importFromStore(notes, clusters),
    exportNotes: () => graphService.exportToStore(),
    exportGraphJSON: (includeStyle) => graphService.exportGraph({ includeStyle }),
    importGraphJSON: (graphData) => graphService.importGraph(graphData),
    exportElement: (elementId) => {
      const element = graphService.getGraph().getElementById(elementId);
      if (element.empty()) return undefined;
      return graphService.exportElement(element);
    },
    importElement: (elementJson) => graphService.importElement(elementJson),
    addNote: (note) => {
      const clusterId = note.clusterId || undefined;
      const node = graphService.addNote({
        title: note.title || 'Untitled Note',
        content: note.content || [],
        ...note
      }, note.parentId, clusterId);
      return node.id();
    },
    updateNote: (id, updates) => graphService.updateNote(id, updates),
    deleteNote: (id) => graphService.deleteNote(id),
    addCluster: (cluster) => graphService.addCluster({
      title: cluster.title || 'Untitled Cluster',
      ...cluster
    }).id(),
    updateCluster: (id, updates) => graphService.updateCluster(id, updates),
    deleteCluster: (id) => graphService.deleteCluster(id),
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
      return graphService.getRelatedNodes(noteId).map(node => ({
        id: node.id(),
        title: node.data('title'),
        type: node.data('type')
      }));
    },
    getBacklinks: (noteId) => graphService.getBacklinks(noteId),
    tagNote: (noteId, tagName) => {
      const result = graphService.tagNote(noteId, tagName);
      return !!result;
    },
    getConnections: (noteId) => graphService.getConnections(noteId)
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
