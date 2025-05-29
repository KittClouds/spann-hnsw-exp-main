
import { NodeSingular, Core } from 'cytoscape';
import { EdgeType } from '@/services/types';
import { schema } from '@/lib/schema';
import { Entity } from '@/lib/utils/parsingUtils';
import { generateEntityId } from '@/lib/utils/ids';

export function ensureEntityNode(id: string, entity: Entity, cy: Core): NodeSingular {
  // Use canonical ID generation
  const canonicalId = generateEntityId(entity.kind, entity.label);
  let node = cy.getElementById(canonicalId);

  if (node.empty()) {
    node = cy.add({
      group: 'nodes',
      data: {
        id: canonicalId,
        kind: entity.kind,
        label: entity.label,
        type: entity.kind, // Use kind as type for entity promotion
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

// Helper function to promote tags and mentions to proper entity nodes
export function promoteToEntity(
  type: 'tag' | 'mention',
  value: string,
  cy: Core
): NodeSingular {
  let entityKind: string;
  
  switch (type) {
    case 'tag':
      entityKind = 'CONCEPT';
      break;
    case 'mention':
      entityKind = 'MENTION';
      break;
    default:
      throw new Error(`Unknown promotion type: ${type}`);
  }
  
  const entity: Entity = {
    kind: entityKind,
    label: value
  };
  
  return ensureEntityNode(generateEntityId(entityKind, value), entity, cy);
}
