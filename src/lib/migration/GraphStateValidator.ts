
import { Core, NodeCollection, EdgeCollection } from 'cytoscape';
import { NodeType, EdgeType } from '@/services/types';

/**
 * Graph State Validator - Validates graph integrity and structure
 */
export class GraphStateValidator {
  private cy: Core;

  constructor(cy: Core) {
    this.cy = cy;
  }

  /**
   * Comprehensive validation of graph state
   */
  public validateAll(): ValidationResult {
    const results: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      nodeCount: 0,
      edgeCount: 0,
      orphanedNodes: [],
      circularReferences: []
    };

    try {
      // Basic counts
      results.nodeCount = this.cy.nodes().length;
      results.edgeCount = this.cy.edges().length;

      // Run individual validations
      this.validateNodeStructure(results);
      this.validateEdgeStructure(results);
      this.validateOrphanedNodes(results);
      this.validateCircularReferences(results);
      this.validateDataIntegrity(results);

      // Set overall validity
      results.isValid = results.errors.length === 0;

    } catch (error) {
      results.isValid = false;
      results.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  private validateNodeStructure(results: ValidationResult): void {
    const nodes = this.cy.nodes();
    
    nodes.forEach(node => {
      const data = node.data();
      
      // Check required fields
      if (!data.id) {
        results.errors.push(`Node missing ID: ${node.id()}`);
      }
      
      if (!data.type) {
        results.warnings.push(`Node missing type: ${node.id()}`);
      }
    });
  }

  private validateEdgeStructure(results: ValidationResult): void {
    const edges = this.cy.edges();
    
    edges.forEach(edge => {
      const data = edge.data();
      
      // Check required fields
      if (!data.source || !data.target) {
        results.errors.push(`Edge missing source/target: ${edge.id()}`);
      }
      
      // Check that source and target nodes exist
      if (data.source && this.cy.getElementById(data.source).empty()) {
        results.errors.push(`Edge references non-existent source: ${data.source}`);
      }
      
      if (data.target && this.cy.getElementById(data.target).empty()) {
        results.errors.push(`Edge references non-existent target: ${data.target}`);
      }
    });
  }

  private validateOrphanedNodes(results: ValidationResult): void {
    const nodes = this.cy.nodes();
    
    nodes.forEach(node => {
      const edges = node.connectedEdges();
      const nodeType = node.data('type');
      
      // Skip root nodes and special types
      if (nodeType === NodeType.STANDARD_ROOT || nodeType === NodeType.CLUSTERS_ROOT) {
        return;
      }
      
      if (edges.length === 0) {
        results.orphanedNodes.push(node.id());
        results.warnings.push(`Orphaned node found: ${node.id()}`);
      }
    });
  }

  private validateCircularReferences(results: ValidationResult): void {
    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Back edge found - cycle detected
      }
      
      if (visited.has(nodeId)) {
        return false; // Already processed this node
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      // Check all outgoing edges
      const node = this.cy.getElementById(nodeId);
      if (node.empty()) return false;
      
      const outgoingEdges = node.outgoers().edges();
      for (const edge of outgoingEdges) {
        const targetId = edge.target().id();
        if (hasCycle(targetId)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check each node for cycles
    this.cy.nodes().forEach(node => {
      const nodeId = node.id();
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) {
          results.circularReferences.push(nodeId);
          results.warnings.push(`Circular reference detected starting from: ${nodeId}`);
        }
      }
    });
  }

  private validateDataIntegrity(results: ValidationResult): void {
    // Check for data consistency issues
    const nodes = this.cy.nodes();
    
    nodes.forEach(node => {
      const data = node.data();
      
      // Check timestamp format if present
      if (data.createdAt && !this.isValidTimestamp(data.createdAt)) {
        results.warnings.push(`Invalid createdAt timestamp for node: ${node.id()}`);
      }
      
      if (data.updatedAt && !this.isValidTimestamp(data.updatedAt)) {
        results.warnings.push(`Invalid updatedAt timestamp for node: ${node.id()}`);
      }
    });
  }

  private isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  edgeCount: number;
  orphanedNodes: string[];
  circularReferences: string[];
}
