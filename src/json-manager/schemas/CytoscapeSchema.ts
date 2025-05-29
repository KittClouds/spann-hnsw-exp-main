
import { JSONSchemaDefinition } from './JSONSchemaRegistry';

export const cytoscapeSchemaV1: JSONSchemaDefinition = {
  id: 'cytoscape',
  version: '1.0.0',
  schema: {
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
      metadata: { type: 'object' },
      nodeCount: { type: 'number' },
      edgeCount: { type: 'number' },
      serializedAt: { type: 'string' },
      _json_meta: { type: 'object' }
    },
    required: ['nodes', 'edges']
  },
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.nodes || !Array.isArray(data.nodes)) {
      errors.push('Missing or invalid nodes array');
    } else {
      // Validate each node
      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];
        if (!node.data || !node.data.id) {
          errors.push(`Node at index ${i} missing required data.id`);
        }
      }
    }
    
    if (!data.edges || !Array.isArray(data.edges)) {
      errors.push('Missing or invalid edges array');
    } else {
      // Validate each edge
      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i];
        if (!edge.data || !edge.data.id || !edge.data.source || !edge.data.target) {
          errors.push(`Edge at index ${i} missing required data fields`);
        }
      }
    }
    
    // Check for orphaned edges
    if (data.nodes && data.edges) {
      const nodeIds = new Set(data.nodes.map((n: any) => n.data.id));
      for (const edge of data.edges) {
        if (!nodeIds.has(edge.data.source)) {
          errors.push(`Edge ${edge.data.id} references non-existent source node ${edge.data.source}`);
        }
        if (!nodeIds.has(edge.data.target)) {
          errors.push(`Edge ${edge.data.id} references non-existent target node ${edge.data.target}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  migrate: (data: any, fromVersion: string) => {
    // Future migration logic
    return data;
  }
};
