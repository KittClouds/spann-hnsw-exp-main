
import { atom } from 'jotai';
import { atomWithStorage, atomFamily } from 'jotai/utils';
import { atomWithImmer } from 'jotai-immer'; // Import Immer integration
import { Block } from '@blocknote/core';
import { generateClusterId, generateNoteId, ClusterId, NoteId } from './utils/ids';
import { createParagraphBlock } from './utils/blockUtils';

// --- Interfaces (Unchanged) ---
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

// --- Constants and Helpers ---
const getCurrentDate = () => new Date().toISOString();

// Define the type for the normalized notes map
export type NotesMap = Record<NoteId, Note>;

// --- Initial State ---
const initialCluster: Cluster = {
  id: 'cluster-default' as ClusterId,
  title: 'Main Cluster',
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate(),
};

const initialNotesArray: Note[] = [
  {
    id: 'note-folder-1' as NoteId,
    title: 'Getting Started',
    content: [],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: null,
    type: 'folder',
    clusterId: initialCluster.id
  },
  {
    id: 'note-welcome' as NoteId,
    title: 'Welcome Note',
    content: [
      createParagraphBlock('Welcome to Galaxy Notes! Start typing here...', 'welcome-block-1')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: initialCluster.id
  },
  {
    id: 'note-how-to' as NoteId,
    title: 'How to Use',
    content: [
      createParagraphBlock('Click on a note title to edit it. Create new notes with the + button.', 'how-to-use-block-1')
    ],
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    parentId: 'note-folder-1' as NoteId,
    type: 'note',
    clusterId: initialCluster.id
  },
];

// Convert initial array to map
const initialNotesMap: NotesMap = initialNotesArray.reduce(
  (map, note) => {
    map[note.id] = note;
    return map;
  },
  {} as NotesMap
);

// --- Storage Migration Helper ---
function loadWithMigration<T>(
  key: string,
  currentInitialValue: T,
  migrate: (oldData: any) => T | null
): T {
  if (typeof window === 'undefined') {
    return currentInitialValue;
  }
  
  const raw = localStorage.getItem(key);
  if (!raw) {
    console.log(`No existing data found for key "${key}", using initial value.`);
    return currentInitialValue;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && key === 'galaxy-notes-map') {
      console.log(`Migrating data for key "${key}" from array to map format.`);
      const migrated = migrate(parsed);
      if (migrated) {
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      } else {
        console.warn(`Migration failed for key "${key}", falling back to initial value.`);
        return currentInitialValue;
      }
    } else if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
       console.log(`Existing map data found for key "${key}".`);
       return parsed as T;
    } else {
        console.warn(`Unexpected data format found for key "${key}", using initial value.`);
        return currentInitialValue;
    }
  } catch (error) {
    console.error(`Error parsing or migrating data for key "${key}":`, error, `Falling back to initial value.`);
    return currentInitialValue;
  }
}

// --- Core Atoms ---

// For backward compatibility - export notesAtom that maps to allNotesAtom
export const clustersAtom = atomWithStorage<Cluster[]>('galaxy-notes-clusters', [initialCluster]);
export const activeClusterIdAtom = atom<ClusterId | null>(initialCluster.id);

// Normalized Notes Map Atom
export const notesMapAtom = atomWithImmer(
  loadWithMigration<NotesMap>(
    'galaxy-notes-map',
    initialNotesMap,
    (oldData: any): NotesMap | null => {
      if (Array.isArray(oldData)) {
        return oldData.reduce((map, note) => {
          if (note && note.id) {
             map[note.id as NoteId] = note as Note;
          }
          return map;
        }, {} as NotesMap);
      }
      console.warn("Migration attempted on non-array data, skipping migration.");
      return null;
    }
  )
);

// Export for backward compatibility
export const notesAtom = atom(
  (get) => Object.values(get(notesMapAtom))
);

// Active Note ID Atom
export const activeNoteIdAtom = atom<NoteId | null>(initialNotesArray[1]?.id ?? null);

// --- Atom Families and Derived Atoms ---

