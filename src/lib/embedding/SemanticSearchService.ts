
import { embeddingService } from './EmbeddingService';
import { Block } from '@blocknote/core';
import { vecToBlob, blobToVec } from './binaryUtils';

interface NoteEmbedding {
  noteId: string;
  title: string;
  content: string;
  embedding: Float32Array;
}

interface SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

// Helper to convert BlockNote content to plain text
function blocksToText(blocks: Block[] | undefined): string {
  if (!blocks) return '';
  
  return blocks.map(block => {
    if (!block.content) return '';
    
    // Handle different content types safely
    if (Array.isArray(block.content)) {
      return block.content.map(inline => {
        if (typeof inline === 'object' && inline !== null && 'type' in inline && inline.type === 'text') {
          return (inline as any).text || '';
        }
        return '';
      }).join('');
    }
    
    // Handle non-array content (like tables)
    return '';
  }).join('\n');
}

class SemanticSearchService {
  private embeddings = new Map<string, NoteEmbedding>();
  private isReady = false;
  private isInitialized = false;

  // Store reference will be injected by the hooks
  private storeRef: any = null;

  async initialize() {
    if (this.isReady) return;
    await embeddingService.ready();
    this.isReady = true;
    console.log('SemanticSearchService initialized');
  }

  // Method to inject store reference from React hooks
  setStore(store: any) {
    this.storeRef = store;
    if (!this.isInitialized && store) {
      this.loadEmbeddingsFromStore();
      this.isInitialized = true;
    }
  }

  // Load all embeddings from LiveStore into memory for fast search
  private loadEmbeddingsFromStore() {
    if (!this.storeRef) return;

    try {
      // Import tables from schema
      const { tables } = require('../../livestore/schema');
      
      // Query all embeddings from the database
      const embeddingRows = this.storeRef.query(tables.embeddings.select());
      
      console.log(`SemanticSearchService: Loading ${embeddingRows.length} embeddings from LiveStore`);
      
      // Convert each row back to in-memory format
      embeddingRows.forEach((row: any) => {
        try {
          const embedding = blobToVec(row.vecData, row.vecDim);
          this.embeddings.set(row.noteId, {
            noteId: row.noteId,
            title: row.title,
            content: row.content,
            embedding
          });
        } catch (error) {
          console.error(`Failed to load embedding for note ${row.noteId}:`, error);
        }
      });

      console.log(`SemanticSearchService: Loaded ${this.embeddings.size} embeddings into memory`);
    } catch (error) {
      console.error('Failed to load embeddings from LiveStore:', error);
    }
  }

  // This method now triggers LiveStore events instead of direct storage
  async addOrUpdateNote(noteId: string, title: string, content: Block[]) {
    await this.initialize();
    
    const textContent = blocksToText(content);
    if (!textContent.trim()) {
      // Remove from both memory and LiveStore
      this.embeddings.delete(noteId);
      if (this.storeRef) {
        const { events } = require('../../livestore/schema');
        this.storeRef.commit(events.embeddingRemoved({ noteId }));
      }
      return;
    }

    try {
      const { vector } = await embeddingService.embed([textContent]);
      
      // Update in-memory cache immediately for fast search
      this.embeddings.set(noteId, {
        noteId,
        title,
        content: textContent,
        embedding: vector
      });

      // Persist to LiveStore (will also sync across devices)
      if (this.storeRef) {
        const { events } = require('../../livestore/schema');
        this.storeRef.commit(events.noteEmbedded({
          noteId,
          title,
          content: textContent,
          vecData: vecToBlob(vector),
          vecDim: vector.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Failed to embed note:', error);
      throw error;
    }
  }

  removeNote(noteId: string) {
    // Remove from both memory and LiveStore
    this.embeddings.delete(noteId);
    if (this.storeRef) {
      const { events } = require('../../livestore/schema');
      this.storeRef.commit(events.embeddingRemoved({ noteId }));
    }
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    await this.initialize();
    
    if (!query.trim() || this.embeddings.size === 0) {
      return [];
    }

    try {
      const { vector: queryVector } = await embeddingService.embed([`search_query: ${query}`]);
      
      const results: SearchResult[] = [];
      
      for (const [noteId, embedding] of this.embeddings) {
        const similarity = this.cosineSimilarity(queryVector, embedding.embedding);
        results.push({
          noteId: embedding.noteId,
          title: embedding.title,
          content: embedding.content,
          score: similarity
        });
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async syncAllNotes(notes: Array<{ id: string; title: string; content: Block[] }>) {
    await this.initialize();
    
    console.log(`SemanticSearchService: Syncing ${notes.length} notes`);
    
    // Clear in-memory cache
    this.embeddings.clear();
    
    // Process each note and generate embeddings
    for (const note of notes) {
      await this.addOrUpdateNote(note.id, note.title, note.content);
    }
    
    console.log(`SemanticSearchService: Sync complete, ${this.embeddings.size} embeddings created`);
  }

  getEmbeddingCount(): number {
    return this.embeddings.size;
  }

  // Get stored embedding count from LiveStore (useful for UI display)
  getStoredEmbeddingCount(): number {
    if (!this.storeRef) return 0;
    
    try {
      const { tables } = require('../../livestore/schema');
      const countResult = this.storeRef.query(tables.embeddings.count());
      return countResult || 0;
    } catch (error) {
      console.error('Failed to get stored embedding count:', error);
      return 0;
    }
  }
}

export const semanticSearchService = new SemanticSearchService();
