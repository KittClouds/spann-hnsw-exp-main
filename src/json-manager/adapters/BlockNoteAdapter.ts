
import { Block } from '@blocknote/core';
import { SerializationAdapter } from '../JSONManager';
import { stateValidator } from '@/cursor-stability/StateValidator';

/**
 * BlockNote JSON Serialization Adapter
 * Handles BlockNote Block[] serialization with validation
 */
export class BlockNoteAdapter implements SerializationAdapter<Block[]> {
  name = 'BlockNoteAdapter';
  version = '1.0.0';
  
  serialize(blocks: Block[]): Record<string, any> {
    // Validate blocks before serialization
    const validation = stateValidator.validateContent(blocks);
    if (!validation.isValid) {
      console.warn('BlockNoteAdapter: Invalid blocks detected, sanitizing');
      blocks = stateValidator.sanitizeContent(blocks);
    }
    
    return {
      blocks: blocks,
      count: blocks.length,
      serializedAt: new Date().toISOString()
    };
  }
  
  deserialize(json: Record<string, any>): Block[] {
    if (!json.blocks || !Array.isArray(json.blocks)) {
      throw new Error('Invalid BlockNote data: missing or invalid blocks array');
    }
    
    // Validate and sanitize the blocks
    const validation = stateValidator.validateContent(json.blocks);
    if (!validation.isValid) {
      console.warn('BlockNoteAdapter: Invalid blocks in JSON, sanitizing');
      return stateValidator.sanitizeContent(json.blocks);
    }
    
    return json.blocks as Block[];
  }
  
  validate(json: Record<string, any>): boolean {
    if (!json.blocks || !Array.isArray(json.blocks)) {
      return false;
    }
    
    const validation = stateValidator.validateContent(json.blocks);
    return validation.isValid;
  }
  
  schema = {
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
      serializedAt: { type: 'string' }
    },
    required: ['blocks']
  };
}

export const blockNoteAdapter = new BlockNoteAdapter();