// Note Atom Family
export const noteAtom = atomFamily((id: NoteId | null) =>
  atom(
    (get): Note | null => {
      if (!id) return null;
      return get(notesMapAtom)[id] ?? null;
    },
    (get, set, partial: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      if (!id) return;
      const currentNote = get(notesMapAtom)[id];
      if (!currentNote) return;

      const now = getCurrentDate();
      set(notesMapAtom, (draft) => {
        const noteToUpdate = draft[id];
        if (noteToUpdate) {
            Object.assign(noteToUpdate, partial);
            noteToUpdate.updatedAt = now;
        }
      });
    }
  )
);

// Active Note Atom
export const activeNoteAtom = atom(
  (get) => {
    const activeId = get(activeNoteIdAtom);
    return get(noteAtom(activeId));
  },
  (get, set, updatedNote: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    const activeId = get(activeNoteIdAtom);
    if (activeId) {
      set(noteAtom(activeId), updatedNote);
    }
  }
);

// --- For backward compatibility with old function-based API ---

// Create Note function (for backward compatibility)
export function createNote(parentId: NoteId | null = null, clusterId: ClusterId | null = null, title = 'Untitled Note') {
  const now = getCurrentDate();
  const id = generateNoteId();
  
  const note: Note = {
    id,
    title,
    content: [createParagraphBlock('', `initial-block-${id}`)],
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'note',
    clusterId
  };
  
  return { id, note };
}

// Create Folder function (for backward compatibility)
export function createFolder(parentId: NoteId | null = null, clusterId: ClusterId | null = null, title = 'New Folder') {
  const now = getCurrentDate();
  const id = generateNoteId();
  
  const note: Note = {
    id,
    title,
    content: [],
    createdAt: now,
    updatedAt: now,
    parentId,
    type: 'folder',
    clusterId
  };
  
  return { id, note };
}

// Create Cluster function (for backward compatibility)
export function createCluster(title: string) {
  const id = generateClusterId();
  const now = getCurrentDate();
  
  const cluster: Cluster = {
    id,
    title,
    createdAt: now,
    updatedAt: now
  };
  
  return { id, cluster };
}

// Delete Note function (for backward compatibility)
export function deleteNote(notes: Note[], id: NoteId): Note[] {
  const noteToDelete = notes.find(note => note.id === id);
  if (!noteToDelete) return notes;
  
  let idsToDelete = [id];
  
  if (noteToDelete.type === 'folder') {
    const getAllChildIds = (parentId: NoteId): NoteId[] => {
      const directChildren = notes.filter(note => note.parentId === parentId);
      const childIds = directChildren.map(child => child.id);
      
      const folderChildren = directChildren.filter(child => child.type === 'folder');
      const grandChildIds = folderChildren.flatMap(folder => getAllChildIds(folder.id));
      
      return [...childIds, ...grandChildIds];
    };
    
    idsToDelete = [...idsToDelete, ...getAllChildIds(id)];
  }
  
  return notes.filter(note => !idsToDelete.includes(note.id));
}

// --- Write-Only Atoms for CRUD Operations ---

export const createNoteAtom = atom(
  null, 
  (_get, set, args: { parentId?: NoteId | null, clusterId?: ClusterId | null, title?: string, content?: Block[] }) => {
    const { parentId = null, clusterId = null, title = 'Untitled Note', content = [] } = args;
    const { id, note } = createNote(parentId, clusterId, title);
    if (content.length > 0) {
      note.content = content;
    }

    set(notesMapAtom, (draft) => {
      draft[id] = note;
    });
    
    set(activeNoteIdAtom, id);
    return id;
  }
);

export const createFolderAtom = atom(
  null,
  (_get, set, args: { parentId?: NoteId | null, clusterId?: ClusterId | null, title?: string }) => {
    const { parentId = null, clusterId = null, title = 'New Folder' } = args;
    const { id, note } = createFolder(parentId, clusterId, title);

    set(notesMapAtom, (draft) => {
      draft[id] = note;
    });
    
    return id;
  }
);

