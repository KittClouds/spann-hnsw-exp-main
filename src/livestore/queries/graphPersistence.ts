
import { queryDb, computed } from '@livestore/livestore';
import { tables } from '../schema';

/**
 * Reactive queries for graph persistence data
 */

// Graph nodes queries
export const graphNodes$ = queryDb(
  tables.graphNodes.orderBy('createdAt', 'desc'),
  { label: 'graphNodes$' }
);

export const graphNodesByCluster$ = (clusterId: string) => queryDb(
  tables.graphNodes.where({ clusterId }).orderBy('createdAt', 'desc'),
  { label: `graphNodesByCluster$_${clusterId}`, deps: [clusterId] }
);

export const graphNodesByType$ = (nodeType: string) => queryDb(
  tables.graphNodes.where({ nodeType }).orderBy('createdAt', 'desc'),
  { label: `graphNodesByType$_${nodeType}`, deps: [nodeType] }
);

// Graph edges queries
export const graphEdges$ = queryDb(
  tables.graphEdges.orderBy('createdAt', 'desc'),
  { label: 'graphEdges$' }
);

export const graphEdgesByType$ = (edgeType: string) => queryDb(
  tables.graphEdges.where({ edgeType }).orderBy('createdAt', 'desc'),
  { label: `graphEdgesByType$_${edgeType}`, deps: [edgeType] }
);

export const nodeEdges$ = (nodeId: string) => queryDb((get) => {
  // Get all edges where this node is either source or target
  const outgoing = get(queryDb(tables.graphEdges.where({ sourceId: nodeId })));
  const incoming = get(queryDb(tables.graphEdges.where({ targetId: nodeId })));
  return [...outgoing, ...incoming];
}, { label: `nodeEdges$_${nodeId}`, deps: [nodeId] });

// Graph layouts queries
export const graphLayouts$ = queryDb(
  tables.graphLayouts.orderBy('createdAt', 'desc'),
  { label: 'graphLayouts$' }
);

export const defaultLayout$ = queryDb(
  tables.graphLayouts.where({ isDefault: true }).first(),
  { label: 'defaultLayout$' }
);

export const clusterLayouts$ = (clusterId: string) => queryDb(
  tables.graphLayouts.where({ clusterId }).orderBy('createdAt', 'desc'),
  { label: `clusterLayouts$_${clusterId}`, deps: [clusterId] }
);

// Computed graph statistics
export const graphStats$ = computed((get) => {
  const nodes = get(graphNodes$);
  const edges = get(graphEdges$);
  
  const nodeTypes = new Map<string, number>();
  const edgeTypes = new Map<string, number>();
  
  nodes.forEach(node => {
    nodeTypes.set(node.nodeType, (nodeTypes.get(node.nodeType) || 0) + 1);
  });
  
  edges.forEach(edge => {
    edgeTypes.set(edge.edgeType, (edgeTypes.get(edge.edgeType) || 0) + 1);
  });
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeTypes: Object.fromEntries(nodeTypes),
    edgeTypes: Object.fromEntries(edgeTypes),
    avgDegree: edges.length > 0 ? (edges.length * 2) / nodes.length : 0
  };
}, { label: 'graphStats$' });

// Graph connectivity queries
export const connectedComponents$ = computed((get) => {
  const nodes = get(graphNodes$);
  const edges = get(graphEdges$);
  
  // Simple connected components calculation
  const adjacency = new Map<string, Set<string>>();
  
  // Initialize adjacency list
  nodes.forEach(node => {
    adjacency.set(node.id, new Set());
  });
  
  // Add edges to adjacency list
  edges.forEach(edge => {
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
  });
  
  // Find connected components using DFS
  const visited = new Set<string>();
  const components: string[][] = [];
  
  const dfs = (nodeId: string, component: string[]) => {
    visited.add(nodeId);
    component.push(nodeId);
    
    adjacency.get(nodeId)?.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    });
  };
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component: string[] = [];
      dfs(node.id, component);
      components.push(component);
    }
  });
  
  return {
    count: components.length,
    components,
    largestSize: Math.max(...components.map(c => c.length), 0)
  };
}, { label: 'connectedComponents$' });

// Entity-specific graph queries
export const entityGraphNodes$ = computed((get) => {
  const nodes = get(graphNodes$);
  return nodes.filter(node => node.entityKind && node.entityLabel);
}, { label: 'entityGraphNodes$' });

export const entityRelationships$ = (entityKind: string, entityLabel: string) => computed((get) => {
  const allEdges = get(graphEdges$);
  const allNodes = get(graphNodes$);
  
  // Find the entity node
  const entityNode = allNodes.find(node => 
    node.entityKind === entityKind && node.entityLabel === entityLabel
  );
  
  if (!entityNode) return [];
  
  // Find all edges connected to this entity
  return allEdges.filter(edge => 
    edge.sourceId === entityNode.id || edge.targetId === entityNode.id
  );
}, { 
  label: `entityRelationships$_${entityKind}_${entityLabel}`, 
  deps: [entityKind, entityLabel] 
});
