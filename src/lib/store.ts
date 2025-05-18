import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Block } from '@blocknote/core';
import { generateClusterId, generateNoteId, generateNodeId, TripleId, NoteId, ClusterId } from './utils/ids';
import { createParagraphBlock } from './utils/blockUtils';
import { parseAllNotes, Entity, Triple as ParsedTriple } from './utils/parsingUtils'; 
import { Thread, ThreadMessage, ChatRole } from '../services/types';
import { SchemaDefinitions } from './schema';

// Define standard root ID constant to make it explicit throughout the codebase
export const STANDARD_ROOT_ID = 'standard_root';

// Define node kinds
export type NodeKind = 'NOTE' | 'FOLDER' | 'TAG' | 'MENTION' | 'CLUSTER' | 'CHARACTER' | 'LOCATION' | 'CONCEPT' | string;

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
  entities?: Entity[];  // Derived entities from content
  triples?: Triple[];   // Derived triples from content
}

// Update Triple interface to include an optional id
export interface Triple {
  id?: TripleId;          // injected when graph materialises
  subject: Entity;
  predicate: string;
  object: Entity;
}

// Re-export NoteId and ClusterId types for use elsewhere
export type { NoteId, ClusterId, TripleId };

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
  {
    id: generateNoteId(),
    title: 'Dynamic Schema Example',
    content: [
      createParagraphBlock('Galaxy Notes now supports dynamic schemas! Try these examples:', 'schema-block-1'),
      createParagraphBlock('[CHARACTER|Jon Snow] born in [LOCATION|Winterfell]', 'schema-block-2'),
      createParagraphBlock('[CHARACTER|Jon Snow] (ALLY_OF) [CHARACTER|Arya Stark]', 'schema-block-3'),
      createParagraphBlock('[CHARACTER|Cersei Lannister] (ENEMY_OF) [CHARACTER|Jon Snow]', 'schema-block-4'),
      createParagraphBlock('You can create custom entities with [TYPE|Label] syntax and relationships with [TYPE|Entity1] (RELATIONSHIP) [TYPE|Entity2] syntax.', 'schema-block-5')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: null
  },
  {
    id: generateNoteId(),
    title: 'Story Entities Example',
    content: [
      createParagraphBlock('# Enhanced Entity Types for Storytelling', 'story-block-1'),
      createParagraphBlock('Galaxy Notes now supports specialized entity types for creative writing and storytelling!', 'story-block-2'),
      createParagraphBlock('## Characters and NPCs', 'story-block-3'),
      createParagraphBlock('[CHARACTER|Gandalf|{"role":"Wizard","alignment":"Good"}] is a powerful wizard.', 'story-block-4'),
      createParagraphBlock('[NPC|Barkeeper|{"role":"Innkeeper","motivation":"Make money"}] runs the local inn.', 'story-block-5'),
      createParagraphBlock('## Locations and Scenes', 'story-block-6'),
      createParagraphBlock('[LOCATION|Rivendell|{"type":"City","description":"Elven outpost"}] is an elven sanctuary.', 'story-block-7'),
      createParagraphBlock('[SCENE|Council Meeting|{"mood":"Tense","time":"Morning"}] takes place in Rivendell.', 'story-block-8'),
      createParagraphBlock('## Items and Factions', 'story-block-9'),
      createParagraphBlock('[ITEM|One Ring|{"rarity":"Legendary","power":10}] must be destroyed.', 'story-block-10'),
      createParagraphBlock('[FACTION|The Fellowship|{"alignment":"Good","power":8}] is formed to destroy the ring.', 'story-block-11'),
      createParagraphBlock('## Events and Relationships', 'story-block-12'),
      createParagraphBlock('[EVENT|Ring Destruction|{"impact":"Major","date":"Third Age 3019"}] is the climax of the story.', 'story-block-13'),
      createParagraphBlock('[CHARACTER|Frodo] (OWNS) [ITEM|One Ring]', 'story-block-14'),
      createParagraphBlock('[CHARACTER|Gandalf] (PART_OF) [FACTION|The Fellowship]', 'story-block-15'),
      createParagraphBlock('[SCENE|Council Meeting] (OCCURS_IN) [LOCATION|Rivendell]', 'story-block-16'),
      createParagraphBlock('[CHARACTER|Frodo] (PARTICIPATES_IN) [SCENE|Council Meeting]', 'story-block-17'),
      createParagraphBlock('[EVENT|Ring Destruction] (FOLLOWS) [EVENT|Battle at Black Gate]', 'story-block-18')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: null
  }
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

// New atoms for entities and triples
export const noteEntitiesMapAtom = atom(
  (get) => get(parsedConnectionsAtom).entitiesMap
);

export const noteTriplesMapAtom = atom(
  (get) => get(parsedConnectionsAtom).triplesMap
);

// Convenience atom to get connections for the currently active note
export const activeNoteConnectionsAtom = atom((get) => {
  const activeId = get(activeNoteIdAtom);
  if (!activeId) return { tags: [], mentions: [], links: [], entities: [], triples: [] };

  // Directly access the specific note's connections from the maps
  return {
    tags: get(noteTagsMapAtom).get(activeId) ?? [],
    mentions: get(noteMentionsMapAtom).get(activeId) ?? [],
    links: get(noteLinksMapAtom).get(activeId) ?? [], // Returns link titles
    entities: get(noteEntitiesMapAtom).get(activeId) ?? [],
    triples: get(noteTriplesMapAtom).get(activeId) ?? []
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
    parentId: parentId as NoteId | null,
    type: 'note',
    clusterId: clusterId as ClusterId | null
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
    parentId: parentId as NoteId | null,
    type: 'folder',
    clusterId: clusterId as ClusterId | null
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

// Add export for schemaAtom (required by GraphContext.tsx)
export const schemaAtom = atomWithStorage<SchemaDefinitions>('galaxy-schema-defs', {
  nodes: [],
  edges: []
});

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
