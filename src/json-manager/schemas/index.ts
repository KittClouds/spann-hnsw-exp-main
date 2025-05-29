import { jsonSchemaRegistry } from './JSONSchemaRegistry';
import { blockNoteSchemaV1 } from './BlockNoteSchema';
import { entitySchemaV1 } from './EntitySchema';
import { noteSchemaV1 } from './NoteSchema';
import { cytoscapeSchemaV1 } from './CytoscapeSchema';
import { liveStoreSchemaV1 } from './LiveStoreSchema';

/**
 * Initialize all JSON schemas including unified and LiveStore schemas
 */
export function initializeSchemas(): void {
  console.log('JSONSchemas: Initializing schema definitions');
  
  // Register all schema versions
  jsonSchemaRegistry.registerSchema('blocknote', blockNoteSchemaV1);
  jsonSchemaRegistry.registerSchema('entity', entitySchemaV1);
  jsonSchemaRegistry.registerSchema('note', noteSchemaV1);
  jsonSchemaRegistry.registerSchema('cytoscape', cytoscapeSchemaV1);
  jsonSchemaRegistry.registerSchema('livestore', liveStoreSchemaV1);
  
  console.log('JSONSchemas: All schemas registered');
}

export { jsonSchemaRegistry, JSONSchemaRegistry } from './JSONSchemaRegistry';
export type { JSONSchemaDefinition } from './JSONSchemaRegistry';

// Re-export individual schemas for direct access
export { blockNoteSchemaV1, entitySchemaV1, noteSchemaV1, cytoscapeSchemaV1 };

// Re-export new schemas
export { liveStoreSchemaV1 };
