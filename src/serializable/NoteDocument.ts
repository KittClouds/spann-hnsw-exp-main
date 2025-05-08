
import { Serializable } from './serializable';
import { Block } from '@blocknote/core';

export class NoteDocument extends Serializable {
  gn_namespace = ['app', 'note'] as const;

  constructor(
    public id: string,
    public title: string,
    public blocks: Block[],
    public createdAt: string,
    public updatedAt: string
  ) {
    super({ id, title, blocks, createdAt, updatedAt });
  }
  
  /** Narrow helper that *wraps* the generic base method */
  static deserialize(json: Record<string, unknown>): NoteDocument {
    // Cast because Serializable.fromJSON() returns `Serializable`
    return Serializable.fromJSON(json) as NoteDocument;
  }
}
