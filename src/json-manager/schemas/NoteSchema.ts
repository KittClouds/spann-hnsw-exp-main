
import { JSONSchemaDefinition } from './JSONSchemaRegistry';
import { blockNoteSchemaV1 } from './BlockNoteSchema';

export const noteSchemaV1: JSONSchemaDefinition = {
  id: 'note',
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^note-' },
      title: { type: 'string' },
      content: blockNoteSchemaV1.schema.properties.blocks,
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      parentId: { type: ['string', 'null'] },
      type: { type: 'string', enum: ['note', 'folder'] },
      clusterId: { type: ['string', 'null'] },
      path: { type: 'string' },
      tags: { type: 'array' },
      mentions: { type: 'array' },
      concepts: { type: 'array' },
      entities: { type: 'array' },
      triples: { type: 'array' },
      serializedAt: { type: 'string' },
      _json_meta: { type: 'object' }
    },
    required: ['id', 'title']
  },
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.id || typeof data.id !== 'string') {
      errors.push('Missing or invalid id field');
    } else if (!data.id.startsWith('note-')) {
      errors.push('Note ID must start with "note-"');
    }
    
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Missing or invalid title field');
    }
    
    if (data.content) {
      const contentValidation = blockNoteSchemaV1.validate({ blocks: data.content });
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors.map(e => `Content validation: ${e}`));
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  migrate: (data: any, fromVersion: string) => {
    // Future migration logic
    if (fromVersion === '0.9.0') {
      // Example: ensure ID format
      if (data.id && !data.id.startsWith('note-')) {
        data.id = `note-${data.id}`;
      }
    }
    return data;
  }
};
