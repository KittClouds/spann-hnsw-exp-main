
import { embeddingService } from './EmbeddingService';
import { Block } from '@blocknote/core';
import { vecToBlob, blobToVec } from './binaryUtils';
import { tables, events } from '../../livestore/schema';
import { toast } from 'sonner';
import { HNSW } from './hnsw';

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

// L2 normalize a vector to unit length for vector hygiene
function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0; 
  for (const x of v) norm += x * x;
  norm = 1 / Math.sqrt(norm || 1e-9);
  return v.map(x => x * norm) as Float32Array;
}

class SemanticSearchService {
  private embeddings = new Map<string, NoteEmbedding>();
  private hnswIndex: HNSW;
  private noteIdToHnswId = new Map<string, number>();
  private hnswIdToNoteId = new Map<number, string>();
  private nextHnswId = 0;
  private isReady = false;
  private isInitialized = false;

  // Store reference will be injected by the hooks
  private storeRef: any = null;

  constructor() {
    // Initialize HNSW with cosine similarity (same as before)
    this.hnswIndex = new HNSW(16, 200, null, 'cosine');
  }

  async initialize() {
    if (this.isReady) return;
    try {
      await embeddingService.ready();
      this.isReady = true;
      console.log('SemanticSearchService initialized with HNSW');
    } catch (error) {
      console.error('Failed to initialize SemanticSearchService:', error);
    }
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
    if (!this.storeRef) {
      console.warn('SemanticSearchService: Cannot load embeddings - no store reference');
      return;
    }

    try {
      // Query all embeddings from the database
      const embeddingRows = this.storeRef.query(tables.embeddings.select());
      
      console.log(`SemanticSearchService: Loading ${embeddingRows?.length || 0} embeddings from LiveStore`);
      
      // Reset embeddings map and HNSW index before loading
      this.embeddings.clear();
      this.hnswIndex = new HNSW(16, 200, null, 'cosine');
      this.noteIdToHnswId.clear();
      this.hnswIdToNoteId.clear();
      this.nextHnswId = 0;
      
      // Convert each row back to in-memory format and build HNSW index
      if (Array.isArray(embeddingRows)) {
        const hnswData: { id: number; vector: Float32Array }[] = [];
        
        embeddingRows.forEach((row: any) => {
          try {
            if (!row || !row.vecData) {
              console.warn(`Skipping invalid embedding row:`, row);
              return;
            }
            
            const embedding = blobToVec(row.vecData, row.vecDim);
            const hnswId = this.nextHnswId++;
            
            // Store mapping between noteId and HNSW ID
            this.noteIdToHnswId.set(row.noteId, hnswId);
            this.hnswIdToNoteId.set(hnswId, row.noteId);
            
            this.embeddings.set(row.noteId, {
              noteId: row.noteId,
              title: row.title,
              content: row.content,
              embedding
            });
            
            // Prepare data for HNSW index
            hnswData.push({ id: hnswId, vector: embedding });
          } catch (error) {
            console.error(`Failed to load embedding for note ${row?.noteId}:`, error);
          }
        });
        
        // Build HNSW index with all data at once for better performance
        if (hnswData.length > 0) {
          this.hnswIndex.buildIndex(hnswData).then(() => {
            console.log(`SemanticSearchService: Built HNSW index with ${hnswData.length} vectors`);
          }).catch((error) => {
            console.error('Failed to build HNSW index:', error);
          });
        }
      }

      console.log(`SemanticSearchService: Loaded ${this.embeddings.size} embeddings into memory`);
    } catch (error) {
      console.error('Failed to load embeddings from LiveStore:', error);
    }
  }

