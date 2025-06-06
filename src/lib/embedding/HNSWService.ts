
import { loadHnswlib } from 'hnswlib-wasm';

interface HNSWResult {
  noteId: string;
  score: number;
}

class HNSWService {
  private lib: any = null;
  private hnsw: any = null;
  private isReady = false;
  private readonly IDX = 'galaxy_vectors.dat';
  private readonly dimension = 384;
  private readonly maxElements = 1e6;

  async initialize() {
    if (this.isReady) return;

    try {
      console.log('HNSW: Starting initialization...');
      
      // One-time init
      this.lib = await loadHnswlib();
      console.log('HNSW: Library loaded successfully');
      
      const fs = this.lib.EmscriptenFileSystemManager;
      
      // Boot or restore index - check for existing first
      await fs.syncFS(true); // pull from IDBFS
      
      if (fs.checkFileExists(this.IDX)) {
        console.log('HNSW: Loading existing index...');
        // Create HNSW and load existing index
        this.hnsw = new this.lib.HierarchicalNSW('cosine', this.dimension);
        this.hnsw.readIndex(this.IDX, this.maxElements, true); // capacity, allow resize
        console.log('HNSW: Loaded existing index');
      } else {
        console.log('HNSW: Creating new index...');
        // Create HNSW and initialize new index
        this.hnsw = new this.lib.HierarchicalNSW('cosine', this.dimension);
        this.hnsw.initIndex(this.maxElements, 48, 128, 100); // max, M, efC, seed
        this.hnsw.writeIndex(this.IDX);
        await fs.syncFS(false); // persist
        console.log('HNSW: Created new index');
      }
      
      this.hnsw.setEfSearch(32); // latency-quality knob
      this.isReady = true;
      console.log('HNSW: Initialization complete - Ready!');
      
      // Persist on exit
      window.addEventListener('beforeunload', () => this.persist());
      
    } catch (error) {
      console.error('HNSW initialization failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      this.isReady = false;
    }
  }

  async addOrUpdateNote(noteId: string, embedding: Float32Array) {
    if (!this.isReady) {
      console.warn('HNSW not ready, skipping add');
      return;
    }

    try {
      // hnsw wants int keys
      const id = Number.parseInt(noteId, 36);
      
      if (this.hnsw.wasFound(id)) {
        this.hnsw.markDelete(id);
      }
      
      this.hnsw.addPoint(embedding, id);
      console.log(`HNSW: Added/updated note ${noteId} (id: ${id})`);
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
      const { ids, distances } = this.hnsw.searchKnn(queryVec, k);
      const results = ids.map((i: number, idx: number) => ({ 
        noteId: i.toString(36), 
        score: 1 - distances[idx] 
      }));
      console.log(`HNSW: Search returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('HNSW search failed:', error);
      return [];
    }
  }

  async removeNote(noteId: string) {
    if (!this.isReady) return;

    try {
      const id = Number.parseInt(noteId, 36);
      if (this.hnsw.wasFound(id)) {
        this.hnsw.markDelete(id);
        console.log(`HNSW: Removed note ${noteId} (id: ${id})`);
      }
    } catch (error) {
      console.error('HNSW remove failed:', error);
    }
  }

  async persist() {
    if (!this.isReady) return;

    try {
      this.hnsw.writeIndex(this.IDX);
      await this.lib.EmscriptenFileSystemManager.syncFS(false); // flush to IndexedDB/OPFS
      console.log('HNSW: Index persisted');
    } catch (error) {
      console.error('HNSW persist failed:', error);
    }
  }

  // Tune later methods
  setEfSearch(ef: number) {
    if (this.isReady) {
      this.hnsw.setEfSearch(ef);
      console.log(`HNSW: Set efSearch to ${ef}`);
    }
  }

  resizeIndex(newCap: number) {
    if (this.isReady) {
      this.hnsw.resizeIndex(newCap);
      console.log(`HNSW: Resized index to ${newCap}`);
    }
  }

  getStats() {
    if (!this.isReady) return { ready: false };
    
    try {
      return {
        ready: true,
        maxElements: this.hnsw.getMaxElements(),
        currentCount: this.hnsw.getCurrentCount()
      };
    } catch (error) {
      console.error('HNSW getStats failed:', error);
      return { ready: false, error: error.message };
    }
  }
}

export const hnswService = new HNSWService();
