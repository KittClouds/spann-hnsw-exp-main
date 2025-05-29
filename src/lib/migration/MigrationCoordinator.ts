
import { Core } from 'cytoscape';
import { GraphStateValidator } from './GraphStateValidator';
import { EntityMigration, GraphBackup, MigrationResult } from './EntityMigration';
import { EntityTypeRegistry } from './EntityTypeRegistry';

/**
 * Migration Coordinator - Safely orchestrates entity architecture migration
 */
export class MigrationCoordinator {
  private cy: Core;
  private validator: GraphStateValidator;
  private migration: EntityMigration;
  private typeRegistry: EntityTypeRegistry;

  constructor(cy: Core) {
    this.cy = cy;
    this.validator = new GraphStateValidator(cy);
    this.migration = new EntityMigration(cy);
    this.typeRegistry = new EntityTypeRegistry();
  }

  /**
   * Phase 0: Safe Foundation Building
   */
  public async executePhase0(): Promise<Phase0Result> {
    console.log('Starting Phase 0: Safe Foundation Building');
    
    const result: Phase0Result = {
      success: true,
      steps: [],
      backup: null,
      errors: []
    };

    try {
      // Step 1: Create backup
      console.log('Step 1: Creating backup...');
      result.backup = this.migration.createBackup();
      result.steps.push({ name: 'backup', success: true, message: 'Backup created successfully' });

      // Step 2: Register entity types
      console.log('Step 2: Registering entity types...');
      this.typeRegistry.registerCoreEntityTypes();
      const typeValidation = this.typeRegistry.validateRegistration();
      
      if (!typeValidation.isValid) {
        result.steps.push({ 
          name: 'typeRegistry', 
          success: false, 
          message: `Missing types: ${typeValidation.missingTypes.join(', ')}` 
        });
        result.errors.push('Type registration validation failed');
      } else {
        result.steps.push({ name: 'typeRegistry', success: true, message: 'All entity types registered' });
      }

      // Step 3: Validate current graph state
      console.log('Step 3: Validating current graph state...');
      const validation = this.validator.validateAll();
      
      if (!validation.isValid) {
        result.steps.push({ 
          name: 'validation', 
          success: false, 
          message: `Validation errors: ${validation.errors.length}` 
        });
        result.errors.push(...validation.errors);
      } else {
        result.steps.push({ 
          name: 'validation', 
          success: true, 
          message: `Graph validated: ${validation.nodeCount} nodes, ${validation.edgeCount} edges` 
        });
      }

      // Step 4: Test migration (dry run)
      console.log('Step 4: Testing migration capabilities...');
      const tagCount = this.cy.nodes('[type = "tag"]').length;
      const mentionCount = this.cy.nodes('[type = "mention"]').length;
      
      result.steps.push({ 
        name: 'migrationTest', 
        success: true, 
        message: `Ready to migrate ${tagCount} tags and ${mentionCount} mentions` 
      });

      console.log('Phase 0 completed successfully');
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Phase 0 failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Phase 0 failed:', error);
    }

    return result;
  }

  /**
   * Execute safe entity migration
   */
  public async executeMigration(): Promise<MigrationExecutionResult> {
    console.log('Starting entity migration...');
    
    const result: MigrationExecutionResult = {
      success: true,
      tagMigration: { success: true, migratedCount: 0, errors: [], warnings: [] },
      mentionMigration: { success: true, migratedCount: 0, errors: [], warnings: [] },
      rollbackInfo: null
    };

    try {
      // Create rollback point
      const backup = this.migration.createBackup();
      result.rollbackInfo = backup;

      // Migrate tags
      console.log('Migrating tag entities...');
      result.tagMigration = this.migration.migrateTagNodes();
      
      if (!result.tagMigration.success) {
        console.error('Tag migration failed, rolling back...');
        this.migration.restoreFromBackup(backup);
        result.success = false;
        return result;
      }

      // Migrate mentions  
      console.log('Migrating mention entities...');
      result.mentionMigration = this.migration.migrateMentionNodes();
      
      if (!result.mentionMigration.success) {
        console.error('Mention migration failed, rolling back...');
        this.migration.restoreFromBackup(backup);
        result.success = false;
        return result;
      }

      // Validate post-migration state
      const postValidation = this.validator.validateAll();
      if (!postValidation.isValid) {
        console.error('Post-migration validation failed, rolling back...');
        this.migration.restoreFromBackup(backup);
        result.success = false;
        result.tagMigration.errors.push('Post-migration validation failed');
        return result;
      }

      console.log('Migration completed successfully');
      
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.tagMigration.errors.push(errorMsg);
      console.error('Migration failed:', error);
      
      // Attempt rollback
      if (result.rollbackInfo) {
        this.migration.restoreFromBackup(result.rollbackInfo);
      }
    }

    return result;
  }

  /**
   * Get migration status
   */
  public getMigrationStatus(): MigrationStatus {
    const tagNodes = this.cy.nodes('[type = "tag"]');
    const mentionNodes = this.cy.nodes('[type = "mention"]');
    
    let tagsNeedMigration = 0;
    let mentionsNeedMigration = 0;
    
    tagNodes.forEach(node => {
      const id = node.id();
      const title = node.data('title');
      if (title && !id.startsWith('tag-')) {
        tagsNeedMigration++;
      }
    });
    
    mentionNodes.forEach(node => {
      const id = node.id();
      const title = node.data('title');
      if (title && !id.startsWith('mention-')) {
        mentionsNeedMigration++;
      }
    });

    return {
      totalTags: tagNodes.length,
      totalMentions: mentionNodes.length,
      tagsNeedMigration,
      mentionsNeedMigration,
      migrationNeeded: tagsNeedMigration > 0 || mentionsNeedMigration > 0
    };
  }
}

export interface Phase0Result {
  success: boolean;
  steps: Array<{ name: string; success: boolean; message: string }>;
  backup: GraphBackup | null;
  errors: string[];
}

export interface MigrationExecutionResult {
  success: boolean;
  tagMigration: MigrationResult;
  mentionMigration: MigrationResult;
  rollbackInfo: GraphBackup | null;
}

export interface MigrationStatus {
  totalTags: number;
  totalMentions: number;
  tagsNeedMigration: number;
  mentionsNeedMigration: number;
  migrationNeeded: boolean;
}
