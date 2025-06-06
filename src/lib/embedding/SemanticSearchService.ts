
import { embeddingService } from './EmbeddingService';
import { Block } from '@blocknote/core';

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
  return blocks.map(block => 
    block.content?.map(inline => 
      inline.type === 'text' ? inline.text : ''
    ).join('') || ''
  ).join('\n');
}

class SemanticSearchService {
  private embeddings = new Map<string, NoteEmbedding>();
  private isReady = false;

  async initialize() {
    if (this.isReady) return;
    await embeddingService.ready();
    this.isReady = true;
    console.log('SemanticSearchService initialized');
  }

  async addOrUpdateNote(noteId: string, title: string, content: Block[]) {
    await this.initialize();
    
    const textContent = blocksToText(content);
    if (!textContent.trim()) {
      this.embeddings.delete(noteId);
      return;
    }

    try {
      const { vector } = await embeddingService.embed([textContent]);
      this.embeddings.set(noteId, {
        noteId,
        title,
        content: textContent,
        embedding: vector
      });
    } catch (error) {
      console.error('Failed to embed note:', error);
    }
  }

  removeNote(noteId: string) {
    this.embeddings.delete(noteId);
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    await this.initialize();
    
    if (!query.trim() || this.embeddings.size === 0) {
      return [];
    }

    try {
      const { vector: queryVector } = await embeddingService.embed([`search_query: ${query}`]);
      
      const results: SearchResult[] = [];
      
      for (const [noteId, embedding] of this.embeddings) {
        const similarity = this.cosineSimilarity(queryVector, embedding.embedding);
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
      return [];
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async syncAllNotes(notes: Array<{ id: string; title: string; content: Block[] }>) {
    await this.initialize();
    this.embeddings.clear();
    
    for (const note of notes) {
      await this.addOrUpdateNote(note.id, note.title, note.content);
    }
  }

  getEmbeddingCount(): number {
    return this.embeddings.size;
  }
}

export const semanticSearchService = new SemanticSearchService();
