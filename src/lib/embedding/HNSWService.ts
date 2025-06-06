
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

  async initialize() {
    if (this.isReady) return;

    try {
      // One-time init
      this.lib = await loadHnswlib();
      const fs = this.lib.EmscriptenFileSystemManager;
      
      this.hnsw = new this.lib.HierarchicalNSW('cosine', this.dimension);
      
      // Boot or restore index
      await fs.syncFS(true); // pull from IDBFS
      
      if (fs.checkFileExists(this.IDX)) {
        this.hnsw.readIndex(this.IDX, 1e6, true); // capacity
        console.log('HNSW: Loaded existing index');
      } else {
        this.hnsw.initIndex(1e6, 48, 128, 100); // max, M, efC, seed
        this.hnsw.setEfSearch(32); // latency-quality knob
        this.hnsw.writeIndex(this.IDX);
        await fs.syncFS(false); // persist
        console.log('HNSW: Created new index');
      }
      
      this.hnsw.setEfSearch(32);
      this.isReady = true;
      
      // Persist on exit
      window.addEventListener('beforeunload', () => this.persist());
      
    } catch (error) {
      console.error('HNSW initialization failed:', error);
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
      return ids.map((i: number, idx: number) => ({ 
        noteId: i.toString(36), 
        score: 1 - distances[idx] 
      }));
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
    }
  }

  resizeIndex(newCap: number) {
    if (this.isReady) {
      this.hnsw.resizeIndex(newCap);
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
      return { ready: false, error: error.message };
    }
  }
}

export const hnswService = new HNSWService();
