
// Simple in-memory HNSW implementation as fallback
// This provides the same interface but uses brute force search

interface HNSWResult {
  noteId: string;
  score: number;
}

interface StoredVector {
  id: string;
  vector: number[];
}

class HNSWService {
  private vectors: Map<string, number[]> = new Map();
  private isReady = false;
  private readonly STORAGE_KEY = 'galaxy_hnsw_index';
  private readonly dimension = 384;

  constructor() {
    // Simple in-memory implementation
  }

  async initialize() {
    if (this.isReady) return;

    try {
      // Try to load existing vectors from localStorage
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.vectors && Array.isArray(parsed.vectors)) {
          this.vectors.clear();
          for (const item of parsed.vectors) {
            this.vectors.set(item.id, item.vector);
          }
          console.log(`HNSW: Loaded ${this.vectors.size} vectors from localStorage`);
        }
      } else {
        console.log('HNSW: Created new empty index');
      }
      
      this.isReady = true;
      
      // Persist index on page unload
      window.addEventListener('beforeunload', () => this.persist());
      
    } catch (error) {
      console.error('HNSW initialization failed:', error);
      this.vectors.clear();
      this.isReady = true;
    }
  }

  async addOrUpdateNote(noteId: string, embedding: Float32Array) {
    if (!this.isReady) {
      console.warn('HNSW not ready, skipping add');
      return;
    }

    try {
      // Convert Float32Array to regular array and store
      const vector = Array.from(embedding);
      this.vectors.set(noteId, vector);
    } catch (error) {
      console.error('HNSW add failed:', error);
    }
  }

  async search(queryVec: Float32Array, k: number = 10): Promise<HNSWResult[]> {
    if (!this.isReady || this.vectors.size === 0) {
      return [];
    }

    try {
      const queryVector = Array.from(queryVec);
      const results: HNSWResult[] = [];
      
      // Brute force search with cosine similarity
      for (const [noteId, vector] of this.vectors) {
        const similarity = this.cosineSimilarity(queryVector, vector);
        results.push({
          noteId,
          score: similarity
        });
      }
      
      // Sort by similarity (highest first) and take top k
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    } catch (error) {
      console.error('HNSW search failed:', error);
      return [];
    }
  }

  async removeNote(noteId: string) {
    if (!this.isReady) return;

    try {
      this.vectors.delete(noteId);
    } catch (error) {
      console.error('HNSW remove failed:', error);
    }
  }

  async persist() {
    if (!this.isReady) return;

    try {
      const vectors: StoredVector[] = Array.from(this.vectors.entries()).map(([id, vector]) => ({
        id,
        vector
      }));
      
      const serializedData = JSON.stringify({ vectors });
      localStorage.setItem(this.STORAGE_KEY, serializedData);
      console.log(`HNSW: Persisted ${vectors.length} vectors to localStorage`);
    } catch (error) {
      console.error('HNSW persist failed:', error);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
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
  }

  getStats() {
    if (!this.isReady) return { ready: false };
    
    try {
      return {
        ready: true,
        dimension: this.dimension,
        vectorCount: this.vectors.size,
        indexType: 'in-memory-brute-force'
      };
    } catch (error) {
      return { ready: false, error: error.message };
    }
  }

  // Additional methods for tuning (no-ops for this simple implementation)
  setEfSearch(ef: number) {
    // No-op for compatibility
  }

  resizeIndex(newCap: number) {
    // No-op for compatibility
  }
}

export const hnswService = new HNSWService();
