
/**
 * BacklinkService - Manages bidirectional backlink relationships between notes
 * 
 * Backlinks use <<title>> syntax and are display-only references that don't create navigation links.
 * This service maintains reactive indexes for fast backlink queries.
 */

import { Note } from '@/lib/store';
import { parseNoteConnectionsFromDocument } from '@/lib/utils/documentParser';

export interface BacklinkReference {
  noteId: string;
  noteTitle: string;
  backlinkTitle: string;
  originalSyntax: string;
}

export class BacklinkService {
  private static instance: BacklinkService;
  
  // Map of note title -> array of notes that reference it with <<title>>
  private backlinkIndex = new Map<string, BacklinkReference[]>();
  
  // Map of note ID -> array of backlink titles that note contains
  private noteBacklinks = new Map<string, string[]>();
  
  // Set of all known note titles for fuzzy matching
  private noteTitles = new Set<string>();
  
  static getInstance(): BacklinkService {
    if (!BacklinkService.instance) {
      BacklinkService.instance = new BacklinkService();
    }
    return BacklinkService.instance;
  }

  /**
   * Update the entire backlink index from a collection of notes
   */
  updateFromNotes(notes: Note[]): void {
    console.log('BacklinkService: Rebuilding backlink index from', notes.length, 'notes');
    
    // Clear existing indexes
    this.backlinkIndex.clear();
    this.noteBacklinks.clear();
    this.noteTitles.clear();
    
    // Build note titles index
    notes.forEach(note => {
      this.noteTitles.add(note.title.toLowerCase());
    });
    
    // Process each note for backlinks
    notes.forEach(note => {
      this.updateNoteBacklinks(note);
    });
    
    console.log('BacklinkService: Index rebuilt with', this.backlinkIndex.size, 'backlink targets');
  }

  /**
   * Update backlinks for a specific note
   */
  updateNoteBacklinks(note: Note): void {
    // Remove existing backlinks for this note
    this.removeNoteFromIndex(note.id);
    
    // Parse backlinks from note content
    const connections = parseNoteConnectionsFromDocument(note.content || []);
    const backlinks = connections.backlinks || [];
    
    // Store backlinks for this note
    this.noteBacklinks.set(note.id, backlinks);
    
    // Add to reverse index
    backlinks.forEach(backlinkTitle => {
      if (!this.backlinkIndex.has(backlinkTitle.toLowerCase())) {
        this.backlinkIndex.set(backlinkTitle.toLowerCase(), []);
      }
      
      this.backlinkIndex.get(backlinkTitle.toLowerCase())!.push({
        noteId: note.id,
        noteTitle: note.title,
        backlinkTitle,
        originalSyntax: `<<${backlinkTitle}>>`
      });
    });
    
    console.log(`BacklinkService: Updated backlinks for note "${note.title}":`, backlinks);
  }

  /**
   * Remove a note from the backlink index
   */
  removeNoteFromIndex(noteId: string): void {
    // Get existing backlinks for this note
    const existingBacklinks = this.noteBacklinks.get(noteId) || [];
    
    // Remove from reverse index
    existingBacklinks.forEach(backlinkTitle => {
      const refs = this.backlinkIndex.get(backlinkTitle.toLowerCase());
      if (refs) {
        const filtered = refs.filter(ref => ref.noteId !== noteId);
        if (filtered.length === 0) {
          this.backlinkIndex.delete(backlinkTitle.toLowerCase());
        } else {
          this.backlinkIndex.set(backlinkTitle.toLowerCase(), filtered);
        }
      }
    });
    
    // Remove from note backlinks
    this.noteBacklinks.delete(noteId);
  }

  /**
   * Get all notes that reference the given title with <<title>>
   */
  getBacklinksTo(noteTitle: string): BacklinkReference[] {
    const normalizedTitle = noteTitle.toLowerCase();
    return this.backlinkIndex.get(normalizedTitle) || [];
  }

  /**
   * Get all backlink titles that a note contains
   */
  getNoteBacklinks(noteId: string): string[] {
    return this.noteBacklinks.get(noteId) || [];
  }

  /**
   * Check if a note contains backlinks to the given title
   */
  hasBacklinkTo(noteId: string, targetTitle: string): boolean {
    const backlinks = this.getNoteBacklinks(noteId);
    return backlinks.some(title => title.toLowerCase() === targetTitle.toLowerCase());
  }

  /**
   * Get statistics about the backlink system
   */
  getStats(): { totalBacklinkTargets: number; totalBacklinkReferences: number; notesWithBacklinks: number } {
    let totalReferences = 0;
    this.backlinkIndex.forEach(refs => {
      totalReferences += refs.length;
    });
    
    return {
      totalBacklinkTargets: this.backlinkIndex.size,
      totalBacklinkReferences: totalReferences,
      notesWithBacklinks: this.noteBacklinks.size
    };
  }

  /**
   * Get all known note titles (for autocomplete/validation)
   */
  getAllNoteTitles(): string[] {
    return Array.from(this.noteTitles);
  }

  /**
   * Find potential backlink matches (fuzzy matching)
   */
  findPotentialMatches(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.noteTitles).filter(title => 
      title.includes(lowerQuery)
    );
  }
}

// Singleton instance
export const backlinkService = BacklinkService.getInstance();
