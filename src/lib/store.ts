
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Block, PartialBlock } from '@blocknote/core';

export interface Note {
  id: string;
  title: string;
  content: PartialBlock[];
  createdAt: string;
  updatedAt: string;
}

// Helper function to get current date in ISO format
const getCurrentDate = () => new Date().toISOString();

// Generate a unique ID with a specific pattern
const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create initial notes with proper structure
const initialNotes: Note[] = [
  { 
    id: generateId(), 
    title: 'Welcome Note', 
    content: [{ 
      type: 'paragraph', 
      content: [{ type: 'text', text: 'Welcome to Galaxy Notes! Start typing here...', styles: {} }] 
    }], 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate() 
  },
  { 
    id: generateId(), 
    title: 'Getting Started', 
    content: [{ 
      type: 'paragraph', 
      content: [{ type: 'text', text: 'Click on a note title to edit it. Create new notes with the + button.', styles: {} }] 
    }], 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate() 
  },
];

// Main notes atom with localStorage persistence
export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

// Active note ID atom
export const activeNoteIdAtom = atom<string | null>(initialNotes[0].id);

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

// Create a new note and return its ID
export const createNote = () => {
  const newId = generateId();
  const now = getCurrentDate();
  
  const newNote: Note = {
    id: newId,
    title: 'Untitled Note',
    content: [{ 
      type: 'paragraph', 
      content: [{ type: 'text', text: '', styles: {} }] 
    }],
    createdAt: now,
    updatedAt: now
  };
  
  return { id: newId, note: newNote };
};

// Delete a note by ID
export const deleteNote = (notes: Note[], id: string): Note[] => {
  return notes.filter(note => note.id !== id);
};
