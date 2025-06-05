
import { connect, Connection, Table } from '@lancedb/lancedb';
import { pipeline } from '@huggingface/transformers';

export interface VectorSearchResult {
  id: string;
  text: string;
  type: string;
  score?: number;
  metadata?: Record<string, any>;
}

export class LanceDBService {
  private connection: Connection | null = null;
  private embedPipeline: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing LanceDB connection...');
      
      // Connect to LanceDB (using memory for browser compatibility)
      this.connection = await connect('memory://');
      
      // Initialize embedding pipeline
      console.log('Loading embedding model...');
      this.embedPipeline = await pipeline(
        'feature-extraction', 
        'Xenova/all-MiniLM-L6-v2'
      );
      
      this.isInitialized = true;
      console.log('LanceDB service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LanceDB:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embedPipeline) {
      throw new Error('Embedding pipeline not initialized');
    }

    const res = await this.embedPipeline(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    return Array.from(res.data);
  }

  async createNotesTable(notes: Array<{
    id: string;
    text: string;
    type: string;
    metadata?: Record<string, any>;
  }>): Promise<Table> {
    if (!this.connection) {
      throw new Error('LanceDB not initialized');
    }

    try {
      // Generate embeddings for all notes
      const notesWithEmbeddings = await Promise.all(
        notes.map(async (note) => ({
          ...note,
          vector: await this.generateEmbedding(note.text)
        }))
      );
      
      // Create table with notes data and embeddings
      const table = await this.connection.createTable('notes_vectors', notesWithEmbeddings);
      
      console.log(`Created notes table with ${notes.length} entries`);
      return table;
    } catch (error) {
      console.error('Failed to create notes table:', error);
      throw error;
    }
  }

  async searchSimilarNotes(
    query: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    if (!this.connection) {
      throw new Error('LanceDB not initialized');
    }

    try {
      // Get or create the notes table
      const table = await this.connection.openTable('notes_vectors');
      
      // Generate embedding for the query
      const queryVector = await this.generateEmbedding(query);
      
      const results = await table
        .search(queryVector)
        .limit(limit)
        .toArray();

      return results.map((result: any) => ({
        id: result.id,
        text: result.text,
        type: result.type,
        score: result._distance,
        metadata: result.metadata
      }));
    } catch (error) {
      console.error('Failed to search notes:', error);
      return [];
    }
  }

  async addNote(note: {
    id: string;
    text: string;
    type: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.connection) {
      throw new Error('LanceDB not initialized');
    }

    try {
      const table = await this.connection.openTable('notes_vectors');
      const noteWithEmbedding = {
        ...note,
        vector: await this.generateEmbedding(note.text)
      };
      await table.add([noteWithEmbedding]);
      console.log(`Added note ${note.id} to vector database`);
    } catch (error) {
      console.error('Failed to add note to vector database:', error);
    }
  }

  async updateNote(noteId: string, updates: Partial<{
    text: string;
    type: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    if (!this.connection) {
      throw new Error('LanceDB not initialized');
    }

    try {
      const table = await this.connection.openTable('notes_vectors');
      
      // Get the existing note using query() instead of search()
      const existing = await table
        .query()
        .where(`id = '${noteId}'`)
        .limit(1)
        .toArray();
      
      if (existing.length > 0) {
        const updatedNote = {
          ...existing[0],
          ...updates
        };
        
        // If text was updated, regenerate embedding
        if (updates.text) {
          updatedNote.vector = await this.generateEmbedding(updates.text);
        }
        
        // Remove old and add updated
        await table.delete(`id = '${noteId}'`);
        await table.add([updatedNote]);
        
        console.log(`Updated note ${noteId} in vector database`);
      }
    } catch (error) {
      console.error('Failed to update note in vector database:', error);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.connection) {
      throw new Error('LanceDB not initialized');
    }

    try {
      const table = await this.connection.openTable('notes_vectors');
      await table.delete(`id = '${noteId}'`);
      console.log(`Deleted note ${noteId} from vector database`);
    } catch (error) {
      console.error('Failed to delete note from vector database:', error);
    }
  }

  async getTableStats(): Promise<{ count: number; schema?: any }> {
    if (!this.connection) {
      return { count: 0 };
    }

    try {
      const table = await this.connection.openTable('notes_vectors');
      const count = await table.countRows();
      const schema = await table.schema();
      
      return { count, schema };
    } catch (error) {
      console.error('Failed to get table stats:', error);
      return { count: 0 };
    }
  }
}

// Export singleton instance
export const lanceDBService = new LanceDBService();
