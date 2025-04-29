import { atom } from 'jotai';
import { atomWithStorage, atomFamily, atomWithImmer } from 'jotai/utils';
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
  content: Block[]; // Keep content as Block[]
  createdAt: string;
  updatedAt: string;
  parentId: NoteId | null;
  type: 'note' | 'folder';
  clusterId: ClusterId | null;
  path?: string; // Retained from original
  tags?: string[]; // Retained from original
  mentions?: string[]; // Retained from original
  concepts?: Array<{ type: string, name: string }>; // Retained from original
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

const initialNotesArray: Note[] = [ // Keep array temporarily for map creation
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
    id: 'note-welcome' as NoteId, // Use a stable ID for the initial welcome note
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
    id: 'note-how-to' as NoteId, // Use a stable ID for the initial how-to note
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

// Convert initial array to map (Step 1)
const initialNotesMap: NotesMap = initialNotesArray.reduce(
  (map, note) => {
    map[note.id] = note;
    return map;
  },
  {} as NotesMap
);

// --- Storage Migration Helper (Step 5) ---
function loadWithMigration<T>(
  key: string,
  currentInitialValue: T,
  migrate: (oldData: any) => T | null // Allow returning null if migration fails/not possible
): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    console.log(`No existing data found for key "${key}", using initial value.`);
    return currentInitialValue;
  }
  try {
    const parsed = JSON.parse(raw);
    // Basic version check or structure check
    if (Array.isArray(parsed) && key === 'galaxy-notes-map') { // Check if it's the old array format
      console.log(`Migrating data for key "${key}" from array to map format.`);
      const migrated = migrate(parsed);
      if (migrated) {
        // Optionally, save the migrated data back immediately
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      } else {
        console.warn(`Migration failed for key "${key}", falling back to initial value.`);
        return currentInitialValue; // Fallback if migration returns null
      }
    } else if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
       // Assume it's already in the new map format or doesn't need migration
       // Add more sophisticated version checks if needed later
       console.log(`Existing map data found for key "${key}".`);
       // You might want to merge initial state with existing state here
       // For simplicity, we just return the parsed data if it seems like a map
       // Ensure all expected fields exist by merging? Or trust the stored data? Let's trust for now.
       return parsed as T;
    } else {
        console.warn(`Unexpected data format found for key "${key}", using initial value.`);
        return currentInitialValue; // Fallback for unexpected format
    }
  } catch (error) {
    console.error(`Error parsing or migrating data for key "${key}":`, error, `Falling back to initial value.`);
    // Optionally clear the corrupted data: localStorage.removeItem(key);
    return currentInitialValue;
  }
}

// --- Core Atoms ---

// Clusters Atom (remains similar, could normalize too if needed)
export const clustersAtom = atomWithStorage<Cluster[]>('galaxy-notes-clusters', [initialCluster]);

// Active Cluster ID Atom (Unchanged)
export const activeClusterIdAtom = atom<ClusterId | null>(initialCluster.id); // Allow null if no cluster is active

// Normalized Notes Map Atom (Step 1, 3, 5)
export const notesMapAtom = atomWithImmer( // Use Immer for easier updates (Step 3)
  loadWithMigration<NotesMap>(
    'galaxy-notes-map',
    initialNotesMap,
    (oldData: any): NotesMap | null => {
      // Migration logic: Convert old array format to new map format (Step 5)
      if (Array.isArray(oldData)) {
        return oldData.reduce((map, note) => {
          if (note && note.id) { // Basic validation
             map[note.id as NoteId] = note as Note;
          }
          return map;
        }, {} as NotesMap);
      }
      // If data is not an array, assume it's already a map or incompatible
      // Returning null triggers fallback to initialNotesMap
      console.warn("Migration attempted on non-array data, skipping migration.");
      return null;
    }
  )
);

// Active Note ID Atom (adjust initial value)
export const activeNoteIdAtom = atom<NoteId | null>(initialNotesArray[1]?.id ?? null); // Use stable ID or null

// --- Atom Families and Derived Atoms ---

