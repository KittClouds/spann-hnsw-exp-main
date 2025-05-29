
// Migration utilities for entity architecture refactor
export { EntityIdMigration, migrateEntityIds } from './EntityIdMigration';
export type { MigrationResult, EntityMigrationData } from './EntityIdMigration';

export { GraphStateValidator, validateGraphState, createGraphBackup } from './GraphStateValidator';
export type { ValidationResult, GraphBackup } from './GraphStateValidator';

export { entityTypeRegistry, initializeEntityTypes } from '../schema/EntityTypeRegistry';
export type { EntityTypeDefinition } from '../schema/EntityTypeRegistry';

/**
 * Complete Phase 0 migration setup
 * Call this function to initialize the migration system
 */
export async function initializeMigrationSystem() {
  console.log('Migration: Initializing Phase 0 migration system');
  
  // Initialize entity types first
  const { initializeEntityTypes } = await import('../schema/EntityTypeRegistry');
  initializeEntityTypes();
  
  console.log('Migration: Phase 0 initialization complete');
}
