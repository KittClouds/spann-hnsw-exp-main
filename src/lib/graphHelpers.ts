import { NodeSingular, Core } from 'cytoscape';
import { EdgeType } from '@/services/types';
import { schema } from '@/lib/schema';
import { Entity } from '@/lib/utils/parsingUtils';

export function ensureEntityNode(id: string, entity: Entity, cy: Core): NodeSingular {
  let node = cy.getElementById(id);

  if (node.empty()) {
    node = cy.add({
      group: 'nodes',
      data: {
        id: id,
        kind: entity.kind,
        label: entity.label,
        type: entity.kind,
        attributes: entity.attributes || {},
        createdAt: new Date().toISOString()
      },
      style: schema.getNodeDef(entity.kind)?.defaultStyle
    });
  } else if (entity.attributes) {
    // Update attributes if they exist
    const currentAttributes = node.data('attributes') || {};
    node.data('attributes', { ...currentAttributes, ...entity.attributes });
  }

  return node as NodeSingular;
}

export function addEdgeIfMissing(
  sourceId: string,
  targetId: string,
  label: EdgeType,
  cy: Core,
  metadata?: string
): void {
  const selector = `edge[source = "${sourceId}"][target = "${targetId}"][label = "${label}"]`;
  
  if (cy.$(selector).empty()) {
    cy.add({
      group: 'edges',
      data: {
        id: `${label}-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        label: label,
        metadata: metadata
      },
      style: schema.getEdgeDef(label)?.defaultStyle
    });
  }
}
