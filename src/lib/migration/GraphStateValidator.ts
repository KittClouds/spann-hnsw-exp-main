
import { Core } from 'cytoscape';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    orphanedEdges: number;
    duplicateIds: number;
    missingTypes: number;
  };
}

export interface GraphBackup {
  timestamp: string;
  checksum: string;
  elements: any[];
  data: any;
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
  };
  metadata: {
    version: string;
    nodeCount: number;
    edgeCount: number;
  };
}

/**
 * Validates graph state and creates backups for safe migration
 */
export class GraphStateValidator {
  private cy: Core;

  constructor(cy: Core) {
    this.cy = cy;
  }

  /**
   * Comprehensive graph validation
   */
  validate(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        nodeCount: this.cy.nodes().length,
        edgeCount: this.cy.edges().length,
        orphanedEdges: 0,
        duplicateIds: 0,
        missingTypes: 0
      }
    };

    // Check for duplicate IDs
    this.validateUniqueIds(result);
    
    // Check for orphaned edges
    this.validateEdgeIntegrity(result);
    
    // Check for missing required properties
    this.validateNodeProperties(result);
    
    // Check for circular references
    this.validateCircularReferences(result);
    
    // Check graph connectivity
    this.validateConnectivity(result);

    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * Create a comprehensive backup of the graph state
   */
  createBackup(): GraphBackup {
    const elements = this.cy.elements().jsons();
    const elementsString = JSON.stringify(elements);
    
    // Simple checksum calculation
    const checksum = this.calculateChecksum(elementsString);
    
    return {
      timestamp: new Date().toISOString(),
      checksum,
      elements,
      data: this.cy.data(),
      viewport: {
        zoom: this.cy.zoom(),
        pan: this.cy.pan()
      },
      metadata: {
        version: '1.0',
        nodeCount: this.cy.nodes().length,
        edgeCount: this.cy.edges().length
      }
    };
  }

  /**
   * Verify backup integrity
   */
  verifyBackup(backup: GraphBackup): boolean {
    try {
      const elementsString = JSON.stringify(backup.elements);
      const calculatedChecksum = this.calculateChecksum(elementsString);
      
      if (calculatedChecksum !== backup.checksum) {
        console.error('GraphStateValidator: Backup checksum mismatch');
        return false;
      }
      
      // Verify structure
      if (!backup.elements || !Array.isArray(backup.elements)) {
        console.error('GraphStateValidator: Invalid backup elements structure');
        return false;
      }
      
      // Verify metadata consistency
      const nodeCount = backup.elements.filter(el => el.group === 'nodes').length;
      const edgeCount = backup.elements.filter(el => el.group === 'edges').length;
      
      if (nodeCount !== backup.metadata.nodeCount || edgeCount !== backup.metadata.edgeCount) {
        console.error('GraphStateValidator: Backup metadata inconsistency');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('GraphStateValidator: Backup verification failed:', error);
      return false;
    }
  }

  /**
   * Restore graph from backup
   */
  restoreFromBackup(backup: GraphBackup): boolean {
    try {
      if (!this.verifyBackup(backup)) {
        throw new Error('Backup verification failed');
      }

      this.cy.startBatch();
      
      // Clear current state
      this.cy.elements().remove();
      
      // Restore elements
      this.cy.add(backup.elements);
      
      // Restore data and viewport
      this.cy.data(backup.data);
      this.cy.zoom(backup.viewport.zoom);
      this.cy.pan(backup.viewport.pan);
      
      console.log(`GraphStateValidator: Restored from backup (${backup.timestamp})`);
      return true;
      
    } catch (error) {
      console.error('GraphStateValidator: Restore failed:', error);
      return false;
    } finally {
      this.cy.endBatch();
    }
  }

  private validateUniqueIds(result: ValidationResult): void {
    const seenIds = new Set<string>();
    
    this.cy.elements().forEach(element => {
      const id = element.id();
      if (seenIds.has(id)) {
        result.errors.push(`Duplicate ID found: ${id}`);
        result.stats.duplicateIds++;
      }
      seenIds.add(id);
    });
  }

  private validateEdgeIntegrity(result: ValidationResult): void {
    this.cy.edges().forEach(edge => {
      const sourceId = edge.data('source');
      const targetId = edge.data('target');
      
      if (!sourceId || !targetId) {
        result.errors.push(`Edge ${edge.id()} missing source or target`);
        return;
      }
      
      const sourceNode = this.cy.getElementById(sourceId);
      const targetNode = this.cy.getElementById(targetId);
      
      if (sourceNode.empty()) {
        result.errors.push(`Edge ${edge.id()} references non-existent source: ${sourceId}`);
        result.stats.orphanedEdges++;
      }
      
      if (targetNode.empty()) {
        result.errors.push(`Edge ${edge.id()} references non-existent target: ${targetId}`);
        result.stats.orphanedEdges++;
      }
    });
  }

  private validateNodeProperties(result: ValidationResult): void {
    this.cy.nodes().forEach(node => {
      const nodeData = node.data();
      const nodeId = node.id();
      
      // Check for required type property
      if (!nodeData.type) {
        result.errors.push(`Node ${nodeId} missing type property`);
        result.stats.missingTypes++;
      }
      
      // Check for label/title
      if (!nodeData.title && !nodeData.label) {
        result.warnings.push(`Node ${nodeId} missing title/label property`);
      }
      
      // Validate specific node types
      if (nodeData.type === 'NOTE' && !nodeData.content) {
        result.warnings.push(`Note node ${nodeId} missing content`);
      }
    });
  }

  private validateCircularReferences(result: ValidationResult): void {
    // Check for cycles in parent-child relationships
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const node = this.cy.getElementById(nodeId);
      const parentId = node.data('parent') || node.data('parentId');
      
      if (parentId && hasCycle(parentId)) {
        return true;
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    this.cy.nodes().forEach(node => {
      const nodeId = node.id();
      if (!visited.has(nodeId) && hasCycle(nodeId)) {
        result.errors.push(`Circular reference detected involving node ${nodeId}`);
      }
    });
  }

  private validateConnectivity(result: ValidationResult): void {
    // Check for isolated components (may be warnings, not errors)
    const components = this.cy.elements().components();
    
    if (components.length > 3) { // Allow for some disconnected components
      result.warnings.push(`Graph has ${components.length} disconnected components`);
    }
    
    // Check for nodes with no connections (except root nodes)
    this.cy.nodes().forEach(node => {
      const nodeType = node.data('type');
      const isRootType = ['STANDARD_ROOT', 'CLUSTERS_ROOT'].includes(nodeType);
      
      if (!isRootType && node.degree() === 0) {
        result.warnings.push(`Isolated node detected: ${node.id()}`);
      }
    });
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Create validator instance and run validation
 */
export function validateGraphState(cy: Core): ValidationResult {
  const validator = new GraphStateValidator(cy);
  return validator.validate();
}

/**
 * Create a backup of the current graph state
 */
export function createGraphBackup(cy: Core): GraphBackup {
  const validator = new GraphStateValidator(cy);
  return validator.createBackup();
}
