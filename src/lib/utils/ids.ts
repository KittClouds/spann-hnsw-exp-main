
import { nanoid } from 'nanoid';

export type NoteId = string;
export type ClusterId = string;
export type TripleId = string;
export type NodeId = string;
export type EntityId = string;
export type DocumentId = string;
export type RelationshipId = string;

export const generateNoteId = (): NoteId => `note_${nanoid()}`;
export const generateClusterId = (): ClusterId => `cluster_${nanoid()}`;
export const generateTripleId = (): TripleId => `triple_${nanoid()}`;
export const generateNodeId = (): NodeId => `node_${nanoid()}`;
export const generateDocumentId = (): DocumentId => `doc_${nanoid()}`;
export const generateRelationshipId = (): RelationshipId => `rel_${nanoid()}`;

// Generate a deterministic entity ID from kind and label
export const generateEntityId = (kind: string, label: string): EntityId => {
  // Create a deterministic ID by combining kind and label
  // This ensures the same entity always gets the same ID
  const normalized = `${kind.toUpperCase()}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  return `entity_${normalized}`;
};
