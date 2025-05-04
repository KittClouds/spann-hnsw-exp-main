
import { Core } from 'cytoscape';
import { EdgeType } from '@/services/types';
import { Entity } from './utils/parsingUtils';
import { schema, areTypesCompatible } from './schema';

// 🔒 ensure *one* node per (kind,label)
export function ensureEntityNode(id: string, ent: Entity, cy: Core) {
  const keySel = `[kind = "${ent.kind}"][label = "${ent.label}"]`;
  const existing = cy.nodes(keySel).first();
  if (existing.nonempty()) return existing; // already there (unique‑compound constraint)

  const def = schema.getNodeDef(ent.kind);
  return cy.add({
    group: 'nodes',
    data: { id, type: ent.kind, kind: ent.kind, label: ent.label },
    style: def?.defaultStyle
  });
}

export function addEdgeIfMissing(src: string, tgt: string, label: EdgeType, cy: Core, predicate?: string) {
  // Get source and target nodes to check their types
  const sourceNode = cy.getElementById(src);
  const targetNode = cy.getElementById(tgt);
  
  // Skip if either node doesn't exist
  if (sourceNode.empty() || targetNode.empty()) {
    console.warn(`Cannot create edge ${label}: node not found (${sourceNode.empty() ? src : tgt})`);
    return;
  }
  
  // Get node types
  const sourceKind = sourceNode.data('kind');
  const targetKind = targetNode.data('kind');
  
  // Get edge definition from schema
  const edgeDef = schema.getEdgeDef(label);
  
  if (!edgeDef) {
    console.warn(`Edge type ${label} not found in schema`);
    return;
  }
  
  // Check compatibility using schema validation
  if (!areTypesCompatible(edgeDef, sourceKind, targetKind)) {
    console.error(`Invalid edge: ${sourceKind} -[${label}]-> ${targetKind} violates schema constraints`);
    // Stop here - don't add incompatible edge
    return;
  }
  
  // If we get here, the edge is valid - proceed with adding it
  const id = `${label}_${src}_${tgt}`;
  if (cy.getElementById(id).empty()) {
    cy.add({ 
      group: 'edges', 
      data: { id, source: src, target: tgt, label, predicate }, 
      style: edgeDef?.defaultStyle 
    });

    // auto‑mirror for symmetric predicates
    if (edgeDef?.symmetric) {
      const mirrorId = `${label}_${tgt}_${src}`;
      if (cy.getElementById(mirrorId).empty()) {
        cy.add({ 
          group: 'edges', 
          data: { id: mirrorId, source: tgt, target: src, label, predicate }, 
          style: edgeDef?.defaultStyle 
        });
      }
    }
  }
}
