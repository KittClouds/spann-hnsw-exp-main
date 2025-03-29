
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PartialBlock } from '@blocknote/core';

export interface Note {
  id: number;
  title: string;
  content: PartialBlock[];
  createdAt: string;
  updatedAt: string;
}

// Helper function to get current date in ISO format
const getCurrentDate = () => new Date().toISOString();

// Initial notes with BlockNote format for content
const initialNotes: Note[] = [
  { 
    id: 1, 
    title: 'Untitled Note', 
    content: [{ type: 'paragraph', content: 'Welcome to Galaxy Notes! Start typing here...' }], 
    createdAt: getCurrentDate(), 
    updatedAt: getCurrentDate() 
  },
  { 
    id: 2, 
    title: 'Untitled Note', 
    content: [{ type: 'paragraph', content: 'This is your second note. You can edit the title by clicking on it.' }], 
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
    
    // Make sure we're dealing with an array
    const notesArray = Array.isArray(notes) ? notes : initialNotes;
    
    return notesArray.find((note) => note.id === activeId) || notesArray[0];
  },
  (get, set, updatedNote: Partial<Note>) => {
    const notes = get(notesAtom);
    const activeId = get(activeNoteIdAtom);
    
    // Make sure we're dealing with an array
    const notesArray = Array.isArray(notes) ? notes : initialNotes;
    
    const updatedNotes = notesArray.map((note) => 
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
export const createNote = (setNotesFunction: Function) => {
  setNotesFunction((prev: Note[]) => {
    // Make sure we're dealing with an array
    const notesArray = Array.isArray(prev) ? prev : initialNotes;
    
    const newNote: Note = {
      id: Date.now(),
      title: 'Untitled Note',
      content: [{ type: 'paragraph', content: '' }],
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate()
    };
    return [...notesArray, newNote];
  });
  
  // Return the new note's ID so we can set it as active
  return Date.now();
};

// Function to delete a note
export const deleteNote = (setNotesFunction: Function, id: number) => {
  setNotesFunction((prev: Note[]) => {
    // Make sure we're dealing with an array
    const notesArray = Array.isArray(prev) ? prev : initialNotes;
    return notesArray.filter(note => note.id !== id);
  });
};
