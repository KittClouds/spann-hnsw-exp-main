
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
  parentId: string | null;
  type: 'note' | 'folder';
  clusterId: string | null;
  path?: string;
  tags?: string[];
  mentions?: string[];
  concepts?: Array<{ type: string, name: string }>;
}

const getCurrentDate = () => new Date().toISOString();

const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const initialCluster: Cluster = {
  id: 'default-cluster',
  title: 'Main Cluster',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
};

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
    }] as PartialBlock[],
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
    }] as PartialBlock[],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'folder-1',
    type: 'note',
    clusterId: 'default-cluster'
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

export const createNote = (parentId: string | null = null, clusterId: string | null = null) => {
  const newId = generateId();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [{ type: 'paragraph', content: '' }] as PartialBlock[],
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'note',
    clusterId
  };
  
  return { id: newId, note: newNote };
};

export const createFolder = (parentId: string | null = null, clusterId: string | null = null) => {
  const newId = generateId();
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

export const createCluster = (title: string) => {
  const newId = generateId();
  const now = getCurrentDate();
  
  const newCluster: Cluster = {
    id: newId,
    title,
    createdAt: now,
    updatedAt: now,
  };
  
  return { id: newId, cluster: newCluster };
};

export const deleteNote = (notes: Note[], id: string): Note[] => {
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
