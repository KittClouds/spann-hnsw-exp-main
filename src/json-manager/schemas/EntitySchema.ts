
import { JSONSchemaDefinition } from './JSONSchemaRegistry';

export const entitySchemaV1: JSONSchemaDefinition = {
  id: 'entity',
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      kind: { type: 'string' },
      label: { type: 'string' },
      attributes: { type: 'object' },
      serializedAt: { type: 'string' },
      _json_meta: { type: 'object' }
    },
    required: ['kind', 'label']
  },
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.kind || typeof data.kind !== 'string') {
      errors.push('Missing or invalid kind field');
    }
    
    if (!data.label || typeof data.label !== 'string') {
      errors.push('Missing or invalid label field');
    }
    
    if (data.attributes && typeof data.attributes !== 'object') {
      errors.push('Invalid attributes field - must be object');
    }
    
    // Validate attribute values
    if (data.attributes) {
      for (const [key, value] of Object.entries(data.attributes)) {
        if (typeof key !== 'string') {
          errors.push(`Invalid attribute key: ${key} - must be string`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  migrate: (data: any, fromVersion: string) => {
    // Future migration logic
    return data;
  }
};
