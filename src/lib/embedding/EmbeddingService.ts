
import { pipeline, Tensor, matmul } from '@huggingface/transformers';

/**
 * L2 normalize a vector to unit length
 * Prevents cosine scores from bunching up when vectors drift in length
 */
function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0; 
  for (const x of v) norm += x * x;
  norm = 1 / Math.sqrt(norm || 1e-9);
  return v.map(x => x * norm) as Float32Array;
}

/**
 * Lazy-loads the Snowflake Arctic Embed model once, then serves embeddings on demand.
 * Usage:
 *   await embeddingService.ready();
 *   const vec = await embeddingService.embed(['hello world']);
 */
class EmbeddingService {
  /** HF feature-extraction pipeline (set after init) */
  private extractor: any; // Simplified type to avoid complex union type error

  /** Promise that resolves when the model is ready */
  private initPromise = this.init();

  /** Optional: expose model dimensionality after first call */
  public dimension = 0;

  private async init() {
    this.extractor = await pipeline(
      'feature-extraction',
      'Snowflake/snowflake-arctic-embed-s',
      { 
        dtype: 'fp32'
      }
    );

    // Warm-up & capture output size
    const t = await this.extractor(['hello'], { pooling: 'mean', normalize: true });
    this.dimension = t.dims.at(-1) ?? 0;
    t.dispose();                                  // free warm-up tensor
  }

  /** Await until model + weights are available */
  public ready() { return this.initPromise; }

  /** Returns a (n × d) Float32Array for *n* texts with L2 normalization */
  public async embed(texts: string[],
                     opts = { pooling: 'mean' as const, normalize: true }) {
    await this.ready();
    const tensor = await this.extractor(texts, opts);
    
    // Detach from wasm backend into a plain JS TypedArray
    let arr = Float32Array.from(tensor.data as Float32Array);
    tensor.dispose();
    
    // Apply L2 normalization for vector hygiene
    if (texts.length === 1) {
      // Single vector case
      arr = l2Normalize(arr);
    } else {
      // Multiple vectors case - normalize each vector separately
      const normalized = new Float32Array(arr.length);
      for (let i = 0; i < texts.length; i++) {
        const start = i * this.dimension;
        const end = start + this.dimension;
        const vector = arr.slice(start, end);
        const normalizedVector = l2Normalize(vector);
        normalized.set(normalizedVector, start);
      }
      arr = normalized;
    }
    
    return { vector: arr, rows: texts.length, dim: this.dimension };
  }

  /** Cosine-similarity between two batches (query × docs) with L2 normalization */
  public async similarity(queries: string[], docs: string[]) {
    await this.ready();
    const q = await this.extractor(queries, { pooling: 'mean', normalize: true });
    const d = await this.extractor(docs,   { pooling: 'mean', normalize: true });
    
    // Apply L2 normalization to both query and doc embeddings
    const qData = Float32Array.from(q.data as Float32Array);
    const dData = Float32Array.from(d.data as Float32Array);
    
    // Normalize query embeddings
    const normalizedQ = new Float32Array(qData.length);
    for (let i = 0; i < queries.length; i++) {
      const start = i * this.dimension;
      const end = start + this.dimension;
      const vector = qData.slice(start, end);
      const normalizedVector = l2Normalize(vector);
      normalizedQ.set(normalizedVector, start);
    }
    
    // Normalize doc embeddings
    const normalizedD = new Float32Array(dData.length);
    for (let i = 0; i < docs.length; i++) {
      const start = i * this.dimension;
      const end = start + this.dimension;
      const vector = dData.slice(start, end);
      const normalizedVector = l2Normalize(vector);
      normalizedD.set(normalizedVector, start);
    }
    
    // Create new tensors with normalized data
    const normalizedQTensor = new Tensor('float32', normalizedQ, q.dims);
    const normalizedDTensor = new Tensor('float32', normalizedD, d.dims);
    
    // matmul ⟹ (q × docsᵀ) gives cosine because rows are already L2-normalised
    const sim = await matmul(normalizedQTensor, normalizedDTensor.transpose(1, 0));
    const scores = sim.tolist() as number[][];
    
    // Clean up tensors
    q.dispose(); 
    d.dispose(); 
    normalizedQTensor.dispose();
    normalizedDTensor.dispose();
    sim.dispose();
    
    return scores;
  }
}

// export a singleton
export const embeddingService = new EmbeddingService();
