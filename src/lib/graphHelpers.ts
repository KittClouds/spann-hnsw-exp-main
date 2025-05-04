
import { Core } from 'cytoscape';
import { EdgeType } from '@/services/types';
import { Entity } from './utils/parsingUtils';
import { schema } from './schema';

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
  const id = `${label}_${src}_${tgt}`;
  if (cy.getElementById(id).empty()) {
    const def = schema.getEdgeDef(label);
    cy.add({ group:'edges', data:{ id, source:src, target:tgt, label, predicate }, style:def?.defaultStyle });

    // auto‑mirror for symmetric predicates
    if (def?.symmetric) {
      const mirrorId = `${label}_${tgt}_${src}`;
      if (cy.getElementById(mirrorId).empty()) {
        cy.add({ group:'edges', data:{ id:mirrorId, source:tgt, target:src, label, predicate }, style:def?.defaultStyle });
      }
    }
  }
}
