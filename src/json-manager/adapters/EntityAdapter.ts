
import { SerializationAdapter } from '../JSONManager';
import { Entity } from '@/lib/utils/parsingUtils';

/**
 * Entity JSON Serialization Adapter
 * Handles Entity object serialization with validation
 */
export class EntityAdapter implements SerializationAdapter<Entity> {
  name = 'EntityAdapter';
  version = '1.0.0';
  
  serialize(entity: Entity): Record<string, any> {
    return {
      kind: entity.kind,
      label: entity.label,
      attributes: entity.attributes || {},
      id: entity.id,
      serializedAt: new Date().toISOString()
    };
  }
  
  deserialize(json: Record<string, any>): Entity {
    if (!json.kind || typeof json.kind !== 'string') {
      throw new Error('Invalid Entity data: missing or invalid kind');
    }
    
    if (!json.label || typeof json.label !== 'string') {
      throw new Error('Invalid Entity data: missing or invalid label');
    }
    
    return {
      kind: json.kind,
      label: json.label,
      attributes: json.attributes || {},
      id: json.id
    };
  }
  
  validate(json: Record<string, any>): boolean {
    if (!json.kind || typeof json.kind !== 'string') {
      return false;
    }
    
    if (!json.label || typeof json.label !== 'string') {
      return false;
    }
    
    if (json.attributes && typeof json.attributes !== 'object') {
      return false;
    }
    
    return true;
  }
  
  schema = {
    type: 'object',
    properties: {
      kind: { type: 'string' },
      label: { type: 'string' },
      attributes: { type: 'object' },
      id: { type: 'string' },
      serializedAt: { type: 'string' }
    },
    required: ['kind', 'label']
  };
}

export const entityAdapter = new EntityAdapter();
