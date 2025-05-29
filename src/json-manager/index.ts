
export { JSONManager, jsonManager } from './JSONManager';
export { JSONRegistry } from './JSONRegistry';
export * from './adapters';
export * from './schemas';
export * from './interfaces/UnifiedSerializable';

export type { 
  JSONOperation, 
  SerializationAdapter, 
  JSONManagerOptions 
} from './JSONManager';

export type {
  JSONSchemaDefinition
} from './schemas';

export type {
  UnifiedSerializable
} from './interfaces/UnifiedSerializable';

// Convenience re-exports
export { 
  blockNoteAdapter, 
  cytoscapeAdapter, 
  entityAdapter, 
  noteAdapter,
  liveStoreAdapter,
  backwardCompatibilityAdapter 
} from './adapters';

export {
  jsonSchemaRegistry,
  blockNoteSchemaV1,
  entitySchemaV1,
  noteSchemaV1,
  cytoscapeSchemaV1,
  liveStoreSchemaV1
} from './schemas';

// Unified serialization exports
export { UnifiedSerializableBase } from '../serializable/UnifiedSerializable';
export { UnifiedNoteDocument } from '../serializable/UnifiedNoteDocument';
export { serializationAdapterRegistry } from './interfaces/UnifiedSerializable';
