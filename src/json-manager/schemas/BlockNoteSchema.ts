
import { JSONSchemaDefinition } from './JSONSchemaRegistry';
import { stateValidator } from '@/cursor-stability/StateValidator';

export const blockNoteSchemaV1: JSONSchemaDefinition = {
  id: 'blocknote',
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            content: { type: 'array' },
            props: { type: 'object' }
          },
          required: ['id', 'type']
        }
      },
      count: { type: 'number' },
      serializedAt: { type: 'string' },
      _json_meta: { type: 'object' }
    },
    required: ['blocks']
  },
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.blocks || !Array.isArray(data.blocks)) {
      errors.push('Missing or invalid blocks array');
      return { isValid: false, errors };
    }
    
    // Use StateValidator for detailed block validation
    const validation = stateValidator.validateContent(data.blocks);
    
    return {
      isValid: validation.isValid,
      errors: validation.errors
    };
  },
  migrate: (data: any, fromVersion: string) => {
    // Migration logic for future versions
    if (fromVersion === '0.9.0') {
      // Example migration from old format
      return {
        ...data,
        blocks: stateValidator.sanitizeContent(data.blocks || []),
        count: (data.blocks || []).length,
        serializedAt: new Date().toISOString()
      };
    }
    return data;
  }
};
