
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Block } from '@blocknote/core';
import { generateClusterId, generateNoteId, generateNodeId, ClusterId, NoteId } from './utils/ids';
import { createParagraphBlock } from './utils/blockUtils';
import { parseAllNotes } from './utils/parsingUtils'; // Import the new utility
import { Thread, ThreadMessage, ChatRole } from '../services/types';

// Define standard root ID constant to make it explicit throughout the codebase
export const STANDARD_ROOT_ID = 'standard_root';

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

// Re-export NoteId and ClusterId types for use elsewhere
export type { NoteId, ClusterId };

const getCurrentDate = () => new Date().toISOString();

const initialCluster: Cluster = {
  id: 'cluster-default' as ClusterId,
  title: 'Main Cluster',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
};

// Initial notes are now explicitly associated with null clusterId
// This ensures they belong to standard_root and not any cluster
const initialNotes: Note[] = [
  {
    id: 'note-folder-1' as NoteId,
    title: 'Getting Started',
    content: [],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: null,
    type: 'folder',
    clusterId: null // This note belongs to standard_root, not any cluster
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
    clusterId: null // This note belongs to standard_root, not any cluster
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
    clusterId: null // This note belongs to standard_root, not any cluster
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

// --- Derived Connection Atoms ---

// Base atom that parses all notes whenever notesAtom changes
const parsedConnectionsAtom = atom((get) => {
  const notes = get(notesAtom);
  console.log("Recalculating all parsed connections"); // Debug log
  return parseAllNotes(notes);
});

// Atom for Tags Map (NoteId -> string[])
export const noteTagsMapAtom = atom(
  (get) => get(parsedConnectionsAtom).tagsMap
);

// Atom for Mentions Map (NoteId -> string[])
export const noteMentionsMapAtom = atom(
  (get) => get(parsedConnectionsAtom).mentionsMap
);

// Atom for Links Map (NoteId -> link titles string[])
export const noteLinksMapAtom = atom(
  (get) => get(parsedConnectionsAtom).linksMap
);

// Convenience atom to get connections for the currently active note
export const activeNoteConnectionsAtom = atom((get) => {
  const activeId = get(activeNoteIdAtom);
  if (!activeId) return { tags: [], mentions: [], links: [] };

  // Directly access the specific note's connections from the maps
  return {
    tags: get(noteTagsMapAtom).get(activeId) ?? [],
    mentions: get(noteMentionsMapAtom).get(activeId) ?? [],
    links: get(noteLinksMapAtom).get(activeId) ?? [], // Returns link titles
  };
});

// Thread chat state
export const threadsAtom = atomWithStorage<Thread[]>('galaxy-notes-threads', []);
export const activeThreadIdAtom = atom<string | null>(null);
export const threadMessagesAtom = atomWithStorage<ThreadMessage[]>('galaxy-notes-thread-messages', []);

export const activeThreadMessagesAtom = atom((get) => {
  const tid = get(activeThreadIdAtom);
  if (!tid) return [];
  return get(threadMessagesAtom).filter((msg) => msg.threadId === tid);
});

// Function implementations to maintain backward compatibility with components
export function createNote(parentId: string | null = null, clusterId: string | null = null) {
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

export function createFolder(parentId: string | null = null, clusterId: string | null = null) {
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

// Helpers to create thread and messages
export function createThread(title: string = 'New Thread'): Thread {
  const now = getCurrentDate();
  return { id: generateNodeId(), title, createdAt: now, updatedAt: now };
}

export function createThreadMessage(
  threadId: string,
  role: ChatRole,
  content: string,
  parentId: string | null = null
): ThreadMessage {
  return { id: generateNodeId(), threadId, role, content, createdAt: getCurrentDate(), parentId };
}

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

// Helper to get root notes by cluster or associated with standard_root
export const getRootNotesByClusterId = (notes: Note[], clusterId: string | null): Note[] => {
  return notes.filter(note => note.clusterId === clusterId && note.parentId === null);
};

// Helper to get standard notes (notes not associated with any cluster)
export const getStandardNotes = (notes: Note[]): Note[] => {
  return notes.filter(note => note.clusterId === null);
};

// Helper to get root standard notes (notes not associated with any cluster and with no parent)
export const getRootStandardNotes = (notes: Note[]): Note[] => {
  return notes.filter(note => note.clusterId === null && note.parentId === null);
};

// Create a type-safe atom wrapper for activeNoteIdAtom
// Instead of using useAtom directly in the store file which causes the error
export const setActiveNoteId = (id: string) => {
  // This function will be used in components with the useAtom hook
  return id;
};
