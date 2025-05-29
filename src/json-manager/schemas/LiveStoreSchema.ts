
import { JSONSchemaDefinition } from './JSONSchemaRegistry';

export const liveStoreSchemaV1: JSONSchemaDefinition = {
  id: 'livestore',
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      eventType: { type: 'string' },
      payload: { type: 'object' },
      timestamp: { type: 'number' },
      storeId: { type: 'string' },
      sessionId: { type: 'string' },
      serializedAt: { type: 'string' },
      _json_meta: { type: 'object' }
    },
    required: ['eventType']
  },
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.eventType || typeof data.eventType !== 'string') {
      errors.push('Missing or invalid eventType field');
    }
    
    if (data.payload && typeof data.payload !== 'object') {
      errors.push('Invalid payload field - must be object');
    }
    
    if (data.timestamp && typeof data.timestamp !== 'number') {
      errors.push('Invalid timestamp field - must be number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  migrate: (data: any, fromVersion: string) => {
    // Future migration logic for LiveStore events
    return data;
  }
};
