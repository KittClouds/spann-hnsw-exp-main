
import { pipeline } from "@huggingface/transformers";
import { Block } from "@blocknote/core";
import { Note } from "@/lib/store";

// Helper to convert BlockNote content to plain text
function blocksToText(blocks: Block[] | undefined): string {
  if (!blocks) return '';
  return blocks.map(block => {
    if (block.content && Array.isArray(block.content)) {
      return block.content.map(inline => 
        inline.type === 'text' ? inline.text : ''
      ).join('');
    }
    return '';
  }).join('\n');
}

interface SearchResult {
  noteId: string;
  title: string;
  score: number;
  content: string;
}

interface VectorChunk {
  id: string;
  vector: number[];
  metadata: {
    noteId: string;
    noteTitle: string;
    content: string;
  };
}

class EmbeddingService {
  private embeddings: any = null;
  private vectorStore: Map<string, VectorChunk> = new Map();
  private isInitializedStatus = false;
  private chunkSize = 500;
  private chunkOverlap = 50;

  isInitialized = () => this.isInitializedStatus;

  async initialize() {
    if (this.isInitializedStatus) return;
    
    try {
      console.log("Initializing HuggingFace embeddings...");
      this.embeddings = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { quantized: false }
      );
      this.isInitializedStatus = true;
      console.log("HuggingFace embeddings initialized successfully");
    } catch (error) {
      console.error("Failed to initialize embeddings:", error);
      this.isInitializedStatus = false;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized()) {
      await this.initialize();
    }
    if (!this.embeddings) {
      throw new Error("Embeddings not initialized");
    }
  }

  private splitText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + this.chunkSize;
      
      if (end < text.length) {
        // Try to find a good break point
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + this.chunkSize / 2) {
          end = lastSpace;
        }
      }
      
      chunks.push(text.slice(start, end).trim());
      start = end - this.chunkOverlap;
      
      if (start >= text.length) break;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async upsertNoteInVectorStore(note: Note, oldChunkIds?: string[]): Promise<string[] | null> {
    await this.ensureInitialized();
    
    // Remove old chunks if they exist
    if (oldChunkIds?.length) {
      oldChunkIds.forEach(id => this.vectorStore.delete(id));
    }

    const text = blocksToText(note.content);
    if (!text.trim()) return [];

    const chunks = this.splitText(text);
    const newChunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${note.id}-chunk-${i}`;
      const chunk = chunks[i];
      
      try {
        const embedding = await this.embeddings(chunk, { 
          pooling: 'mean', 
          normalize: true 
        });
        
        const vectorChunk: VectorChunk = {
          id: chunkId,
          vector: Array.from(embedding.data),
          metadata: {
            noteId: note.id,
            noteTitle: note.title,
            content: chunk
          }
        };
        
        this.vectorStore.set(chunkId, vectorChunk);
        newChunkIds.push(chunkId);
      } catch (error) {
        console.error(`Failed to embed chunk ${chunkId}:`, error);
      }
    }

    return newChunkIds;
  }

  async deleteNoteFromVectorStore(chunkIds: string[]) {
    if (!chunkIds?.length) return;
    chunkIds.forEach(id => this.vectorStore.delete(id));
  }

  async search(query: string, k = 5): Promise<SearchResult[]> {
    await this.ensureInitialized();
    
    if (!query.trim()) return [];

    try {
      const queryEmbedding = await this.embeddings(query, { 
        pooling: 'mean', 
        normalize: true 
      });
      const queryVector = Array.from(queryEmbedding.data);

      const similarities: Array<{ chunk: VectorChunk; score: number }> = [];
      
      for (const chunk of this.vectorStore.values()) {
        const score = this.cosineSimilarity(queryVector, chunk.vector);
        similarities.push({ chunk, score });
      }

      // Sort by similarity score and take top k
      similarities.sort((a, b) => b.score - a.score);
      
      // Group by note and take the best chunk per note
      const noteMap = new Map<string, SearchResult>();
      
      for (const { chunk, score } of similarities) {
        const { noteId, noteTitle, content } = chunk.metadata;
        
        if (!noteMap.has(noteId) || noteMap.get(noteId)!.score < score) {
          noteMap.set(noteId, {
            noteId,
            title: noteTitle,
            score,
            content
          });
        }
      }

      return Array.from(noteMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    } catch (error) {
      console.error("Search failed:", error);
      return [];
    }
  }

  async syncAllNotes(notes: Note[]) {
    await this.ensureInitialized();
    
    // Clear existing vectors
    this.vectorStore.clear();
    
    console.log(`Syncing ${notes.length} notes...`);
    
    for (const note of notes) {
      try {
        await this.upsertNoteInVectorStore(note);
      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error);
      }
    }
    
    console.log("Embedding sync completed");
  }
}

export const embeddingService = new EmbeddingService();
