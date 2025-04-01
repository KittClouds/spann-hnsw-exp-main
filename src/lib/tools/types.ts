
// Define the common types for our tools interface

import { Note, Folder, Cluster } from '../store';

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NoteFilter {
  path?: string;
  clusterId?: string;
  tags?: string[];
  textContent?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export interface FolderFilter {
  clusterId?: string;
  parentId?: string | null;
  path?: string;
}

export interface ToolsInterface {
  // Note operations
  getNote(noteId: string): Promise<ToolResult<Note | null>>;
  createNote(title: string, content: any[], path: string, clusterId: string): Promise<ToolResult<Note>>;
  updateNote(noteId: string, updates: Partial<Note>): Promise<ToolResult<Note>>;
  deleteNote(noteId: string): Promise<ToolResult<boolean>>;
  findNotes(filter?: NoteFilter): Promise<ToolResult<Note[]>>;
  
  // Folder operations
  getFolder(folderId: string): Promise<ToolResult<Folder | null>>;
  createFolder(name: string, parentPath: string, clusterId: string, parentId?: string | null): Promise<ToolResult<Folder>>;
  updateFolder(folderId: string, updates: Partial<Folder>): Promise<ToolResult<Folder>>;
  deleteFolder(folderId: string): Promise<ToolResult<boolean>>;
  listFolders(filter?: FolderFilter): Promise<ToolResult<Folder[]>>;
  
  // Cluster operations
  getCluster(clusterId: string): Promise<ToolResult<Cluster | null>>;
  createCluster(name: string): Promise<ToolResult<Cluster>>;
  updateCluster(clusterId: string, updates: Partial<Cluster>): Promise<ToolResult<Cluster>>;
  deleteCluster(clusterId: string): Promise<ToolResult<boolean>>;
  listClusters(): Promise<ToolResult<Cluster[]>>;
  
  // Knowledge graph operations
  getLinkedNotes(noteId: string): Promise<ToolResult<Note[]>>;
  getLinkingNotes(noteId: string): Promise<ToolResult<Note[]>>;
  
  // Path and navigation helpers
  getPathParts(path: string): Promise<ToolResult<string[]>>;
  getBreadcrumbs(path: string): Promise<ToolResult<{name: string; path: string}[]>>;
}
