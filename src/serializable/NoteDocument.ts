
import { Serializable } from './serializable';
import { Block } from '@blocknote/core';

export class NoteDocument extends Serializable {
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
   * Recreates a NoteDocument from its JSON representation
   */
  static fromJSON(json: Record<string, any>): NoteDocument {
    // Verify namespace matches
    const namespace = json.gn_namespace || [];
    if (!Array.isArray(namespace) || 
        namespace[0] !== 'app' || 
        namespace[1] !== 'note') {
      throw new Error('Invalid namespace for NoteDocument');
    }
    
    return new NoteDocument(
      json.id,
      json.title,
      json.blocks,
      json.createdAt,
      json.updatedAt
    );
  }
}
