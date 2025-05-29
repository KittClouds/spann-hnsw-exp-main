
import { Core } from 'cytoscape';
import { generateEntityId } from '@/lib/schema';
import { slug } from '@/lib/utils';

/**
 * Entity Migration Utilities - Safe migration of existing entities to canonical format
 */
export class EntityMigration {
  private cy: Core;
  private migrationLog: MigrationLogEntry[] = [];

  constructor(cy: Core) {
    this.cy = cy;
  }

  /**
   * Create a backup of the current graph state
   */
  public createBackup(): GraphBackup {
    return {
      timestamp: new Date().toISOString(),
      elements: this.cy.elements().jsons(),
      metadata: {
        nodeCount: this.cy.nodes().length,
        edgeCount: this.cy.edges().length
      }
    };
  }

  /**
   * Restore graph from backup
   */
  public restoreFromBackup(backup: GraphBackup): boolean {
    try {
      this.cy.startBatch();
      this.cy.elements().remove();
      this.cy.add(backup.elements);
      this.cy.endBatch();
      
      this.migrationLog.push({
        type: 'restore',
        timestamp: new Date().toISOString(),
        message: `Restored from backup created at ${backup.timestamp}`
      });
      
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Migrate tag nodes to canonical entity format
   */
  public migrateTagNodes(): MigrationResult {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      errors: [],
      warnings: []
    };

    try {
      this.cy.startBatch();

      const tagNodes = this.cy.nodes('[type = "tag"]');
      
      tagNodes.forEach(node => {
        const oldId = node.id();
        const title = node.data('title');
        
        if (!title) {
          result.warnings.push(`Tag node ${oldId} missing title, skipping`);
          return;
        }

        // Generate canonical entity ID
        const newId = generateEntityId('TAG', title);
        
        if (oldId === newId) {
          // Already in canonical format
          return;
        }

        // Check if canonical ID already exists
        if (this.cy.getElementById(newId).nonempty()) {
          result.warnings.push(`Entity with ID ${newId} already exists, skipping ${oldId}`);
          return;
        }

        // Update node data
        node.data('id', newId);
        node.data('kind', 'TAG');
        node.data('label', title);

        // Update connected edges
        const connectedEdges = node.connectedEdges();
        connectedEdges.forEach(edge => {
          if (edge.source().id() === oldId) {
            edge.data('source', newId);
          }
          if (edge.target().id() === oldId) {
            edge.data('target', newId);
          }
        });

        result.migratedCount++;
        this.migrationLog.push({
          type: 'migrate',
          timestamp: new Date().toISOString(),
          message: `Migrated tag ${oldId} to ${newId}`
        });
      });

      this.cy.endBatch();
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Migrate mention nodes to canonical entity format
   */
  public migrateMentionNodes(): MigrationResult {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      errors: [],
      warnings: []
    };

    try {
      this.cy.startBatch();

      const mentionNodes = this.cy.nodes('[type = "mention"]');
      
      mentionNodes.forEach(node => {
        const oldId = node.id();
        const title = node.data('title');
        
        if (!title) {
          result.warnings.push(`Mention node ${oldId} missing title, skipping`);
          return;
        }

        // Generate canonical entity ID
        const newId = generateEntityId('MENTION', title);
        
        if (oldId === newId) {
          // Already in canonical format
          return;
        }

        // Check if canonical ID already exists
        if (this.cy.getElementById(newId).nonempty()) {
          result.warnings.push(`Entity with ID ${newId} already exists, skipping ${oldId}`);
          return;
        }

        // Update node data
        node.data('id', newId);
        node.data('kind', 'MENTION');
        node.data('label', title);

        // Update connected edges
        const connectedEdges = node.connectedEdges();
        connectedEdges.forEach(edge => {
          if (edge.source().id() === oldId) {
            edge.data('source', newId);
          }
          if (edge.target().id() === oldId) {
            edge.data('target', newId);
          }
        });

        result.migratedCount++;
        this.migrationLog.push({
          type: 'migrate',
          timestamp: new Date().toISOString(),
          message: `Migrated mention ${oldId} to ${newId}`
        });
      });

      this.cy.endBatch();
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Get migration log
   */
  public getMigrationLog(): MigrationLogEntry[] {
    return [...this.migrationLog];
  }

  /**
   * Clear migration log
   */
  public clearMigrationLog(): void {
    this.migrationLog = [];
  }
}

export interface GraphBackup {
  timestamp: string;
  elements: any[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
  };
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationLogEntry {
  type: 'migrate' | 'restore' | 'error';
  timestamp: string;
  message: string;
}