// Note Atom Family (Step 1)
export const noteAtom = atomFamily((id: NoteId | null) => // Allow null id
  atom(
    (get): Note | null => {
      if (!id) return null;
      return get(notesMapAtom)[id] ?? null; // Return null if not found
    },
    (get, set, partial: Partial<Omit<Note, 'id' | 'createdAt'>>) => { // Update type for partial update
      if (!id) return;
      const currentNote = get(notesMapAtom)[id];
      if (!currentNote) return; // Don't update if note doesn't exist

      const now = getCurrentDate();
      set(notesMapAtom, (draft) => {
        // Immer allows direct mutation
        const noteToUpdate = draft[id];
        if (noteToUpdate) {
            Object.assign(noteToUpdate, partial); // Apply partial updates
            noteToUpdate.updatedAt = now;         // Update timestamp
        }
      });
    }
  )
);

// Active Note Atom (Simplified using atomFamily)
export const activeNoteAtom = atom(
  (get) => {
    const activeId = get(activeNoteIdAtom);
    return get(noteAtom(activeId)); // Directly use the atomFamily instance
  },
  (get, set, updatedNote: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    const activeId = get(activeNoteIdAtom);
    if (activeId) {
      set(noteAtom(activeId), updatedNote); // Delegate update to the atomFamily instance
    }
  }
);

// --- Write-Only Atoms for CRUD Operations (Step 2) ---

export const createNoteAtom = atom<null, { parentId?: NoteId | null, clusterId?: ClusterId | null, title?: string, content?: Block[] }, NoteId>(
  null, // Read function is null for write-only atom
  (_get, set, { parentId = null, clusterId = null, title = 'Untitled Note', content = [] }) => {
    const now = getCurrentDate();
    const newId = generateNoteId();
    const newNote: Note = {
      id: newId,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      parentId,
      type: 'note',
      clusterId
    };

    set(notesMapAtom, (draft) => {
      draft[newId] = newNote;
    });
    // Optionally set the new note as active
    set(activeNoteIdAtom, newId);
    return newId; // Return the ID of the created note
  }
);

export const createFolderAtom = atom<null, { parentId?: NoteId | null, clusterId?: ClusterId | null, title?: string }, NoteId>(
  null,
  (_get, set, { parentId = null, clusterId = null, title = 'New Folder' }) => {
    const now = getCurrentDate();
    const newId = generateNoteId();
    const newFolder: Note = {
      id: newId,
      title,
      content: [], // Folders have no content
      createdAt: now,
      updatedAt: now,
      parentId,
      type: 'folder',
      clusterId
    };

    set(notesMapAtom, (draft) => {
      draft[newId] = newFolder;
    });
    // Optionally make the new folder active? Or maybe not.
    // set(activeNoteIdAtom, newId); // Decide if a folder should be "active"
     return newId; // Return the ID of the created folder
  }
);

// Helper function (can be kept internal) - Adapted for map input
const getAllChildrenIds = (notesMap: NotesMap, folderId: NoteId): NoteId[] => {
  const directChildren = Object.values(notesMap).filter(note => note.parentId === folderId);
  const childrenIds = directChildren.map(child => child.id);

  const folderChildren = directChildren.filter(child => child.type === 'folder');
  const grandChildrenIds = folderChildren.flatMap(folder => getAllChildrenIds(notesMap, folder.id));

  return [...childrenIds, ...grandChildrenIds];
};

export const deleteNoteAtom = atom<null, { id: NoteId }, void>(
  null,
  (get, set, { id }) => {
    const notesMap = get(notesMapAtom);
    const noteToDelete = notesMap[id];
    if (!noteToDelete) return; // Note doesn't exist

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

    // If the deleted note (or its folder) was active, deactivate it
    if (activeId && idsToDelete.includes(activeId)) {
      set(activeNoteIdAtom, null);
      // Optionally, find a sibling or parent to activate? More complex UI logic.
    }
  }
);

export const createClusterAtom = atom<null, { title: string }, ClusterId>(
    null,
    (get, set, { title }) => {
        const newClusterId = generateClusterId();
        const now = getCurrentDate();

        const newCluster: Cluster = {
            id: newClusterId,
            title,
            createdAt: now,
            updatedAt: now,
        };

        // Create a default root folder for this cluster
        const rootFolderId = generateNoteId();
        const rootFolder: Note = {
            id: rootFolderId,
            title: `${title} Root`, // Give a more descriptive default title
            content: [],
            createdAt: now,
            updatedAt: now,
            parentId: null, // Root folders have null parent
            type: 'folder',
            clusterId: newClusterId
        };

        // Update clusters atom
        set(clustersAtom, (prevClusters) => [...prevClusters, newCluster]);

        // Update notes map atom
        set(notesMapAtom, (draft) => {
            draft[rootFolderId] = rootFolder;
        });

        // Optionally set the new cluster as active
        set(activeClusterIdAtom, newClusterId);
        // Optionally set the root folder as the active "note"? Or null?
        // set(activeNoteIdAtom, rootFolderId);
        set(activeNoteIdAtom, null); // Probably better to have no note selected initially

        return newClusterId;
    }
);