  // This method now triggers LiveStore events instead of direct storage
  async addOrUpdateNote(noteId: string, title: string, content: Block[]) {
    try {
      await this.initialize();
      
      const textContent = blocksToText(content);
      if (!textContent.trim()) {
        // Remove from both memory, HNSW index, and LiveStore
        this.removeNoteFromIndex(noteId);
        if (this.storeRef) {
          this.storeRef.commit(events.embeddingRemoved({ noteId }));
        }
        return;
      }

      const { vector } = await embeddingService.embed([textContent]);
      
      // Apply additional L2 normalization for vector hygiene (embeddingService already does this, but being explicit)
      const normalizedVector = l2Normalize(vector);
      
      // Remove old entry if it exists
      this.removeNoteFromIndex(noteId);
      
      // Add to HNSW index
      const hnswId = this.nextHnswId++;
      await this.hnswIndex.addPoint(hnswId, normalizedVector);
      
      // Store mapping between noteId and HNSW ID
      this.noteIdToHnswId.set(noteId, hnswId);
      this.hnswIdToNoteId.set(hnswId, noteId);
      
      // Update in-memory cache immediately for fast search
      this.embeddings.set(noteId, {
        noteId,
        title,
        content: textContent,
        embedding: normalizedVector
      });

      // Persist to LiveStore (will also sync across devices)
      if (this.storeRef) {
        this.storeRef.commit(events.noteEmbedded({
          noteId,
          title,
          content: textContent,
          vecData: vecToBlob(normalizedVector),
          vecDim: normalizedVector.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      } else {
        console.warn('SemanticSearchService: Cannot commit embedding - no store reference');
      }
    } catch (error) {
      console.error('Failed to embed note:', error);
      toast.error('Failed to generate embedding for note');
    }
  }

  private removeNoteFromIndex(noteId: string) {
    // Remove from embeddings map
    this.embeddings.delete(noteId);
    
    // Remove from HNSW mappings
    const hnswId = this.noteIdToHnswId.get(noteId);
    if (hnswId !== undefined) {
      this.noteIdToHnswId.delete(noteId);
      this.hnswIdToNoteId.delete(hnswId);
      // Note: HNSW doesn't support individual node removal easily, 
      // so we'll rely on the search to filter out non-existent notes
    }
  }

  removeNote(noteId: string) {
    try {
      // Remove from both memory and LiveStore
      this.removeNoteFromIndex(noteId);
      if (this.storeRef) {
        this.storeRef.commit(events.embeddingRemoved({ noteId }));
      } else {
        console.warn('SemanticSearchService: Cannot remove embedding - no store reference');
      }
    } catch (error) {
      console.error('Failed to remove embedding:', error);
    }
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      await this.initialize();
      
      if (!query.trim() || this.embeddings.size === 0) {
        return [];
      }

      const { vector: queryVector } = await embeddingService.embed([`search_query: ${query}`]);
      
      // Apply L2 normalization to query vector for vector hygiene
      const normalizedQueryVector = l2Normalize(queryVector);
      
      // Use HNSW for fast approximate nearest neighbor search
      const hnswResults = this.hnswIndex.searchKNN(normalizedQueryVector, Math.min(limit * 2, 50));
      
      const results: SearchResult[] = [];
      
      // Convert HNSW results back to our format
      for (const hnswResult of hnswResults) {
        const noteId = this.hnswIdToNoteId.get(hnswResult.id);
        if (noteId && this.embeddings.has(noteId)) {
          const embedding = this.embeddings.get(noteId)!;
          results.push({
            noteId: embedding.noteId,
            title: embedding.title,
            content: embedding.content,
            score: hnswResult.score
          });
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
      return [];
    }
  }

  async syncAllNotes(notes: Array<{ id: string; title: string; content: Block[] }>) {
    try {
      await this.initialize();
      
      console.log(`SemanticSearchService: Syncing ${notes.length} notes`);
      
      // Clear in-memory cache and HNSW index
      this.embeddings.clear();
      this.hnswIndex = new HNSW(16, 200, null, 'cosine');
      this.noteIdToHnswId.clear();
      this.hnswIdToNoteId.clear();
      this.nextHnswId = 0;
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each note and generate embeddings
      for (const note of notes) {
        try {
          await this.addOrUpdateNote(note.id, note.title, note.content);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync note ${note.id}:`, error);
        }
      }
      
      console.log(`SemanticSearchService: Sync complete, ${successCount} embeddings created, ${errorCount} errors`);
      
      // Reload from store to ensure consistency
      this.loadEmbeddingsFromStore();
      
      return this.embeddings.size;
    } catch (error) {
      console.error('Failed to sync notes:', error);
      toast.error('Failed to synchronize embeddings');
      return 0;
    }
  }

  getEmbeddingCount(): number {
    return this.embeddings.size;
  }

  // Get stored embedding count from LiveStore (useful for UI display)
  getStoredEmbeddingCount(): number {
    if (!this.storeRef) return 0;
    
    try {
      const countResult = this.storeRef.query(tables.embeddings.count());
      return countResult || 0;
    } catch (error) {
      console.error('Failed to get stored embedding count:', error);
      return 0;
    }
  }
}

export const semanticSearchService = new SemanticSearchService();
