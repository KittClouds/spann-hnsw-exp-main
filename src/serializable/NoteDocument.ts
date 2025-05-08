
import { Serializable } from './serializable';
import { Block } from '@blocknote/core';

export class NoteDocument extends Serializable {
  // Define namespace without readonly to match base class
  gn_namespace = ['app', 'note'];

  constructor(
    public id: string,
    public title: string,
    public blocks: Block[],
    public createdAt: string,
    public updatedAt: string
  ) {
    super({ id, title, blocks, createdAt, updatedAt });
  }
  
  /**
   * Properly implement fromJSON static method to create a NoteDocument instance
   */
  static fromJSON(json: Record<string, any>): NoteDocument {
    // Verify namespace matches
    const namespace = json.gn_namespace || [];
    if (!Array.isArray(namespace) || 
        namespace[0] !== 'app' || 
        namespace[1] !== 'note') {
      throw new Error('Invalid namespace for NoteDocument');
    }
    
    // Extract properties from JSON
    const { id, title, blocks, createdAt, updatedAt } = json;
    
    // Create and return a new instance
    return new NoteDocument(id, title, blocks, createdAt, updatedAt);
  }
  
  /** Narrow helper that provides a clearer API for users */
  static deserialize(json: Record<string, unknown>): NoteDocument {
    return NoteDocument.fromJSON(json);
  }
}
