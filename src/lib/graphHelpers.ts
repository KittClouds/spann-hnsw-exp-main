
import { schema } from './schema';
import { Entity } from './utils/parsingUtils';
import { EdgeType, NodeType } from '../services/types';
import { generateEntityId } from './schema';
import cytoscape from 'cytoscape';

/**
 * Ensures an entity node exists in the graph
 * @param id Entity ID
 * @param ent Entity data
 * @param cy Cytoscape instance
 */
export function ensureEntityNode(id: string, ent: Entity, cy: cytoscape.Core): void {
  if (cy.getElementById(id).empty()) {
    const def = schema.getNodeDef(ent.kind);
    cy.add({
      group: 'nodes',
      data: { 
        id: id, 
        type: ent.kind, 
        label: ent.label, 
        kind: ent.kind,
        title: ent.label // Provide title for compatibility with existing queries
      },
      style: def?.defaultStyle
    });
  }
}

/**
 * Adds an edge between source and target if it doesn't already exist
 * @param src Source node ID
 * @param tgt Target node ID
 * @param label Edge type label
 * @param cy Cytoscape instance
 * @param pred Optional predicate text (for labeling)
 */
export function addEdgeIfMissing(src: string, tgt: string, label: EdgeType, cy: cytoscape.Core, pred?: string): void {
  const edgeId = `${label}_${src}_${tgt}`;
  if (cy.getElementById(edgeId).empty()) {
    cy.add({
      group: 'edges',
      data: { 
        id: edgeId, 
        source: src, 
        target: tgt, 
        label: label,
        predicate: pred // Store predicate if provided
      }
    });
  }
}
