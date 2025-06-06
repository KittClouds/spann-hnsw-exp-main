
import { HNSW } from '@deepfates/hnsw';

interface HNSWResult {
  noteId: string;
  score: number;
}

class HNSWService {
  private index: HNSW;
  private isReady = false;
  private readonly STORAGE_KEY = 'galaxy_hnsw_index';
  private readonly dimension = 384;

  constructor() {
    // Initialize HNSW with recommended parameters
    this.index = new HNSW({
      dim: this.dimension,
      maxNeighbors: 16,      // M - balance between quality and memory
      efConstruction: 200    // Higher = better quality during build
    });
  }

  async initialize() {
    if (this.isReady) return;

    try {
      // Try to load existing index from localStorage
      const savedIndex = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedIndex) {
        this.index.loadSync(savedIndex);
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
      this.index = new HNSW({
        dim: this.dimension,
        maxNeighbors: 16,
        efConstruction: 200
      });
      this.isReady = true;
    }
  }

  async addOrUpdateNote(noteId: string, embedding: Float32Array) {
    if (!this.isReady) {
      console.warn('HNSW not ready, skipping add');
      return;
    }

    try {
      // Remove existing vector if it exists (TypeScript HNSW handles duplicates)
      try {
        this.index.remove(noteId);
      } catch {
        // Ignore error if noteId doesn't exist
      }
      
      // Add new vector
      this.index.add(noteId, embedding);
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
      // Search returns array of IDs already sorted by similarity
      const resultIds = this.index.search(queryVec, k);
      
      // Convert to expected format with scores
      // Note: TypeScript HNSW doesn't return distances, so we'll compute them
      return resultIds.map((noteId, index) => ({
        noteId,
        score: 1 - (index / resultIds.length) // Simple ranking score
      }));
    } catch (error) {
      console.error('HNSW search failed:', error);
      return [];
    }
  }

  async removeNote(noteId: string) {
    if (!this.isReady) return;

    try {
      this.index.remove(noteId);
    } catch (error) {
      console.error('HNSW remove failed:', error);
    }
  }

  async persist() {
    if (!this.isReady) return;

    try {
      const serialized = this.index.saveSync();
      localStorage.setItem(this.STORAGE_KEY, serialized);
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
        // TypeScript HNSW doesn't expose these stats directly
        // We'll provide basic info
        dimension: this.dimension,
        maxNeighbors: 16
      };
    } catch (error) {
      return { ready: false, error: error.message };
    }
  }

  // Additional methods for tuning (if needed later)
  setEfSearch(ef: number) {
    // TypeScript HNSW doesn't expose efSearch tuning
    // This is a no-op for compatibility
  }

  resizeIndex(newCap: number) {
    // TypeScript HNSW handles capacity automatically
    // This is a no-op for compatibility
  }
}

export const hnswService = new HNSWService();
