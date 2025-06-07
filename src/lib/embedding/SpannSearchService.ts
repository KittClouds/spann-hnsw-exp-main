
import { HNSW } from './hnsw';
import { tables, events } from '../../livestore/schema';
import { blobToVec, vecToBlob } from './binaryUtils';
import { embeddingService } from './EmbeddingService';
import { Block } from '@blocknote/core';
import { toast } from 'sonner';

interface Centroid {
  id: number;
  vector: Float32Array;
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
    
    if (Array.isArray(block.content)) {
      return block.content.map(inline => {
        if (typeof inline === 'object' && inline !== null && 'type' in inline && inline.type === 'text') {
          return (inline as any).text || '';
        }
        return '';
      }).join('');
    }
    
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

/**
 * Implements a SPANN-like hybrid search.
 * - An in-memory HNSW index holds a small number of centroids.
 * - The full vector dataset remains on "disk" in the SQLite database.
 * - Search is a two-step process: find candidate clusters in memory, then
 *   fetch and search vectors from only those clusters.
 */
class SpannSearchService {
  private storeRef: any = null;
  private isReady = false;
  private isInitialized = false;

  // In-memory components of the index
  private centroids: Centroid[] = [];
  private centroidIndex: HNSW | null = null;

  constructor(private config = {
    // How many clusters/centroids to partition the dataset into.
    numClusters: 100,
    // How many of the closest clusters to search during a query.
    // Higher is more accurate but slower.
    searchProbeCount: 5,
  }) {}

  /**
   * Injects the LiveStore instance. Called once on app startup.
   */
  public setStore(store: any) {
    this.storeRef = store;
    if (!this.isInitialized && store) {
      this.initialize();
      this.isInitialized = true;
    }
  }

  private async initialize() {
    if (this.isReady) return;
    try {
      await embeddingService.ready();
      await this.loadCentroidsFromDB();
      this.isReady = true;
      console.log('SpannSearchService initialized');
      if (!this.centroidIndex) {
        console.warn('SPANN index is not built. Use "Build Index" to create the index.');
      }
    } catch (error) {
      console.error('Failed to initialize SpannSearchService:', error);
    }
  }

  /**
   * Loads ONLY the centroids from the database into the in-memory HNSW index.
   */
  private async loadCentroidsFromDB() {
    if (!this.storeRef) return;

    try {
      const clusterRows = this.storeRef.query(tables.embeddingClusters.select());
      if (!Array.isArray(clusterRows) || clusterRows.length === 0) {
        this.centroids = [];
        this.centroidIndex = null;
        return;
      }

      this.centroids = clusterRows.map((row: any) => ({
        id: row.id,
        vector: blobToVec(row.vecData, row.vecDim),
      }));

      // Build the fast, in-memory index on the centroids
      this.centroidIndex = new HNSW(16, 200, null, 'cosine');
      const hnswData = this.centroids.map(c => ({ id: c.id, vector: c.vector }));
      await this.centroidIndex.buildIndex(hnswData);

      console.log(`SpannSearchService: Loaded ${this.centroids.length} centroids into memory`);
    } catch (error) {
      console.error('Failed to load centroids from database:', error);
    }
  }

  /**
   * The core index-building process. Triggered by the user.
   */
  public async buildIndex() {
    if (!this.storeRef || !this.isReady) {
      throw new Error("Service not ready");
    }
    
    console.log("SPANN: Build process started");

    try {
      // 1. Fetch all embeddings from the database
      const allEmbeddings = this.storeRef.query(tables.embeddings.select());
      const minEmbeddings = Math.max(10, this.config.numClusters);
      
      if (!allEmbeddings || allEmbeddings.length < minEmbeddings) {
        throw new Error(`Not enough embeddings (${allEmbeddings?.length || 0}) to build index. Need at least ${minEmbeddings}.`);
      }

      // 2. Clear previous index data from the database
      this.storeRef.commit(events.embeddingIndexCleared({}));
      
      // 3. Select centroids using random sampling
      const sampledEmbeddings: any[] = [];
      const usedIndices = new Set<number>();
      const targetCount = Math.min(this.config.numClusters, allEmbeddings.length);
      
      while (sampledEmbeddings.length < targetCount) {
        const randomIndex = Math.floor(Math.random() * allEmbeddings.length);
        if (!usedIndices.has(randomIndex)) {
          sampledEmbeddings.push(allEmbeddings[randomIndex]);
          usedIndices.add(randomIndex);
        }
      }

      // 4. Commit the new centroids to the embeddingClusters table
      sampledEmbeddings.forEach((embedding, i) => {
        this.storeRef.commit(events.embeddingClusterCreated({
          id: i,
          vecData: embedding.vecData,
          vecDim: embedding.vecDim,
          createdAt: new Date().toISOString(),
        }));
      });

      // 5. Reload the new centroids and rebuild the in-memory index
      await this.loadCentroidsFromDB();
      if (!this.centroidIndex) {
        throw new Error("Failed to build centroid index");
      }

      // 6. Assign every full embedding to its nearest cluster
      console.log(`SPANN: Assigning ${allEmbeddings.length} embeddings to ${this.centroids.length} clusters`);
      const assignments = new Map<number, string[]>();
      
      for (const embedding of allEmbeddings) {
        const vector = blobToVec(embedding.vecData, embedding.vecDim);
        const [nearestCentroid] = this.centroidIndex.searchKNN(vector, 1);
        if (nearestCentroid) {
          if (!assignments.has(nearestCentroid.id)) {
            assignments.set(nearestCentroid.id, []);
          }
          assignments.get(nearestCentroid.id)!.push(embedding.noteId);
        }
      }
      
      // 7. Commit assignments to the database by updating the clusterId field
      for (const [clusterId, noteIds] of assignments.entries()) {
        this.storeRef.commit(events.embeddingsAssignedToCluster({ clusterId, noteIds }));
      }

      console.log("SPANN: Index build complete");
      return this.centroids.length;
    } catch (error) {
      console.error('Failed to build SPANN index:', error);
      throw error;
    }
  }

