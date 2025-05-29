
export { JSONManager, jsonManager } from './JSONManager';
export { JSONRegistry } from './JSONRegistry';
export * from './adapters';

export type { 
  JSONOperation, 
  SerializationAdapter, 
  JSONManagerOptions 
} from './JSONManager';

// Convenience re-exports
export { 
  blockNoteAdapter, 
  cytoscapeAdapter, 
  entityAdapter, 
  noteAdapter 
} from './adapters';
