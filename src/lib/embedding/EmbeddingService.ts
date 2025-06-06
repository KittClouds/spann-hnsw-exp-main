import { pipeline, Tensor, matmul } from '@huggingface/transformers';

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

  /** Returns a (n × d) Float32Array for *n* texts */
  public async embed(texts: string[],
                     opts = { pooling: 'mean' as const, normalize: true }) {
    await this.ready();
    const tensor = await this.extractor(texts, opts);
    // Detach from wasm backend into a plain JS TypedArray
    const arr = Float32Array.from(tensor.data as Float32Array);
    tensor.dispose();
    return { vector: arr, rows: texts.length, dim: this.dimension };
  }

  /** Cosine-similarity between two batches (query × docs) */
  public async similarity(queries: string[], docs: string[]) {
    await this.ready();
    const q = await this.extractor(queries, { pooling: 'mean', normalize: true });
    const d = await this.extractor(docs,   { pooling: 'mean', normalize: true });
    // matmul ⟹ (q × docsᵀ) gives cosine because rows are already L2-normalised
    const sim = await matmul(q, d.transpose(1, 0));
    const scores = sim.tolist() as number[][];
    q.dispose(); d.dispose(); sim.dispose();
    return scores;
  }
}

// export a singleton
export const embeddingService = new EmbeddingService();
