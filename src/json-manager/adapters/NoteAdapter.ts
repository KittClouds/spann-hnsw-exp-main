
import { SerializationAdapter } from '../JSONManager';
import { Note, NoteId } from '@/lib/store';
import { blockNoteAdapter } from './BlockNoteAdapter';
import { generateNoteId } from '@/lib/utils/ids';

/**
 * Note JSON Serialization Adapter
 * Handles Note object serialization using BlockNote adapter for content
 */
export class NoteAdapter implements SerializationAdapter<Note> {
  name = 'NoteAdapter';
  version = '1.0.0';
  
  serialize(note: Note): Record<string, any> {
    // Use BlockNote adapter for content serialization
    const contentData = blockNoteAdapter.serialize(note.content);
    
    return {
      id: note.id,
      title: note.title,
      content: contentData,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      parentId: note.parentId,
      type: note.type,
      clusterId: note.clusterId,
      path: note.path,
      tags: note.tags,
      mentions: note.mentions,
      concepts: note.concepts,
      entities: note.entities,
      triples: note.triples,
      serializedAt: new Date().toISOString()
    };
  }
  
  deserialize(json: Record<string, any>): Note {
    if (!json.id || typeof json.id !== 'string') {
      throw new Error('Invalid Note data: missing or invalid id');
    }
    
    if (!json.title || typeof json.title !== 'string') {
      throw new Error('Invalid Note data: missing or invalid title');
    }
    
    // Use BlockNote adapter for content deserialization
    let content = [];
    if (json.content) {
      try {
        content = blockNoteAdapter.deserialize(json.content);
      } catch (error) {
        console.warn('NoteAdapter: Failed to deserialize content, using empty array');
        content = [];
      }
    }
    
    // Ensure id is properly typed as NoteId
    const noteId: NoteId = json.id.startsWith('note-') ? json.id as NoteId : generateNoteId();
    
    return {
      id: noteId,
      title: json.title,
      content: content,
      createdAt: json.createdAt || new Date().toISOString(),
      updatedAt: json.updatedAt || new Date().toISOString(),
      parentId: json.parentId || null,
      type: json.type || 'note',
      clusterId: json.clusterId || null,
      path: json.path,
      tags: json.tags,
      mentions: json.mentions,
      concepts: json.concepts,
      entities: json.entities,
      triples: json.triples
    };
  }
  
  validate(json: Record<string, any>): boolean {
    if (!json.id || typeof json.id !== 'string') {
      return false;
    }
    
    if (!json.title || typeof json.title !== 'string') {
      return false;
    }
    
    // Validate content if present
    if (json.content && !blockNoteAdapter.validate(json.content)) {
      return false;
    }
    
    return true;
  }
  
  schema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      content: blockNoteAdapter.schema,
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      parentId: { type: ['string', 'null'] },
      type: { type: 'string', enum: ['note', 'folder'] },
      clusterId: { type: ['string', 'null'] }
    },
    required: ['id', 'title']
  };
}

export const noteAdapter = new NoteAdapter();
