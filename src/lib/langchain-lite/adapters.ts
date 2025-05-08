
import { NodeId, TripleId, DocumentId, RelationshipId } from "../utils/ids";

/**
 * Adapters to help convert between different ID formats when needed
 * Particularly useful for import/export operations
 */

/**
 * Convert string ID to typed NodeId (if not already in the correct format)
 */
export function toNodeId(id: string | NodeId): NodeId {
  if (typeof id === 'string' && !id.startsWith('node-')) {
    return `node-${id}` as NodeId;
  }
  return id as NodeId;
}

/**
 * Convert string ID to typed DocumentId (if not already in the correct format)
 */
export function toDocumentId(id: string | DocumentId): DocumentId {
  if (typeof id === 'string' && !id.startsWith('doc-')) {
    return `doc-${id}` as DocumentId;
  }
  return id as DocumentId;
}

/**
 * Convert string ID to typed RelationshipId (if not already in the correct format)
 */
export function toRelationshipId(id: string | RelationshipId): RelationshipId {
  if (typeof id === 'string' && !id.startsWith('rel-')) {
    return `rel-${id}` as RelationshipId;
  }
  return id as RelationshipId;
}

/**
 * Convert string ID to typed TripleId (if not already in the correct format)
 */
export function toTripleId(id: string | TripleId): TripleId {
  if (typeof id === 'string' && !id.startsWith('triple-')) {
    return `triple-${id}` as TripleId;
  }
  return id as TripleId;
}
