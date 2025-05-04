
import { Core } from 'cytoscape';
import { Entity } from './utils/parsingUtils';
import { EdgeType } from '@/services/types';
import { schema } from './schema';

/**
 * Ensures an entity node exists in the graph
 */
export function ensureEntityNode(entityId: string, entity: Entity, cy: Core): void {
  if (cy.getElementById(entityId).empty()) {
    const def = schema.getNodeDef(entity.kind);
    cy.add({
      group: 'nodes',
      data: { 
        id: entityId, 
        type: entity.kind, 
        label: entity.label, 
        kind: entity.kind 
      },
      style: def?.defaultStyle
    });
  }
}

/**
 * Adds an edge between two nodes if it doesn't already exist
 */
export function addEdgeIfMissing(
  sourceId: string, 
  targetId: string, 
  edgeType: EdgeType, 
  cy: Core,
  predicate?: string
): void {
  const edgeId = `${edgeType}_${sourceId}_${targetId}`;
  if (cy.getElementById(edgeId).empty()) {
    cy.add({
      group: 'edges',
      data: { 
        id: edgeId, 
        source: sourceId, 
        target: targetId, 
        label: edgeType,
        predicate: predicate  // optional predicate for certain edge types
      }
    });
  }
}
