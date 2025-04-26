
import { ElementDefinition, SingularElementArgument, ElementGroup } from 'cytoscape';
import { slug } from '@/lib/utils';
import { ClusterId, NodeId, generateNodeId } from '@/lib/utils/ids';
import { NodeType, EdgeType } from './types';

/**
 * Check if an edge exists between two nodes with a specific type
 */
export const edgeExists = (
  cy: cytoscape.Core, 
  srcId: string, 
  tgtId: string, 
  label: EdgeType
): boolean => {
  const src = cy.getElementById(srcId);
  if (src.empty()) return false;

  return !src
    .connectedEdges(`[label = "${label}"][target = "${tgtId}"]`)
    .empty();
};

/**
 * Create an element definition for a note node
 */
export const createNoteElementDef = (
  nodeId: string, 
  title: string,
  content: any[] = [],
  createdAt?: string,
  updatedAt?: string,
  parentId?: string | null,
  clusterId?: string | null,
  path?: string
): ElementDefinition => {
  const now = new Date().toISOString();
  const slugTitle = slug(title);

  return {
    group: 'nodes' as ElementGroup,
    data: {
      id: nodeId,
      type: NodeType.NOTE,
      title,
      slugTitle,
      content,
      path: path || '/',
      createdAt: createdAt || now,
      updatedAt: updatedAt || now,
      parent: parentId,
      folderId: parentId,
      clusterId: clusterId || undefined
    }
  };
};

/**
 * Create an element definition for a cluster node
 */
export const createClusterElementDef = (
  clusterId: ClusterId, 
  title: string,
  createdAt?: string,
  updatedAt?: string
): ElementDefinition => {
  const now = new Date().toISOString();
  
  return {
    group: 'nodes' as ElementGroup,
    data: {
      id: clusterId,
      type: NodeType.CLUSTER,
      title,
      createdAt: createdAt || now,
      updatedAt: updatedAt || now
    }
  };
};

/**
 * Create an element definition for an edge
 */
export const createEdgeElementDef = (
  sourceId: string,
  targetId: string,
  edgeType: EdgeType
): ElementDefinition => {
  return {
    group: 'edges' as ElementGroup,
    data: {
      id: `${edgeType}_${sourceId}_${targetId}`,
      source: sourceId,
      target: targetId,
      label: edgeType
    }
  };
};

/**
 * Get current date in ISO format
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Convert a collection to an array of element definitions
 */
export const collectionToElementDefinitions = (
  collection: cytoscape.Collection
): ElementDefinition[] => {
  return collection.map(ele => ele.json()).toArray() as ElementDefinition[];
};
