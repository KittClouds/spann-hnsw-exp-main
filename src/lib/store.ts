
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get current date in ISO format
const getCurrentDate = () => new Date().toISOString();

// Initial notes with better formatting and timestamps
const initialNotes: Note[] = [
  { 
    id: 1, 
    title: 'Untitled Note', 
    content: 'Welcome to Galaxy Notes! Start typing here...', 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate() 
  },
  { 
    id: 2, 
    title: 'Untitled Note', 
    content: 'This is your second note. You can edit the title by clicking on it.', 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate() 
  },
];

// Main notes atom with localStorage persistence
export const notesAtom = atomWithStorage<Note[]>('galaxy-notes', initialNotes);

// Active note ID atom
export const activeNoteIdAtom = atom<number>(1);

// Derived atom for the currently active note
export const activeNoteAtom = atom(
  (get) => {
    const notes = get(notesAtom);
    const activeId = get(activeNoteIdAtom);
    return notes.find((note) => note.id === activeId) || notes[0];
  },
  (get, set, updatedNote: Partial<Note>) => {
    const notes = get(notesAtom);
    const activeId = get(activeNoteIdAtom);
    
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

// Function to create a new note
export const createNote = (set: Function) => {
  set(notesAtom, (prev: Note[]) => {
    const newNote: Note = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate()
    };
    return [...prev, newNote];
  });
  
  // Return the new note's ID so we can set it as active
  return Date.now();
};

// Function to delete a note
export const deleteNote = (set: Function, id: number) => {
  set(notesAtom, (prev: Note[]) => prev.filter(note => note.id !== id));
};
