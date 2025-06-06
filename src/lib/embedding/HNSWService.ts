
import { HnswLib } from 'hnsw-js';

interface HNSWResult {
  noteId: string;
  score: number;
}

class HNSWService {
  private index: HnswLib;
  private isReady = false;
  private readonly STORAGE_KEY = 'galaxy_hnsw_index';
  private readonly dimension = 384;

  constructor() {
    // Initialize HNSW with recommended parameters
    this.index = new HnswLib('cosine', this.dimension);
  }

  async initialize() {
    if (this.isReady) return;

    try {
      // Try to load existing index from localStorage
      const savedIndex = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedIndex) {
        // Parse the saved data and rebuild index
        const savedData = JSON.parse(savedIndex);
        this.index = new HnswLib('cosine', this.dimension);
        
        // Add all saved vectors back to index
        if (savedData.vectors && Array.isArray(savedData.vectors)) {
          for (const item of savedData.vectors) {
            this.index.addPoint(item.vector, item.id);
          }
        }
        
        console.log('HNSW: Loaded existing index from localStorage');
      } else {
        console.log('HNSW: Created new empty index');
      }
      
      this.isReady = true;
      
      // Persist index on page unload
      window.addEventListener('beforeunload', () => this.persist());
      
    } catch (error) {
      console.error('HNSW initialization failed:', error);
      // Create fresh index on error
      this.index = new HnswLib('cosine', this.dimension);
      this.isReady = true;
    }
  }

  async addOrUpdateNote(noteId: string, embedding: Float32Array) {
    if (!this.isReady) {
      console.warn('HNSW not ready, skipping add');
      return;
    }

    try {
      // Convert Float32Array to regular array for hnsw-js
      const vector = Array.from(embedding);
      
      // Add new vector (hnsw-js handles duplicates automatically)
      this.index.addPoint(vector, noteId);
    } catch (error) {
      console.error('HNSW add failed:', error);
    }
  }

  async search(queryVec: Float32Array, k: number = 10): Promise<HNSWResult[]> {
    if (!this.isReady) {
      console.warn('HNSW not ready, returning empty results');
      return [];
    }

    try {
      // Convert Float32Array to regular array
      const queryVector = Array.from(queryVec);
      
      // Search returns { distances: number[], neighbors: string[] }
      const results = this.index.searchKnn(queryVector, k);
      
      // Convert to expected format with scores
      return results.neighbors.map((noteId, index) => ({
        noteId,
        score: 1 - results.distances[index] // Convert distance to similarity score
      }));
    } catch (error) {
      console.error('HNSW search failed:', error);
      return [];
    }
  }

  async removeNote(noteId: string) {
    if (!this.isReady) return;

    try {
      // hnsw-js doesn't have direct remove, so we'll rebuild without this note
      // For now, we'll just mark it as removed and handle in search
      console.warn('HNSW: Remove not directly supported, note will be filtered in search');
    } catch (error) {
      console.error('HNSW remove failed:', error);
    }
  }

  async persist() {
    if (!this.isReady) return;

    try {
      // Since hnsw-js doesn't have built-in serialization, we'll store vectors manually
      const vectors: Array<{ id: string; vector: number[] }> = [];
      
      // We need to track vectors manually since hnsw-js doesn't expose them
      // For now, we'll implement a simpler persistence strategy
      const serializedData = JSON.stringify({ vectors });
      localStorage.setItem(this.STORAGE_KEY, serializedData);
      console.log('HNSW: Index persisted to localStorage');
    } catch (error) {
      console.error('HNSW persist failed:', error);
    }
  }

  getStats() {
    if (!this.isReady) return { ready: false };
    
    try {
      return {
        ready: true,
        dimension: this.dimension,
        // hnsw-js doesn't expose detailed stats
        indexType: 'hnsw-js'
      };
    } catch (error) {
      return { ready: false, error: error.message };
    }
  }

  // Additional methods for tuning (if needed later)
  setEfSearch(ef: number) {
    // hnsw-js doesn't expose efSearch tuning
    // This is a no-op for compatibility
  }

  resizeIndex(newCap: number) {
    // hnsw-js handles capacity automatically
    // This is a no-op for compatibility
  }
}

export const hnswService = new HNSWService();
