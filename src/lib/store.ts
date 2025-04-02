
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PartialBlock } from '@blocknote/core';
import { KnowledgeGraph } from './knowledgeGraph';

// Define the Cluster interface
export interface Cluster {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: PartialBlock[];
  createdAt: string;
  updatedAt: string;
  path: string; // e.g., "/Personal/Journal" or "/" for root
  tags: string[]; // Array of tag identifiers
  clusterId: string; // Reference to parent cluster
}

export interface Folder {
  id: string;
  name: string;
  path: string; // Full path to this folder
  parentId: string | null; // null for root folders
  createdAt: string;
  updatedAt: string;
  clusterId: string; // Reference to parent cluster
}

// View mode type
export type ViewMode = 'folders' | 'clusters';

// Helper function to get current date in ISO format
export const getCurrentDate = () => new Date().toISOString();

// Generate a unique ID
export const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
export const generateFolderId = () => `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
export const generateClusterId = () => `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create a default cluster
const defaultClusterId = 'default-cluster';
const defaultCluster: Cluster = {
  id: defaultClusterId,
  name: 'Main Cluster',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate()
};

// Root folder for the file system
const rootFolder: Folder = {
  id: 'root',
  name: 'Root',
  path: '/',
  parentId: null,
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
  clusterId: defaultClusterId
};

// Create initial notes with proper structure
const initialNotes: Note[] = [
  { 
    id: generateId(), 
    title: 'Welcome Note', 
    content: [{ 
      type: 'paragraph', 
      content: 'Welcome to Galaxy Notes! Start typing here...'
    }], 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate(),
    path: '/',
    tags: [],
    clusterId: defaultClusterId
  },
  { 
    id: generateId(), 
    title: 'Getting Started', 
    content: [{ 
      type: 'paragraph', 
      content: 'Click on a note title to edit it. Create new notes with the + button.'
    }], 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate(),
    path: '/',
    tags: [],
    clusterId: defaultClusterId
  },
];

// Initial folder structure with just the root folder
const initialFolders: Folder[] = [rootFolder];

// Initial clusters
const initialClusters: Cluster[] = [defaultCluster];

// View mode atom (folders or clusters)
export const viewModeAtom = atomWithStorage<ViewMode>('galaxy-view-mode', 'folders');

// Main notes atom with localStorage persistence
export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

// Folders atom with localStorage persistence
export const foldersAtom = atomWithStorage<Folder[]>('galaxy-folders', initialFolders);

// Clusters atom with localStorage persistence
export const clustersAtom = atomWithStorage<Cluster[]>('galaxy-clusters', initialClusters);

// Active note ID atom
export const activeNoteIdAtom = atom<string | null>(initialNotes[0].id);

// Current folder path atom
export const currentFolderPathAtom = atom<string>('/');

// Current cluster ID atom
export const currentClusterIdAtom = atom<string>(defaultClusterId);

// Knowledge Graph atom
export const knowledgeGraphAtom = atom<KnowledgeGraph>(new KnowledgeGraph());

// Atom for syncing knowledge graph
export const syncKnowledgeGraphAtom = atom(
  null, // read function returns null (not used)
  (get, set) => {
    const notes = get(notesAtom);
    const folders = get(foldersAtom);
    const graph = new KnowledgeGraph();
    graph.buildGraph(notes, folders);
    set(knowledgeGraphAtom, graph);
  }
);

// Derived atom for notes in current folder - UPDATED to strictly enforce clusterId filtering
export const currentFolderNotesAtom = atom(
  (get) => {
    const notes = get(notesAtom);
    const currentPath = get(currentFolderPathAtom);
    const currentClusterId = get(currentClusterIdAtom);
    const viewMode = get(viewModeAtom);
    
    if (viewMode === 'folders') {
      // In folders view, only show notes from the default cluster
      return notes.filter(note => 
        note.path === currentPath && 
        note.clusterId === 'default-cluster'
      );
    } else {
      // In clusters view, only show notes from the current cluster
      return notes.filter(note => 
        note.path === currentPath && 
        note.clusterId === currentClusterId
      );
    }
  }
);

