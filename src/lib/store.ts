import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PartialBlock } from '@blocknote/core';
import { v4 as uuidv4 } from 'uuid';

export interface Cluster {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null; // For folder hierarchy
  type: 'cluster' | 'folder'; // Similar to notes
}

export interface Note {
  id: string;
  title: string;
  content: PartialBlock[];
  createdAt: string;
  updatedAt: string;
  parentId: string | null; // For folder hierarchy
  type: 'note' | 'folder';
  clusterId: string; // Reference to parent cluster
}

// Helper function to get current date in ISO format
const getCurrentDate = () => new Date().toISOString();

// Generate a unique ID using UUID v4
const generateId = () => uuidv4();

// Create a default cluster
const defaultCluster: Cluster = {
  id: uuidv4(),
  title: 'Personal Notes',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
  parentId: null,
  type: 'cluster'
};

// First, create IDs for our initial structure
const folderID = uuidv4();

// Create initial notes with proper structure - avoiding circular reference
const initialNotes: Note[] = [
  {
    id: folderID,
    title: 'Getting Started',
    content: [],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: null,
    type: 'folder',
    clusterId: defaultCluster.id
  },
  { 
    id: uuidv4(),
    title: 'Welcome Note',
    content: [{ 
      type: 'paragraph',
      content: 'Welcome to Galaxy Notes! Start typing here...',
    }],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: folderID, // Reference to the "Getting Started" folder using the pre-defined ID
    type: 'note',
    clusterId: defaultCluster.id
  },
  { 
    id: uuidv4(),
    title: 'How to Use',
    content: [{ 
      type: 'paragraph',
      content: 'Click on a note title to edit it. Create new notes with the + button.',
    }],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: folderID, // Reference to the "Getting Started" folder using the pre-defined ID
    type: 'note',
    clusterId: defaultCluster.id
  },
];

// Main clusters atom with localStorage persistence
export const clustersAtom = atomWithStorage<Cluster[]>('galaxy-clusters', [defaultCluster]);

// Active cluster ID atom
export const activeClusterIdAtom = atom<string>(defaultCluster.id);

// Main notes atom with localStorage persistence
export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

// Active note ID atom
export const activeNoteIdAtom = atom<string | null>(initialNotes[1].id);

// Derived atom for the currently active cluster
export const activeClusterAtom = atom(
  (get) => {
    const clusters = get(clustersAtom);
    const activeId = get(activeClusterIdAtom);
    return clusters.find((cluster) => cluster.id === activeId) || clusters[0];
  },
  (get, set, updatedCluster: Partial<Cluster>) => {
    const clusters = get(clustersAtom);
    const activeId = get(activeClusterIdAtom);
    
    const updatedClusters = clusters.map((cluster) => 
      cluster.id === activeId 
        ? { 
            ...cluster, 
            ...updatedCluster, 
            updatedAt: getCurrentDate() 
          } 
        : cluster
    );
    
    set(clustersAtom, updatedClusters);
  }
);

// Derived atom for notes in the active cluster
export const clusterNotesAtom = atom(
  (get) => {
    const notes = get(notesAtom);
    const activeClusterId = get(activeClusterIdAtom);
    return notes.filter(note => note.clusterId === activeClusterId);
  }
);

// Derived atom for root clusters
export const rootClustersAtom = atom(
  (get) => {
    const clusters = get(clustersAtom);
    return clusters.filter(cluster => cluster.parentId === null);
  }
);

// Derived atom for cluster hierarchy
export const clusterHierarchyAtom = atom(
  (get) => {
    const clusters = get(clustersAtom);
    const rootClusters = clusters.filter(cluster => cluster.parentId === null);
    
    const buildHierarchy = (parentId: string | null) => {
      return clusters
        .filter(cluster => cluster.parentId === parentId)
        .map(cluster => ({
          ...cluster,
          children: buildHierarchy(cluster.id)
        }));
    };
    
    return buildHierarchy(null);
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
  }
);

