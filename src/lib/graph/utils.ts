
import { v4 as uuidv4 } from 'uuid';

// Type definitions for our different ID types
export type NoteId = `note-${string}`;
export type ClusterId = `cluster-${string}`;
export type NodeId = `node-${string}`;

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

// Helper to validate ID formats
export const isValidId = (id: string, type: 'note' | 'cluster' | 'node'): boolean => {
  const prefix = `${type}-`;
  return id.startsWith(prefix) && id.length > prefix.length;
};
