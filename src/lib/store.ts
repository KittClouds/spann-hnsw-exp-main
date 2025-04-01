import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PartialBlock } from '@blocknote/core';
import { KnowledgeGraph } from './knowledgeGraph';

export interface Note {
  id: string;
  title: string;
  content: PartialBlock[];
  createdAt: string;
  updatedAt: string;
  path: string; // e.g., "/Personal/Journal" or "/" for root
  tags: string[]; // Array of tag identifiers
}

export interface Folder {
  id: string;
  name: string;
  path: string; // Full path to this folder
  parentId: string | null; // null for root folders
  createdAt: string;
  updatedAt: string;
}

const getCurrentDate = () => new Date().toISOString();

const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const generateFolderId = () => `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const rootFolder: Folder = {
  id: 'root',
  name: 'Root',
  path: '/',
  parentId: null,
  createdAt: getCurrentDate(),
  updatedAt: getCurrentDate()
};

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
    tags: []
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
    tags: []
  },
];

const initialFolders: Folder[] = [rootFolder];

export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

export const foldersAtom = atomWithStorage<Folder[]>('galaxy-folders', initialFolders);

export const activeNoteIdAtom = atom<string | null>(initialNotes[0].id);

export const currentFolderPathAtom = atom<string>('/');

const graphSourceDataAtom = atom((get) => ({
  notes: get(notesAtom),
  folders: get(foldersAtom)
}));

const baseKnowledgeGraphAtom = atom<KnowledgeGraph>(new KnowledgeGraph());

export const knowledgeGraphAtom = atom<KnowledgeGraph>(
  (get) => {
    return get(baseKnowledgeGraphAtom);
  }
);

export const syncKnowledgeGraphAtom = atom(
  (get) => get(baseKnowledgeGraphAtom),
  (get, set) => {
    const graphInstance = get(baseKnowledgeGraphAtom);
    const { notes, folders } = get(graphSourceDataAtom);
    
    graphInstance.buildGraph(notes, folders);
    
    set(knowledgeGraphAtom, graphInstance);
  }
);

export const currentFolderNotesAtom = atom(
  (get) => {
    const notes = get(notesAtom);
    const currentPath = get(currentFolderPathAtom);
    
    return notes.filter(note => note.path === currentPath);
  }
);

export const currentFolderChildrenAtom = atom(
  (get) => {
    const folders = get(foldersAtom);
    const currentPath = get(currentFolderPathAtom);
    
    if (currentPath === '/') {
      return folders.filter(folder => folder.parentId === null && folder.id !== 'root');
    }
    
    const currentFolder = folders.find(folder => folder.path === currentPath);
    
    if (!currentFolder) return [];
    
    return folders.filter(folder => folder.parentId === currentFolder.id);
  }
);

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
    
    set(syncKnowledgeGraphAtom);
  }
);

export const createNote = (folderPath: string = '/') => {
  const newId = generateId();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [{ type: 'paragraph', content: '' }],
    createdAt: now,
    updatedAt: now,
    path: folderPath,
    tags: []
  };
  
  return { id: newId, note: newNote };
};

export const createFolder = (name: string, parentPath: string = '/', parentId: string | null = null) => {
  const newId = generateFolderId();
  const now = getCurrentDate();
  
  const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
  
  const newFolder: Folder = {
    id: newId,
    name,
    path,
    parentId,
    createdAt: now,
    updatedAt: now
  };
  
  return { id: newId, folder: newFolder };
};

export const deleteNote = (notes: Note[], id: string): Note[] => {
  return notes.filter(note => note.id !== id);
};

export const deleteFolder = (folders: Folder[], id: string): Folder[] => {
  return folders.filter(folder => folder.id !== id);
};

export const getPathParts = (path: string): string[] => {
  if (path === '/') return ['/'];
  return ['/', ...path.split('/').filter(Boolean)];
};

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

export const moveNote = (notes: Note[], noteId: string, targetFolderPath: string): Note[] => {
  return notes.map(note => 
    note.id === noteId 
      ? { ...note, path: targetFolderPath, updatedAt: getCurrentDate() } 
      : note
  );
};

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
  pathParts.pop();
  
  const parentPath = pathParts.length ? `/${pathParts.join('/')}` : '/';
  const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
  
  const updatedFolders = folders.map(f => {
    if (f.id === folderId) {
      return { ...f, name: newName, path: newPath, updatedAt: getCurrentDate() };
    }
    
    if (f.path.startsWith(oldPath + '/')) {
      const restOfPath = f.path.slice(oldPath.length);
      return { ...f, path: newPath + restOfPath, updatedAt: getCurrentDate() };
    }
    
    return f;
  });
  
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