// Create a new cluster
export const createCluster = () => {
  const newId = uuidv4();
  const now = getCurrentDate();
  
  const newCluster: Cluster = {
    id: newId,
    title: 'New Cluster',
    createdAt: now,
    updatedAt: now,
    parentId: null,
    type: 'cluster',
  };
  
  return newCluster;
};

// Create a new cluster folder
export const createClusterFolder = (parentId: string | null = null) => {
  const newId = uuidv4();
  const now = getCurrentDate();
  
  const newClusterFolder: Cluster = {
    id: newId,
    title: 'New Folder',
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'folder',
  };
  
  return { id: newId, cluster: newClusterFolder };
};

// Create a new note
export const createNote = (parentId: string | null = null, clusterId: string) => {
  const newId = uuidv4();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [{ type: 'paragraph', content: '' }],
    createdAt: now,
    updatedAt: now,
    parentId,
    clusterId,
    type: 'note'
  };
  
  return { id: newId, note: newNote };
};

// Create a new folder
export const createFolder = (parentId: string | null = null, clusterId: string) => {
  const newId = uuidv4();
  const now = getCurrentDate();
  
  const newFolder: Note = {
    id: newId,
    title: 'New Folder',
    content: [],
    createdAt: now,
    updatedAt: now,
    parentId,
    clusterId,
    type: 'folder'
  };
  
  return { id: newId, note: newFolder };
};

// Delete a note by ID
export const deleteNote = (notes: Note[], id: string): Note[] => {
  const noteToDelete = notes.find(note => note.id === id);
  if (!noteToDelete) return notes;

  // If it's a folder, also delete all children
  if (noteToDelete.type === 'folder') {
    const childrenIds = getAllChildrenIds(notes, id);
    return notes.filter(note => !childrenIds.includes(note.id) && note.id !== id);
  }

  return notes.filter(note => note.id !== id);
};

// Delete a cluster by ID (also removes all associated notes)
export const deleteCluster = (clusters: Cluster[], notes: Note[], id: string): { clusters: Cluster[], notes: Note[] } => {
  // Don't allow deleting the last cluster
  if (clusters.length <= 1) {
    return { clusters, notes };
  }

  // Get all cluster IDs to be removed (including child folders)
  const clusterToDelete = clusters.find(cluster => cluster.id === id);
  if (!clusterToDelete) return { clusters, notes };
  
  const clusterIds = getAllClusterChildrenIds(clusters, id);
  clusterIds.push(id); // Add the cluster itself
  
  // Remove the clusters
  const updatedClusters = clusters.filter(cluster => !clusterIds.includes(cluster.id));

  // Remove all notes associated with the deleted clusters
  const updatedNotes = notes.filter(note => !clusterIds.includes(note.clusterId));

  return { 
    clusters: updatedClusters, 
    notes: updatedNotes 
  };
};

// Delete a cluster folder by ID
export const deleteClusterFolder = (clusters: Cluster[], id: string): Cluster[] => {
  const folderToDelete = clusters.find(cluster => cluster.id === id);
  if (!folderToDelete) return clusters;
  
  // Get all child folders
  const childrenIds = getAllClusterChildrenIds(clusters, id);
  
  // Remove the folder and all its children
  return clusters.filter(cluster => !childrenIds.includes(cluster.id) && cluster.id !== id);
};

// Helper to get all children IDs of a folder (recursive)
const getAllChildrenIds = (notes: Note[], folderId: string): string[] => {
  const children = notes.filter(note => note.parentId === folderId);
  const childrenIds = children.map(child => child.id);
  
  const folderChildren = children.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => getAllChildrenIds(notes, folder.id));
  
  return [...childrenIds, ...grandChildrenIds];
};

// Helper to get all children IDs of a cluster folder (recursive)
const getAllClusterChildrenIds = (clusters: Cluster[], folderId: string): string[] => {
  const children = clusters.filter(cluster => cluster.parentId === folderId);
  const childrenIds = children.map(child => child.id);
  
  const folderChildren = children.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => 
    getAllClusterChildrenIds(clusters, folder.id));
  
  return [...childrenIds, ...grandChildrenIds];
};
