
import { Core } from 'cytoscape';
import { generateEntityId } from '@/lib/schema';
import { slug } from '@/lib/utils';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  backup?: any;
}

export interface EntityMigrationData {
  oldId: string;
  newId: string;
  nodeType: string;
  label: string;
}

/**
 * Utility class for migrating entity IDs to canonical format
 */
export class EntityIdMigration {
  private cy: Core;
  private migrationLog: EntityMigrationData[] = [];
  private backup: any = null;

  constructor(cy: Core) {
    this.cy = cy;
  }

  /**
   * Create a backup of the current graph state
   */
  private createBackup(): any {
    return {
      timestamp: new Date().toISOString(),
      elements: this.cy.elements().jsons(),
      data: this.cy.data(),
      viewport: {
        zoom: this.cy.zoom(),
        pan: this.cy.pan()
      }
    };
  }

  /**
   * Validate current graph state before migration
   */
  validateGraphState(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for duplicate IDs
    const nodeIds = new Set<string>();
    this.cy.nodes().forEach(node => {
      const id = node.id();
      if (nodeIds.has(id)) {
        issues.push(`Duplicate node ID found: ${id}`);
      }
      nodeIds.add(id);
    });

    // Check for orphaned edges
    this.cy.edges().forEach(edge => {
      const sourceId = edge.source().id();
      const targetId = edge.target().id();
      
      if (this.cy.getElementById(sourceId).empty()) {
        issues.push(`Edge references non-existent source: ${sourceId}`);
      }
      if (this.cy.getElementById(targetId).empty()) {
        issues.push(`Edge references non-existent target: ${targetId}`);
      }
    });

    // Check for nodes without required data
    this.cy.nodes().forEach(node => {
      const nodeData = node.data();
      if (!nodeData.type) {
        issues.push(`Node ${node.id()} missing type property`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Identify nodes that need migration
   */
  identifyNodesToMigrate(): EntityMigrationData[] {
    const nodesToMigrate: EntityMigrationData[] = [];

    this.cy.nodes().forEach(node => {
      const nodeData = node.data();
      const oldId = node.id();
      const nodeType = nodeData.type;
      const label = nodeData.title || nodeData.label || '';

      // Check if this is an old-format tag
      if (oldId.startsWith('tag-') && nodeType === 'TAG') {
        const cleanLabel = label || oldId.replace('tag-', '').replace(/-/g, ' ');
        const newId = generateEntityId('tag', cleanLabel);
        
        if (oldId !== newId) {
          nodesToMigrate.push({
            oldId,
            newId,
            nodeType: 'tag',
            label: cleanLabel
          });
        }
      }
      
      // Check for other old-format entity IDs
      else if (nodeType && ['CHARACTER', 'LOCATION', 'CONCEPT', 'MENTION'].includes(nodeType)) {
        const kind = nodeType.toLowerCase();
        const expectedId = generateEntityId(kind, label);
        
        if (oldId !== expectedId && !oldId.includes('|')) {
          nodesToMigrate.push({
            oldId,
            newId: expectedId,
            nodeType: kind,
            label
          });
        }
      }
    });

    return nodesToMigrate;
  }

  /**
   * Perform the migration with rollback capability
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: []
    };

    try {
      // Create backup
      this.backup = this.createBackup();
      result.backup = this.backup;

      // Validate before migration
      const validation = this.validateGraphState();
      if (!validation.isValid) {
        result.errors.push(...validation.issues);
        return result;
      }

      // Identify nodes to migrate
      const nodesToMigrate = this.identifyNodesToMigrate();
      
      if (nodesToMigrate.length === 0) {
        result.success = true;
        result.migratedCount = 0;
        console.log('EntityIdMigration: No nodes require migration');
        return result;
      }

      console.log(`EntityIdMigration: Migrating ${nodesToMigrate.length} nodes`);

      // Start batch operation
      this.cy.startBatch();

      try {
        // Migrate each node
        for (const migration of nodesToMigrate) {
          await this.migrateNode(migration);
          this.migrationLog.push(migration);
          result.migratedCount++;
        }

        // Validate after migration
        const postValidation = this.validateGraphState();
        if (!postValidation.isValid) {
          throw new Error(`Post-migration validation failed: ${postValidation.issues.join(', ')}`);
        }

        result.success = true;
        console.log(`EntityIdMigration: Successfully migrated ${result.migratedCount} nodes`);

      } finally {
        this.cy.endBatch();
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
      console.error('EntityIdMigration: Migration failed:', error);
      
      // Attempt rollback
      if (this.backup) {
        try {
          await this.rollback();
          console.log('EntityIdMigration: Rollback completed successfully');
        } catch (rollbackError) {
          result.errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown rollback error'}`);
        }
      }
    }

    return result;
  }

  /**
   * Migrate a single node to new ID format
   */
  private async migrateNode(migration: EntityMigrationData): Promise<void> {
    const { oldId, newId } = migration;
    
    // Check if new ID already exists
    if (!this.cy.getElementById(newId).empty()) {
      throw new Error(`Target ID ${newId} already exists`);
    }

    const oldNode = this.cy.getElementById(oldId);
    if (oldNode.empty()) {
      throw new Error(`Source node ${oldId} not found`);
    }

    // Get node data and position
    const nodeData = oldNode.data();
    const nodePosition = oldNode.position();
    const nodeStyle = oldNode.style();

    // Get connected edges
    const connectedEdges = oldNode.connectedEdges();
    const edgeData = connectedEdges.map(edge => ({
      data: edge.data(),
      style: edge.style()
    }));

    // Remove old node and edges
    this.cy.remove(oldNode);

    // Create new node with updated ID
    const newNode = this.cy.add({
      group: 'nodes',
      data: {
        ...nodeData,
        id: newId
      },
      position: nodePosition
    });

    // Apply original style
    newNode.style(nodeStyle);

    // Recreate edges with updated references
    edgeData.forEach(({ data, style }) => {
      const newEdgeData = { ...data };
      
      // Update edge source/target references
      if (data.source === oldId) {
        newEdgeData.source = newId;
      }
      if (data.target === oldId) {
        newEdgeData.target = newId;
      }

      // Generate new edge ID if it contained the old node ID
      if (data.id && data.id.includes(oldId)) {
        newEdgeData.id = data.id.replace(oldId, newId);
      }

      const newEdge = this.cy.add({
        group: 'edges',
        data: newEdgeData
      });

      newEdge.style(style);
    });
  }

  /**
   * Rollback to backup state
   */
  async rollback(): Promise<void> {
    if (!this.backup) {
      throw new Error('No backup available for rollback');
    }

    try {
      this.cy.startBatch();
      
      // Clear current state
      this.cy.elements().remove();
      
      // Restore from backup
      this.cy.add(this.backup.elements);
      this.cy.data(this.backup.data);
      this.cy.zoom(this.backup.viewport.zoom);
      this.cy.pan(this.backup.viewport.pan);
      
      console.log('EntityIdMigration: Rollback completed successfully');
    } finally {
      this.cy.endBatch();
    }
  }

  /**
   * Get migration log
   */
  getMigrationLog(): EntityMigrationData[] {
    return [...this.migrationLog];
  }
}

/**
 * Convenience function to run migration on a graph
 */
export async function migrateEntityIds(cy: Core): Promise<MigrationResult> {
  const migration = new EntityIdMigration(cy);
  return await migration.migrate();
}
