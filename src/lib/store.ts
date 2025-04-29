import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Block } from '@blocknote/core';
import { generateClusterId, generateNoteId, ClusterId, NoteId } from './utils/ids';
import { createParagraphBlock } from './utils/blockUtils';

export interface Cluster {
  id: ClusterId;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: NoteId;
  title: string;
  content: Block[];
  createdAt: string;
  updatedAt: string;
  parentId: NoteId | null;
  type: 'note' | 'folder';
  clusterId: ClusterId | null;
  path?: string;
  tags?: string[];
  mentions?: string[];
  concepts?: Array<{ type: string, name: string }>;
}

const getCurrentDate = () => new Date().toISOString();

const initialCluster: Cluster = {
  id: 'cluster-default' as ClusterId,
  title: 'Main Cluster',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
};

// Updated initialNotes to have clusterId: null instead of initialCluster.id
// so they appear in the "Folders" tab by default
const initialNotes: Note[] = [
  {
    id: 'note-folder-1' as NoteId,
    title: 'Getting Started',
    content: [],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: null,
    type: 'folder',
    clusterId: null // Changed from initialCluster.id to null
  },
  { 
    id: generateNoteId(),
    title: 'Welcome Note',
    content: [
      createParagraphBlock('Welcome to Galaxy Notes! Start typing here...', 'welcome-block-1')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: null // Changed from initialCluster.id to null
  },
  { 
    id: generateNoteId(),
    title: 'How to Use',
    content: [
      createParagraphBlock('Click on a note title to edit it. Create new notes with the + button.', 'how-to-use-block-1')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: null // Changed from initialCluster.id to null
  },
];

export const clustersAtom = atomWithStorage<Cluster[]>('galaxy-notes-clusters', [initialCluster]);
export const activeClusterIdAtom = atom<string>(initialCluster.id);

export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

export const activeNoteIdAtom = atom<string | null>(initialNotes[1].id);

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

// Function implementations to maintain backward compatibility with components
export function createNote(parentId: NoteId | null = null, clusterId: ClusterId | null = null) {
  const newId = generateNoteId();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [],
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'note',
    clusterId
  };
  
  return { id: newId, note: newNote };
};

export function createFolder(parentId: NoteId | null = null, clusterId: ClusterId | null = null) {
  const newId = generateNoteId();
  const now = getCurrentDate();
  
  const newFolder: Note = {
    id: newId,
    title: 'New Folder',
    content: [],
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'folder',
    clusterId
  };
  
  return { id: newId, note: newFolder };
};

export function createCluster(title: string) {
  const newId = generateClusterId();
  const now = getCurrentDate();
  
  const newCluster: Cluster = {
    id: newId,
    title,
    createdAt: now,
    updatedAt: now,
  };
  
  // Create a default root folder for this cluster
  const folderId = generateNoteId();
  const rootFolder: Note = {
    id: folderId,
    title: 'Root Folder',
    content: [],
    createdAt: now,
    updatedAt: now,
    parentId: null,
    type: 'folder',
    clusterId: newId
  };
  
  return { 
    id: newId, 
    cluster: newCluster,
    rootFolder
  };
};

export function deleteNote(notes: Note[], id: string): Note[] {
  const noteToDelete = notes.find(note => note.id === id);
  if (!noteToDelete) return notes;

  if (noteToDelete.type === 'folder') {
    const childrenIds = getAllChildrenIds(notes, id);
    return notes.filter(note => !childrenIds.includes(note.id) && note.id !== id);
  }

  return notes.filter(note => note.id !== id);
};

const getAllChildrenIds = (notes: Note[], folderId: string): string[] => {
  const children = notes.filter(note => note.parentId === folderId);
  const childrenIds = children.map(child => child.id);
  
  const folderChildren = children.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => getAllChildrenIds(notes, folder.id));
  
  return [...childrenIds, ...grandChildrenIds];
};

export const graphInitializedAtom = atom<boolean>(false);
export const graphLayoutAtom = atom<string>('dagre');

// Helper to get notes by cluster
export const getNotesByClusterId = (notes: Note[], clusterId: string | null): Note[] => {
  return notes.filter(note => note.clusterId === clusterId);
};

// Helper to get root notes by cluster
export const getRootNotesByClusterId = (notes: Note[], clusterId: string | null): Note[] => {
  return notes.filter(note => note.clusterId === clusterId && note.parentId === null);
};

// Create a type-safe atom wrapper for activeNoteIdAtom
// Instead of using useAtom directly in the store file which causes the error
export const setActiveNoteId = (id: string) => {
  // This function will be used in components with the useAtom hook
  return id;
};
