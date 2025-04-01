
import { useAtom } from 'jotai';
import { notesAtom, foldersAtom, clustersAtom, syncKnowledgeGraphAtom } from '../store';
import { ToolsService } from './toolsService';
import { useCallback } from 'react';
import { Note, Folder, Cluster } from '../store';

export function useTools() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [folders, setFolders] = useAtom(foldersAtom);
  const [clusters, setClusters] = useAtom(clustersAtom);
  const syncGraph = useAtom(syncKnowledgeGraphAtom)[1];
  
  // Create a new ToolsService instance with the current data
  const getToolsService = useCallback(() => {
    return new ToolsService(notes, folders, clusters);
  }, [notes, folders, clusters]);
  
  // Sync the data after tools operations
  const syncData = useCallback((toolsService: ToolsService) => {
    const { notes: updatedNotes, folders: updatedFolders, clusters: updatedClusters } = toolsService.getData();
    setNotes(updatedNotes);
    setFolders(updatedFolders);
    setClusters(updatedClusters);
    syncGraph();
  }, [setNotes, setFolders, setClusters, syncGraph]);
  
  // Note operations
  const getNote = useCallback(async (noteId: string) => {
    const tools = getToolsService();
    const result = await tools.getNote(noteId);
    return result;
  }, [getToolsService]);
  
  const createNote = useCallback(async (title: string, content: any[], path: string, clusterId: string) => {
    const tools = getToolsService();
    const result = await tools.createNote(title, content, path, clusterId);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const tools = getToolsService();
    const result = await tools.updateNote(noteId, updates);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const deleteNote = useCallback(async (noteId: string) => {
    const tools = getToolsService();
    const result = await tools.deleteNote(noteId);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const findNotes = useCallback(async (filter) => {
    const tools = getToolsService();
    return await tools.findNotes(filter);
  }, [getToolsService]);
  
  // Folder operations
  const getFolder = useCallback(async (folderId: string) => {
    const tools = getToolsService();
    return await tools.getFolder(folderId);
  }, [getToolsService]);
  
  const createFolder = useCallback(async (name: string, parentPath: string, clusterId: string, parentId?: string | null) => {
    const tools = getToolsService();
    const result = await tools.createFolder(name, parentPath, clusterId, parentId);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const updateFolder = useCallback(async (folderId: string, updates: Partial<Folder>) => {
    const tools = getToolsService();
    const result = await tools.updateFolder(folderId, updates);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const deleteFolder = useCallback(async (folderId: string) => {
    const tools = getToolsService();
    const result = await tools.deleteFolder(folderId);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const listFolders = useCallback(async (filter) => {
    const tools = getToolsService();
    return await tools.listFolders(filter);
  }, [getToolsService]);
  
  // Cluster operations
  const getCluster = useCallback(async (clusterId: string) => {
    const tools = getToolsService();
    return await tools.getCluster(clusterId);
  }, [getToolsService]);
  
  const createCluster = useCallback(async (name: string) => {
    const tools = getToolsService();
    const result = await tools.createCluster(name);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const updateCluster = useCallback(async (clusterId: string, updates: Partial<Cluster>) => {
    const tools = getToolsService();
    const result = await tools.updateCluster(clusterId, updates);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const deleteCluster = useCallback(async (clusterId: string) => {
    const tools = getToolsService();
    const result = await tools.deleteCluster(clusterId);
    if (result.success) {
      syncData(tools);
    }
    return result;
  }, [getToolsService, syncData]);
  
  const listClusters = useCallback(async () => {
    const tools = getToolsService();
    return await tools.listClusters();
  }, [getToolsService]);
  
  // Knowledge graph operations
  const getLinkedNotes = useCallback(async (noteId: string) => {
    const tools = getToolsService();
    return await tools.getLinkedNotes(noteId);
  }, [getToolsService]);
  
  const getLinkingNotes = useCallback(async (noteId: string) => {
    const tools = getToolsService();
    return await tools.getLinkingNotes(noteId);
  }, [getToolsService]);
  
  // Path and navigation helpers
  const getPathParts = useCallback(async (path: string) => {
    const tools = getToolsService();
    return await tools.getPathParts(path);
  }, [getToolsService]);
  
  const getBreadcrumbs = useCallback(async (path: string) => {
    const tools = getToolsService();
    return await tools.getBreadcrumbs(path);
  }, [getToolsService]);
  
  return {
    // Note operations
    getNote,
    createNote,
    updateNote,
    deleteNote,
    findNotes,
    
    // Folder operations
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    listFolders,
    
    // Cluster operations
    getCluster,
    createCluster,
    updateCluster,
    deleteCluster,
    listClusters,
    
    // Knowledge graph operations
    getLinkedNotes,
    getLinkingNotes,
    
    // Path and navigation helpers
    getPathParts,
    getBreadcrumbs
  };
}
