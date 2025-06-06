
import { embeddingService } from './EmbeddingService';
import { hnswService } from './HNSWService';
import { Block } from '@blocknote/core';
import { vecToBlob, blobToVec } from './binaryUtils';
import { tables, events } from '../../livestore/schema';
import { toast } from 'sonner';

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
  private isReady = false;
  private isInitialized = false;

  // Store reference will be injected by the hooks
  private storeRef: any = null;

  async initialize() {
    if (this.isReady) return;
    try {
      await embeddingService.ready();
      await hnswService.initialize();
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

  // Load all embeddings from LiveStore into memory for fallback search
  private loadEmbeddingsFromStore() {
    if (!this.storeRef) {
      console.warn('SemanticSearchService: Cannot load embeddings - no store reference');
      return;
    }

    try {
      // Query all embeddings from the database
      const embeddingRows = this.storeRef.query(tables.embeddings.select());
      
      console.log(`SemanticSearchService: Loading ${embeddingRows?.length || 0} embeddings from LiveStore`);
      
      // Reset embeddings map before loading
      this.embeddings.clear();
      
      // Convert each row back to in-memory format
      if (Array.isArray(embeddingRows)) {
        embeddingRows.forEach((row: any) => {
          try {
            if (!row || !row.vecData) {
              console.warn(`Skipping invalid embedding row:`, row);
              return;
            }
            
            const embedding = blobToVec(row.vecData, row.vecDim);
            this.embeddings.set(row.noteId, {
              noteId: row.noteId,
              title: row.title,
              content: row.content,
              embedding
            });
          } catch (error) {
            console.error(`Failed to load embedding for note ${row?.noteId}:`, error);
          }
        });
      }

      console.log(`SemanticSearchService: Loaded ${this.embeddings.size} embeddings into memory`);
    } catch (error) {
      console.error('Failed to load embeddings from LiveStore:', error);
    }
  }

  // This method now triggers LiveStore events and HNSW updates
  async addOrUpdateNote(noteId: string, title: string, content: Block[]) {
    try {
      await this.initialize();
      
      const textContent = blocksToText(content);
      if (!textContent.trim()) {
        // Remove from memory, LiveStore, and HNSW
        this.embeddings.delete(noteId);
        await hnswService.removeNote(noteId);
        if (this.storeRef) {
          this.storeRef.commit(events.embeddingRemoved({ noteId }));
        }
        return;
      }

      const { vector } = await embeddingService.embed([textContent]);
      
      // Apply additional L2 normalization for vector hygiene
      const normalizedVector = l2Normalize(vector);
      
      // Update in-memory cache immediately for fallback search
      this.embeddings.set(noteId, {
        noteId,
        title,
        content: textContent,
        embedding: normalizedVector
      });

      // Add to HNSW index
      await hnswService.addOrUpdateNote(noteId, normalizedVector);

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

  removeNote(noteId: string) {
    try {
      // Remove from memory, LiveStore, and HNSW
      this.embeddings.delete(noteId);
      hnswService.removeNote(noteId);
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
      
      // Try HNSW first (fast path)
      const hnswResults = await hnswService.search(normalizedQueryVector, Math.min(limit * 2, 200));
      
      if (hnswResults.length > 0) {
        console.log(`HNSW returned ${hnswResults.length} candidates`);
        
        // Convert HNSW results to final format
        const results: SearchResult[] = [];
        
        for (const hnswResult of hnswResults) {
          const embedding = this.embeddings.get(hnswResult.noteId);
          if (embedding) {
            results.push({
              noteId: embedding.noteId,
              title: embedding.title,
              content: embedding.content,
              score: hnswResult.score
            });
          }
        }
        
        return results.slice(0, limit);
      }
      
      // Fallback to brute force search if HNSW fails
      console.log('Falling back to brute force search');
      const results: SearchResult[] = [];
      
      for (const [noteId, embedding] of this.embeddings) {
        const similarity = this.cosineSimilarity(normalizedQueryVector, embedding.embedding);
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
      toast.error('Search failed');
      return [];
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    try {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      
      if (normA === 0 || normB === 0) return 0;
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }

  async syncAllNotes(notes: Array<{ id: string; title: string; content: Block[] }>) {
    try {
      await this.initialize();
      
      console.log(`SemanticSearchService: Syncing ${notes.length} notes`);
      
      // Clear in-memory cache
      this.embeddings.clear();
      
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
      
      // Persist HNSW index after bulk operations
      await hnswService.persist();
      
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

  // Get HNSW stats for debugging
  getHNSWStats() {
    return hnswService.getStats();
  }

  // Manual persistence trigger
  async persistIndex() {
    await hnswService.persist();
  }
}

export const semanticSearchService = new SemanticSearchService();
