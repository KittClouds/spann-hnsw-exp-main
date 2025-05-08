
import { v4 as uuidv4 } from 'uuid';

// Type definitions for our different ID types
export type NoteId = `note-${string}`;
export type ClusterId = `cluster-${string}`;
export type NodeId = `node-${string}`;
export type TripleId = `triple-${string}`;  
export type DocumentId = `doc-${string}`;   // New: Document ID type
export type RelationshipId = `rel-${string}`; // New: Relationship ID type

// Helper to ensure type safety for ID generators
const prefixUuid = (prefix: string): string => 
  `${prefix}-${uuidv4()}`;

// Generate IDs for different entities
export const generateNoteId = (): NoteId => 
  prefixUuid('note') as NoteId;

export const generateClusterId = (): ClusterId => 
  prefixUuid('cluster') as ClusterId;

export const generateNodeId = (): NodeId => 
  prefixUuid('node') as NodeId;

export const generateTripleId = (): TripleId =>
  prefixUuid('triple') as TripleId;

export const generateDocumentId = (): DocumentId => 
  prefixUuid('doc') as DocumentId;

export const generateRelationshipId = (): RelationshipId => 
  prefixUuid('rel') as RelationshipId;

// Helper to validate ID formats
export const isValidId = (id: string, type: 'note' | 'cluster' | 'node' | 'triple' | 'doc' | 'rel'): boolean => {
  const prefix = `${type}-`;
  return id.startsWith(prefix) && id.length > prefix.length;
};
