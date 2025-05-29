
import { nanoid } from 'nanoid';

export type NoteId = string;
export type ClusterId = string;
export type TripleId = string;
export type NodeId = string;
export type EntityId = string;

export const generateNoteId = (): NoteId => `note_${nanoid()}`;
export const generateClusterId = (): ClusterId => `cluster_${nanoid()}`;
export const generateTripleId = (): TripleId => `triple_${nanoid()}`;
export const generateNodeId = (): NodeId => `node_${nanoid()}`;

// Generate a deterministic entity ID from kind and label
export const generateEntityId = (kind: string, label: string): EntityId => {
  // Create a deterministic ID by combining kind and label
  // This ensures the same entity always gets the same ID
  const normalized = `${kind.toUpperCase()}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  return `entity_${normalized}`;
};
