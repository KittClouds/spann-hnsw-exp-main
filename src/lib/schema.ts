
import { atomWithStorage } from 'jotai/utils';
import { v4 as uuidv4 } from 'uuid';
import { slug } from './utils';

export interface NodeDef {
  kind: string;
  labelProp: string;
  defaultStyle?: any;
  allowedOut?: string[];
}

export interface EdgeDef {
  from: string | string[];
  to: string | string[];
  directed?: boolean;
  defaultStyle?: any;
}

export interface SchemaDefinitions {
  nodes: Array<[string, NodeDef]>;
  edges: Array<[string, EdgeDef]>;
}

class SchemaRegistry {
  private nodes = new Map<string, NodeDef>();
  private edges = new Map<string, EdgeDef>();

  /** built-ins loaded at startup */
  constructor() {
    // Register built-in types
    this.registerNode('NOTE', { 
      kind: 'NOTE', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'rectangle' } 
    });
    this.registerNode('FOLDER', { 
      kind: 'FOLDER', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'roundrectangle' } 
    });
    this.registerNode('TAG', { 
      kind: 'TAG', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'round-rectangle', 'background-color': '#7C5BF1' } 
    });
    this.registerNode('MENTION', { 
      kind: 'MENTION', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'ellipse', 'background-color': '#F3BA2F' } 
    });
    this.registerNode('CHARACTER', { 
      kind: 'CHARACTER', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'ellipse', 'background-color': '#E74C3C' } 
    });
    this.registerNode('LOCATION', { 
      kind: 'LOCATION', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'hexagon', 'background-color': '#2FA84F' } 
    });
    this.registerNode('CONCEPT', { 
      kind: 'CONCEPT', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'diamond', 'background-color': '#3498DB' } 
    });
    
    // Register built-in edge types
    this.registerEdge('HAS_TAG', { from: 'NOTE', to: 'TAG', directed: true });
    this.registerEdge('MENTIONS', { from: 'NOTE', to: 'MENTION', directed: true });
    this.registerEdge('CONTAINS', { from: 'FOLDER', to: ['NOTE', 'FOLDER'], directed: true });
    this.registerEdge('LINKS_TO', { from: 'NOTE', to: 'NOTE', directed: true });
    this.registerEdge('REFERS_TO', { from: 'NOTE', to: '*', directed: true });
    this.registerEdge('ALLY_OF', { 
      from: 'CHARACTER', 
      to: 'CHARACTER', 
      directed: false,
      defaultStyle: { 'line-color': '#2ECC71', 'width': 3 }
    });
    this.registerEdge('ENEMY_OF', { 
      from: 'CHARACTER', 
      to: 'CHARACTER', 
      directed: false,
      defaultStyle: { 'line-color': '#E74C3C', 'width': 3 }
    });
    this.registerEdge('LOCATED_IN', { 
      from: ['CHARACTER', 'LOCATION'], 
      to: 'LOCATION', 
      directed: true,
      defaultStyle: { 'line-color': '#2FA84F' }
    });
    this.registerEdge('RELATED_TO', { from: '*', to: '*', directed: false });
  }

  /** public API */
  registerNode(kind: string, def: NodeDef) { 
    this.nodes.set(kind, def);
  }
  
  registerEdge(label: string, def: EdgeDef) { 
    this.edges.set(label, def);
  }
  
  getNodeDef(kind: string) { 
    return this.nodes.get(kind);
  }
  
  getEdgeDef(label: string) { 
    return this.edges.get(label); 
  }
  
  getAllNodeDefs() {
    return Array.from(this.nodes.entries());
  }
  
  getAllEdgeDefs() {
    return Array.from(this.edges.entries());
  }
  
  list(): SchemaDefinitions { 
    return { 
      nodes: Array.from(this.nodes.entries()), 
      edges: Array.from(this.edges.entries()) 
    };
  }

  // Load definitions from storage
  loadDefinitions(defs: SchemaDefinitions) {
    if (!defs) return;
    
    if (defs.nodes) {
      defs.nodes.forEach(([kind, def]) => this.registerNode(kind, def));
    }
    
    if (defs.edges) {
      defs.edges.forEach(([label, def]) => this.registerEdge(label, def));
    }
  }
}

// Create singleton instance
export const schema = new SchemaRegistry();

// Atom for persisting schema
export const schemaAtom = atomWithStorage<SchemaDefinitions>('galaxy-schema-defs', {
  nodes: [],
  edges: []
});

// Function to generate unique IDs for entities
export const generateEntityId = (kind: string, label: string): string => {
  const slugLabel = slug(label);
  return `${kind.toLowerCase()}-${slugLabel}-${uuidv4().substring(0, 8)}`;
};

// Helper to check if two entity types are compatible for an edge
export function areTypesCompatible(edgeDef: EdgeDef, sourceKind: string, targetKind: string): boolean {
  const fromTypes = Array.isArray(edgeDef.from) ? edgeDef.from : [edgeDef.from];
  const toTypes = Array.isArray(edgeDef.to) ? edgeDef.to : [edgeDef.to];
  
  const sourceCompatible = fromTypes.includes('*') || fromTypes.includes(sourceKind);
  const targetCompatible = toTypes.includes('*') || toTypes.includes(targetKind);
  
  return sourceCompatible && targetCompatible;
}