// --- Derived Selectors (Step 4 & 6) ---

// Get all notes as an array (useful for lists)
export const allNotesAtom = atom((get) => Object.values(get(notesMapAtom)));

// Selector for notes by clusterId (Step 6, replaces getNotesByClusterId)
export const notesByClusterIdAtom = atomFamily((clusterId: ClusterId | null) =>
  atom((get) => {
    if (clusterId === null) return []; // Handle null case explicitly
    const notesMap = get(notesMapAtom);
    return Object.values(notesMap).filter(note => note.clusterId === clusterId);
  })
);

// Selector for root notes by clusterId (Step 6, replaces getRootNotesByClusterId)
export const rootNotesInClusterAtom = atomFamily((clusterId: ClusterId | null) =>
  atom((get) => {
    if (clusterId === null) return [];
    const notesInCluster = get(notesByClusterIdAtom(clusterId));
    return notesInCluster.filter(note => note.parentId === null);
  })
);

// Derived Tree Structure (Step 4)
// Note: This builds a tree for a specific cluster. A global tree might be too large.
export interface TreeNode extends Note {
  children: TreeNode[];
}

export const notesTreeByClusterAtom = atomFamily((clusterId: ClusterId | null) =>
    atom((get): TreeNode[] => {
        if (clusterId === null) return [];
        // Get only notes belonging to the specified cluster
        const notesInCluster = get(notesByClusterIdAtom(clusterId));
        const notesMap = notesInCluster.reduce((map, note) => {
            map[note.id] = note;
            return map;
        }, {} as Record<NoteId, Note>);

        const byParent: Record<string, Note[]> = {}; // Use 'root' key for null parents

        notesInCluster.forEach((n) => {
            const pKey = n.parentId === null ? 'root' : n.parentId;
             // Ensure the parent exists within the same cluster map before adding
            if (pKey === 'root' || notesMap[n.parentId as NoteId]) {
                 (byParent[pKey] ||= []).push(n);
            } else {
                // This note's parent is outside the current cluster or doesn't exist.
                // Treat it as a root node for this cluster's tree view.
                (byParent['root'] ||= []).push(n);
                console.warn(`Note ${n.id} has parent ${n.parentId} outside of cluster ${clusterId} or parent missing. Treating as root.`);
            }
        });

        // Recursive function to build the tree structure
        function buildTree(parentId: NoteId | null): TreeNode[] {
            const parentKey = parentId === null ? 'root' : parentId;
            const children = byParent[parentKey] || [];

            // Sort children (e.g., folders first, then by title or date) - Optional
            children.sort((a, b) => {
                 if (a.type === 'folder' && b.type !== 'folder') return -1;
                 if (a.type !== 'folder' && b.type === 'folder') return 1;
                 return a.title.localeCompare(b.title); // Then sort by title
            });


            return children.map((note): TreeNode => ({
                ...note,
                children: buildTree(note.id), // Recursively build children
            }));
        }

        return buildTree(null); // Start building from the root (null parentId)
    })
);


// Selector for notes by tag (Example from Step 6)
export const notesByTagAtom = atomFamily((tag: string) =>
  atom((get) => {
    if (!tag) return []; // Handle empty tag case
    const notesMap = get(notesMapAtom);
    return Object.values(notesMap).filter(n => n.tags?.includes(tag));
  })
);


// --- Miscellaneous Atoms (Unchanged) ---
export const graphInitializedAtom = atom<boolean>(false);
export const graphLayoutAtom = atom<string>('dagre');


// --- Cleanup: Remove old exported functions ---
// The functionalities of createNote, createFolder, deleteNote,
// getNotesByClusterId, getRootNotesByClusterId are now handled
// by the write-only atoms and derived selector atoms above.
// They should no longer be exported or used directly.