// Derived atom for folders in current folder - UPDATED to strictly enforce clusterId filtering
export const currentFolderChildrenAtom = atom(
  (get) => {
    const folders = get(foldersAtom);
    const currentPath = get(currentFolderPathAtom);
    const currentClusterId = get(currentClusterIdAtom);
    const viewMode = get(viewModeAtom);
    
    // For root path ("/"), we want folders with parentId null
    if (currentPath === '/') {
      if (viewMode === 'folders') {
        // In folders mode, ONLY show root folders from default cluster
        return folders.filter(folder => 
          folder.parentId === null && 
          folder.id !== 'root' &&
          folder.clusterId === 'default-cluster'
        );
      } else {
        // In clusters mode, only show root folders from the current cluster
        return folders.filter(folder => 
          folder.parentId === null && 
          folder.id !== 'root' && 
          folder.clusterId === currentClusterId
        );
      }
    }
    
    // Find the current folder
    const currentFolder = folders.find(folder => folder.path === currentPath);
    
    if (!currentFolder) return [];
    
    // Return folders that have this folder as parent with the correct clusterId
    if (viewMode === 'folders') {
      return folders.filter(folder => 
        folder.parentId === currentFolder.id &&
        folder.clusterId === 'default-cluster'
      );
    } else {
      return folders.filter(folder => 
        folder.parentId === currentFolder.id && 
        folder.clusterId === currentClusterId
      );
    }
  }
);

// Derived atom for the currently active note
export const activeNoteAtom = atom(
  (get) => {
    const notes = get(notesAtom);
    const activeId = get(activeNoteIdAtom);
    
    if (!activeId) return null;
    return notes.find((note) => note.id === activeId) || null;
  },
  (get, set, updatedNote: Partial<Note>) => {
    const notes = get(notesAtom);
    const activeId = get(activeNoteIdAtom);
    
    if (!activeId) return;
    
    const updatedNotes = notes.map((note) => 
      note.id === activeId 
        ? { 
            ...note, 
            ...updatedNote, 
            updatedAt: getCurrentDate() 
          } 
        : note
    );
    
    set(notesAtom, updatedNotes);
    
    // Update the knowledge graph when a note changes
    set(syncKnowledgeGraphAtom);
  }
);

// Create a new note and return its ID
export const createNote = (folderPath: string = '/', clusterId: string = defaultClusterId) => {
  const newId = generateId();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [{ type: 'paragraph', content: '' }],
    createdAt: now,
    updatedAt: now,
    path: folderPath,
    tags: [],
    clusterId
  };
  
  return { id: newId, note: newNote };
};

// Create a new folder
export const createFolder = (
  name: string, 
  parentPath: string = '/', 
  parentId: string | null = null,
  clusterId: string = defaultClusterId
) => {
  const newId = generateFolderId();
  const now = getCurrentDate();
  
  // Create the path for the new folder
  const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
  
  const newFolder: Folder = {
    id: newId,
    name,
    path,
    parentId,
    createdAt: now,
    updatedAt: now,
    clusterId
  };
  
  return { id: newId, folder: newFolder };
};

// Create a new cluster
export const createCluster = (name: string) => {
  const newId = generateClusterId();
  const now = getCurrentDate();
  
  const newCluster: Cluster = {
    id: newId,
    name,
    createdAt: now,
    updatedAt: now
  };
  
  return { id: newId, cluster: newCluster };
};

// Delete a note by ID
export const deleteNote = (notes: Note[], id: string): Note[] => {
  return notes.filter(note => note.id !== id);
};

// Delete a folder by ID (this does not delete contained notes/folders)
export const deleteFolder = (folders: Folder[], id: string): Folder[] => {
  return folders.filter(folder => folder.id !== id);
};

// Delete a cluster by ID (only if empty)
export const deleteCluster = (
  clusters: Cluster[], 
  folders: Folder[], 
  notes: Note[], 
  clusterId: string
): { canDelete: boolean; clusters: Cluster[] } => {
  // Check if the cluster is empty
  const hasContent = folders.some(folder => folder.clusterId === clusterId) || 
                     notes.some(note => note.clusterId === clusterId);
  
  if (hasContent) {
    return { canDelete: false, clusters };
  }
  
  return { 
    canDelete: true, 
    clusters: clusters.filter(cluster => cluster.id !== clusterId) 
  };
};

// Helper to get folder path parts
export const getPathParts = (path: string): string[] => {
  if (path === '/') return ['/'];
  return ['/', ...path.split('/').filter(Boolean)];
};

// Helper to get breadcrumb data from a path
export const getBreadcrumbsFromPath = (path: string, folders: Folder[]): { name: string; path: string }[] => {
  if (path === '/') {
    return [{ name: 'Home', path: '/' }];
  }
  
  const parts = path.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', path: '/' }];
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += `/${part}`;
    const folder = folders.find(f => f.path === currentPath);
    breadcrumbs.push({ 
      name: folder?.name || part, 
      path: currentPath 
    });
  }
  
  return breadcrumbs;
};

// Move a note to a different folder
export const moveNote = (
  notes: Note[], 
  noteId: string, 
  targetFolderPath: string,
  targetClusterId?: string
): Note[] => {
  return notes.map(note => {
    if (note.id === noteId) {
      const updates: Partial<Note> = { 
        path: targetFolderPath, 
        updatedAt: getCurrentDate() 
      };
      
      // Update clusterId if provided
      if (targetClusterId) {
        updates.clusterId = targetClusterId;
      }
      
      return { ...note, ...updates };
    }
    return note;
  });
};