  /**
   * Performs the two-phase hybrid search.
   */
  public async search(query: string, k = 10): Promise<SearchResult[]> {
    try {
      await this.initialize();
      
      if (!query.trim() || !this.centroidIndex) {
        return [];
      }

      // Phase 1: In-Memory Search
      // Find the most relevant clusters by searching the small centroid index
      const { vector: queryVector } = await embeddingService.embed([`search_query: ${query}`]);
      const normalizedQueryVector = l2Normalize(queryVector);
      
      const candidateClusters = this.centroidIndex.searchKNN(normalizedQueryVector, this.config.searchProbeCount);
      
      if (candidateClusters.length === 0) return [];

      // Phase 2: Disk Search
      // Retrieve all vectors from only the candidate clusters using proper LiveStore syntax
      const clusterIdsToFetch = candidateClusters.map(c => c.id);
      
      // Use raw SQL query instead of the complex where clause that's causing issues
      const candidateEmbeddings = this.storeRef.query({
        query: `SELECT * FROM embeddings WHERE clusterId IN (${clusterIdsToFetch.map(() => '?').join(',')})`,
        args: clusterIdsToFetch
      });

      if (!Array.isArray(candidateEmbeddings) || candidateEmbeddings.length === 0) {
        return [];
      }
      
      // Perform a final, exact search on the small subset of retrieved vectors
      const finalResults: SearchResult[] = [];
      for (const embedding of candidateEmbeddings) {
        const vector = blobToVec(embedding.vecData, embedding.vecDim);
        const normalizedVector = l2Normalize(vector);
        const score = this.centroidIndex.similarityFunction(normalizedQueryVector, normalizedVector);
        finalResults.push({
          noteId: embedding.noteId,
          title: embedding.title,
          content: embedding.content,
          score
        });
      }

      return finalResults
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
      return [];
    }
  }

  /**
   * Adds or updates a single note's embedding. For this simplified model,
   * we add it to the database without a cluster assignment. It will be
   * properly clustered during the next full buildIndex run.
   */
  public async addOrUpdateNote(noteId: string, title: string, content: Block[]) {
    try {
      await this.initialize();
      
      const textContent = blocksToText(content);
      if (!textContent.trim()) {
        this.removeNote(noteId);
        return;
      }

      const { vector } = await embeddingService.embed([textContent]);
      const normalizedVector = l2Normalize(vector);
      
      if (this.storeRef) {
        this.storeRef.commit(events.noteEmbedded({
          noteId,
          title,
          content: textContent,
          vecData: vecToBlob(normalizedVector),
          vecDim: normalizedVector.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          clusterId: null // This embedding is now "unclustered"
        }));
      }
    } catch (error) {
      console.error('Failed to embed note:', error);
      toast.error('Failed to generate embedding for note');
    }
  }

  public removeNote(noteId: string) {
    try {
      if (this.storeRef) {
        this.storeRef.commit(events.embeddingRemoved({ noteId }));
      }
    } catch (error) {
      console.error('Failed to remove embedding:', error);
    }
  }

  public async syncAllNotes(notes: Array<{ id: string; title: string; content: Block[] }>) {
    try {
      await this.initialize();
      
      console.log(`SpannSearchService: Syncing ${notes.length} notes`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const note of notes) {
        try {
          await this.addOrUpdateNote(note.id, note.title, note.content);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync note ${note.id}:`, error);
        }
      }
      
      console.log(`SpannSearchService: Sync complete, ${successCount} embeddings created, ${errorCount} errors`);
      return successCount;
    } catch (error) {
      console.error('Failed to sync notes:', error);
      toast.error('Failed to synchronize embeddings');
      return 0;
    }
  }

  public getEmbeddingCount(): number {
    if (!this.storeRef) return 0;
    try {
      return this.storeRef.query(tables.embeddings.count()) || 0;
    } catch (error) {
      console.error('Failed to get embedding count:', error);
      return 0;
    }
  }

  public getStoredEmbeddingCount(): number {
    return this.getEmbeddingCount();
  }

  public getCentroidCount(): number {
    if (!this.storeRef) return 0;
    try {
      return this.storeRef.query(tables.embeddingClusters.count()) || 0;
    } catch (error) {
      console.error('Failed to get centroid count:', error);
      return 0;
    }
  }

  public isIndexBuilt(): boolean {
    return this.centroidIndex !== null && this.centroids.length > 0;
  }
}

// Export a singleton instance to be used throughout the app
export const spannSearchService = new SpannSearchService();