export const deleteNoteAtom = atom(
  null,
  (get, set, args: { id: NoteId }) => {
    const { id } = args;
    const notesMap = get(notesMapAtom);
    const noteToDelete = notesMap[id];
    if (!noteToDelete) return;

    const activeId = get(activeNoteIdAtom);
    let idsToDelete: NoteId[] = [id];

    if (noteToDelete.type === 'folder') {
      const childrenIds = getAllChildrenIds(notesMap, id);
      idsToDelete = [...idsToDelete, ...childrenIds];
    }

    set(notesMapAtom, (draft) => {
      idsToDelete.forEach((noteId) => {
        delete draft[noteId];
      });
    });

    if (activeId && idsToDelete.includes(activeId)) {
      set(activeNoteIdAtom, null);
    }
  }
);

export const createClusterAtom = atom(
  null,
  (_get, set, args: { title: string }) => {
    const { title } = args;
    const newClusterId = generateClusterId();
    const now = getCurrentDate();

    const newCluster: Cluster = {
      id: newClusterId,
      title,
      createdAt: now,
      updatedAt: now,
    };

    const rootFolderId = generateNoteId();
    const rootFolder: Note = {
      id: rootFolderId,
      title: `${title} Root`,
      content: [],
      createdAt: now,
      updatedAt: now,
      parentId: null,
      type: 'folder',
      clusterId: newClusterId
    };

    set(clustersAtom, (prevClusters) => [...prevClusters, newCluster]);

    set(notesMapAtom, (draft) => {
      draft[rootFolderId] = rootFolder;
    });

    set(activeClusterIdAtom, newClusterId);
    set(activeNoteIdAtom, null);

    return newClusterId;
  }
);

// Helper function - Adapted for map input
const getAllChildrenIds = (notesMap: NotesMap, folderId: NoteId): NoteId[] => {
  const directChildren = Object.values(notesMap).filter(note => note.parentId === folderId);
  const childrenIds = directChildren.map(child => child.id);

  const folderChildren = directChildren.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => getAllChildrenIds(notesMap, folder.id));

  return [...childrenIds, ...grandChildrenIds];
};

// --- Derived Selectors ---

export const allNotesAtom = atom((get) => Object.values(get(notesMapAtom)));

export const notesByClusterIdAtom = atomFamily((clusterId: ClusterId | null) =>
  atom((get) => {
    if (clusterId === null) return [];
    const notesMap = get(notesMapAtom);
    return Object.values(notesMap).filter(note => note.clusterId === clusterId);
  })
);

export const rootNotesInClusterAtom = atomFamily((clusterId: ClusterId | null) =>
  atom((get) => {
    if (clusterId === null) return [];
    const notesInCluster = get(notesByClusterIdAtom(clusterId));
    return notesInCluster.filter(note => note.parentId === null);
  })
);

export interface TreeNode extends Note {
  children: TreeNode[];
}

export const notesTreeByClusterAtom = atomFamily((clusterId: ClusterId | null) =>
  atom((get): TreeNode[] => {
    if (clusterId === null) return [];
    const notesInCluster = get(notesByClusterIdAtom(clusterId));
    const notesMap = notesInCluster.reduce((map, note) => {
        map[note.id] = note;
        return map;
    }, {} as Record<NoteId, Note>);

    const byParent: Record<string, Note[]> = {};

    notesInCluster.forEach((n) => {
        const pKey = n.parentId === null ? 'root' : n.parentId;
        if (pKey === 'root' || notesMap[n.parentId as NoteId]) {
            (byParent[pKey] ||= []).push(n);
        } else {
            (byParent['root'] ||= []).push(n);
            console.warn(`Note ${n.id} has parent ${n.parentId} outside of cluster ${clusterId} or parent missing. Treating as root.`);
        }
    });

    function buildTree(parentId: NoteId | null): TreeNode[] {
        const parentKey = parentId === null ? 'root' : parentId;
        const children = byParent[parentKey] || [];

        children.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.title.localeCompare(b.title);
        });

        return children.map((note): TreeNode => ({
            ...note,
            children: buildTree(note.id),
        }));
    }

    return buildTree(null);
  })
);

export const notesByTagAtom = atomFamily((tag: string) =>
  atom((get) => {
    if (!tag) return [];
    const notesMap = get(notesMapAtom);
    return Object.values(notesMap).filter(n => n.tags?.includes(tag));
  })
);

export const graphInitializedAtom = atom<boolean>(false);
export const graphLayoutAtom = atom<string>('dagre');