// Move a folder to a different parent folder
export const moveFolder = (
  folders: Folder[],
  notes: Note[],
  folderId: string,
  targetParentId: string | null,
  targetParentPath: string,
  targetClusterId?: string
): { folders: Folder[]; notes: Note[] } => {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return { folders, notes };
  
  const oldPath = folder.path;
  const folderName = folder.name;
  
  // Create the new path for the folder
  const newPath = targetParentPath === '/' ? `/${folderName}` : `${targetParentPath}/${folderName}`;
  
  // Update this folder and all subfolders
  const updatedFolders = folders.map(f => {
    // Update the target folder
    if (f.id === folderId) {
      const updates: Partial<Folder> = {
        parentId: targetParentId,
        path: newPath,
        updatedAt: getCurrentDate()
      };
      
      // Update clusterId if provided
      if (targetClusterId) {
        updates.clusterId = targetClusterId;
      }
      
      return { ...f, ...updates };
    }
    
    // Update child folders' paths
    if (f.path.startsWith(oldPath + '/')) {
      const restOfPath = f.path.slice(oldPath.length);
      const updates: Partial<Folder> = {
        path: newPath + restOfPath,
        updatedAt: getCurrentDate()
      };
      
      // Update clusterId for child folders if moving to a different cluster
      if (targetClusterId && f.clusterId !== targetClusterId) {
        updates.clusterId = targetClusterId;
      }
      
      return { ...f, ...updates };
    }
    
    return f;
  });
  
  // Update notes' paths
  const updatedNotes = notes.map(note => {
    if (note.path === oldPath) {
      const updates: Partial<Note> = {
        path: newPath,
        updatedAt: getCurrentDate()
      };
      
      // Update clusterId if provided
      if (targetClusterId && note.clusterId !== targetClusterId) {
        updates.clusterId = targetClusterId;
      }
      
      return { ...note, ...updates };
    }
    
    if (note.path.startsWith(oldPath + '/')) {
      const restOfPath = note.path.slice(oldPath.length);
      const updates: Partial<Note> = {
        path: newPath + restOfPath,
        updatedAt: getCurrentDate()
      };
      
      // Update clusterId if provided
      if (targetClusterId && note.clusterId !== targetClusterId) {
        updates.clusterId = targetClusterId;
      }
      
      return { ...note, ...updates };
    }
    
    return note;
  });
  
  return { folders: updatedFolders, notes: updatedNotes };
};

// Rename a folder and update all child paths
export const renameFolder = (
  folders: Folder[],
  notes: Note[],
  folderId: string,
  newName: string
): { folders: Folder[]; notes: Note[] } => {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return { folders, notes };
  
  const oldPath = folder.path;
  const pathParts = oldPath.split('/').filter(Boolean);
  pathParts.pop(); // Remove old name
  
  const parentPath = pathParts.length ? `/${pathParts.join('/')}` : '/';
  const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
  
  // Update this folder
  const updatedFolders = folders.map(f => {
    if (f.id === folderId) {
      return { ...f, name: newName, path: newPath, updatedAt: getCurrentDate() };
    }
    
    // Update child folder paths
    if (f.path.startsWith(oldPath + '/')) {
      const restOfPath = f.path.slice(oldPath.length);
      return { ...f, path: newPath + restOfPath, updatedAt: getCurrentDate() };
    }
    
    return f;
  });
  
  // Update notes
  const updatedNotes = notes.map(note => {
    if (note.path === oldPath) {
      return { ...note, path: newPath, updatedAt: getCurrentDate() };
    }
    
    if (note.path.startsWith(oldPath + '/')) {
      const restOfPath = note.path.slice(oldPath.length);
      return { ...note, path: newPath + restOfPath, updatedAt: getCurrentDate() };
    }
    
    return note;
  });
  
  return { folders: updatedFolders, notes: updatedNotes };
};

// Rename a cluster
export const renameCluster = (
  clusters: Cluster[],
  clusterId: string,
  newName: string
): Cluster[] => {
  return clusters.map(cluster => 
    cluster.id === clusterId
      ? { ...cluster, name: newName, updatedAt: getCurrentDate() }
      : cluster
  );
};

// Migrate existing data to use the cluster system
export const migrateToClusterSystem = (
  notes: Note[],
  folders: Folder[],
  defaultClusterId: string
): { notes: Note[], folders: Folder[] } => {
  const migratedNotes = notes.map(note => ({
    ...note,
    clusterId: note.clusterId || defaultClusterId
  }));
  
  const migratedFolders = folders.map(folder => ({
    ...folder,
    clusterId: folder.clusterId || defaultClusterId
  }));
  
  return { notes: migratedNotes, folders: migratedFolders };
};
