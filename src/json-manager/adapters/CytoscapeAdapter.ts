
import { ElementDefinition } from 'cytoscape';
import { SerializationAdapter } from '../JSONManager';

export interface CytoscapeData {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
  metadata?: Record<string, any>;
}

/**
 * Cytoscape Graph JSON Serialization Adapter
 * Handles Cytoscape graph data serialization
 */
export class CytoscapeAdapter implements SerializationAdapter<CytoscapeData> {
  name = 'CytoscapeAdapter';
  version = '1.0.0';
  
  serialize(data: CytoscapeData): Record<string, any> {
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      metadata: data.metadata || {},
      nodeCount: (data.nodes || []).length,
      edgeCount: (data.edges || []).length,
      serializedAt: new Date().toISOString()
    };
  }
  
  deserialize(json: Record<string, any>): CytoscapeData {
    if (!json.nodes || !Array.isArray(json.nodes)) {
      throw new Error('Invalid Cytoscape data: missing or invalid nodes array');
    }
    
    if (!json.edges || !Array.isArray(json.edges)) {
      throw new Error('Invalid Cytoscape data: missing or invalid edges array');
    }
    
    return {
      nodes: json.nodes as ElementDefinition[],
      edges: json.edges as ElementDefinition[],
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
            }
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
      metadata: { type: 'object' }
    },
    required: ['nodes', 'edges']
  };
}

export const cytoscapeAdapter = new CytoscapeAdapter();
