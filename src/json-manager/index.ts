
export { JSONManager, jsonManager } from './JSONManager';
export { JSONRegistry } from './JSONRegistry';
export * from './adapters';
export * from './schemas';

export type { 
  JSONOperation, 
  SerializationAdapter, 
  JSONManagerOptions 
} from './JSONManager';

export type {
  JSONSchemaDefinition
} from './schemas';

// Convenience re-exports
export { 
  blockNoteAdapter, 
  cytoscapeAdapter, 
  entityAdapter, 
  noteAdapter 
} from './adapters';

export {
  jsonSchemaRegistry,
  blockNoteSchemaV1,
  entitySchemaV1,
  noteSchemaV1,
  cytoscapeSchemaV1
} from './schemas';
