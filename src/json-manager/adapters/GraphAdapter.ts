
import { SerializationAdapter } from '../JSONManager';
import { ElementDefinition } from 'cytoscape';

export interface GraphData {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
  layouts: Array<{
    id: string;
    name: string;
    layoutType: string;
    viewport: { zoom: number; pan: { x: number; y: number } };
    nodePositions: Record<string, { x: number; y: number }>;
    isDefault: boolean;
    clusterId?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Graph Data JSON Serialization Adapter
 * Handles complete graph state serialization including layouts
 */
export class GraphAdapter implements SerializationAdapter<GraphData> {
  name = 'GraphAdapter';
  version = '1.0.0';
  
  serialize(data: GraphData): Record<string, any> {
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      layouts: data.layouts || [],
      metadata: data.metadata || {},
      nodeCount: (data.nodes || []).length,
      edgeCount: (data.edges || []).length,
      layoutCount: (data.layouts || []).length,
      serializedAt: new Date().toISOString(),
      _json_meta: {
        dataType: 'graph',
        version: this.version,
        compressed: false
      }
    };
  }
  
  deserialize(json: Record<string, any>): GraphData {
    if (!json.nodes || !Array.isArray(json.nodes)) {
      throw new Error('Invalid graph data: missing or invalid nodes array');
    }
    
    if (!json.edges || !Array.isArray(json.edges)) {
      throw new Error('Invalid graph data: missing or invalid edges array');
    }
    
    return {
      nodes: json.nodes as ElementDefinition[],
      edges: json.edges as ElementDefinition[],
      layouts: json.layouts || [],
      metadata: json.metadata || {}
    };
  }
  
  validate(json: Record<string, any>): boolean {
    if (!json.nodes || !Array.isArray(json.nodes)) {
      return false;
    }
    
    if (!json.edges || !Array.isArray(json.edges)) {
      return false;
    }
    
    // Validate node structure
    for (const node of json.nodes) {
      if (!node.data || typeof node.data.id !== 'string') {
        return false;
      }
    }
    
    // Validate edge structure
    for (const edge of json.edges) {
      if (!edge.data || 
          typeof edge.data.id !== 'string' ||
          typeof edge.data.source !== 'string' ||
          typeof edge.data.target !== 'string') {
        return false;
      }
    }
    
    // Validate layouts if present
    if (json.layouts && Array.isArray(json.layouts)) {
      for (const layout of json.layouts) {
        if (!layout.id || !layout.name || !layout.layoutType) {
          return false;
        }
      }
    }
    
    // Check for orphaned edges
    if (json.nodes && json.edges) {
      const nodeIds = new Set(json.nodes.map((n: any) => n.data.id));
      for (const edge of json.edges) {
        if (!nodeIds.has(edge.data.source)) {
          return false;
        }
        if (!nodeIds.has(edge.data.target)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  schema = {
    type: 'object',
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              },
              required: ['id']
            },
            position: { type: 'object' }
          },
          required: ['data']
        }
      },
      edges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                source: { type: 'string' },
                target: { type: 'string' }
              },
              required: ['id', 'source', 'target']
            }
          },
          required: ['data']
        }
      },
      layouts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            layoutType: { type: 'string' },
            viewport: { type: 'object' },
            nodePositions: { type: 'object' },
            isDefault: { type: 'boolean' }
          },
          required: ['id', 'name', 'layoutType']
        }
      },
      metadata: { type: 'object' }
    },
    required: ['nodes', 'edges']
  };
}

export const graphAdapter = new GraphAdapter();
