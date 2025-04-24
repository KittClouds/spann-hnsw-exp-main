
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PartialBlock } from '@blocknote/core';

export interface Cluster {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

// Generate a unique ID
const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create a default cluster
const defaultCluster: Cluster = {
  id: 'default-cluster',
  title: 'Personal Notes',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate()
};

// Create initial notes with proper structure
const initialNotes: Note[] = [
  {
    id: 'folder-1',
    title: 'Getting Started',
    content: [],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: null,
    type: 'folder',
    clusterId: 'default-cluster'
  },
  { 
    id: generateId(),
    title: 'Welcome Note',
    content: [{ 
      type: 'paragraph',
      content: 'Welcome to Galaxy Notes! Start typing here...',
    }],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'folder-1',
    type: 'note',
    clusterId: 'default-cluster'
  },
  { 
    id: generateId(),
    title: 'How to Use',
    content: [{ 
      type: 'paragraph',
      content: 'Click on a note title to edit it. Create new notes with the + button.',
    }],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'folder-1',
    type: 'note',
    clusterId: 'default-cluster'
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
  const newId = `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = getCurrentDate();
  
  const newCluster: Cluster = {
    id: newId,
    title: 'New Cluster',
    createdAt: now,
    updatedAt: now,
  };
  
  return newCluster;
};

// Create a new note
export const createNote = (parentId: string | null = null, clusterId: string) => {
  const newId = generateId();
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
  const newId = generateId();
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

  // Remove the cluster
  const updatedClusters = clusters.filter(cluster => cluster.id !== id);

  // Remove all notes associated with the cluster
  const updatedNotes = notes.filter(note => note.clusterId !== id);

  return { 
    clusters: updatedClusters, 
    notes: updatedNotes 
  };
};

// Helper to get all children IDs of a folder (recursive)
const getAllChildrenIds = (notes: Note[], folderId: string): string[] => {
  const children = notes.filter(note => note.parentId === folderId);
  const childrenIds = children.map(child => child.id);
  
  const folderChildren = children.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => getAllChildrenIds(notes, folder.id));
  
  return [...childrenIds, ...grandChildrenIds];
};
