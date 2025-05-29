import { atomWithStorage } from 'jotai/utils';
import { slug } from './utils';
import { generateEntityId } from './utils/ids';

export interface NodeDef {
  kind: string;
  labelProp: string;
  defaultStyle?: any;
  allowedOut?: string[];
  attributes?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'enum';
    label: string;
    default?: any;
    options?: string[]; // For enum type
  }>;
}

export interface EdgeDef {
  from: string | string[];
  to: string | string[];
  /** true ⇒ add mirror edge automatically */
  symmetric?: boolean;
  directed?: boolean;          // keep for clarity; symmetric implies directed=false at runtime
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
      defaultStyle: { 'shape': 'ellipse', 'background-color': '#E74C3C' },
      attributes: {
        'role': { type: 'string', label: 'Role', default: '' },
        'alignment': { type: 'enum', label: 'Alignment', options: ['Good', 'Neutral', 'Evil'], default: 'Neutral' },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    this.registerNode('LOCATION', { 
      kind: 'LOCATION', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'hexagon', 'background-color': '#2FA84F' },
      attributes: {
        'description': { type: 'string', label: 'Description', default: '' },
        'type': { type: 'enum', label: 'Type', options: ['City', 'Dungeon', 'Wilderness', 'Building', 'Other'], default: 'City' }
      }
    });
    this.registerNode('CONCEPT', { 
      kind: 'CONCEPT', 
      labelProp: 'title', 
      defaultStyle: { 'shape': 'diamond', 'background-color': '#3498DB' } 
    });
    
    // Register TRIPLE node
    this.registerNode('TRIPLE', {
      kind: 'TRIPLE',
      labelProp: 'predicate',
      defaultStyle: { shape: 'rectangle', 'background-color': '#7C5BF1' }
    });
    
    // Register new story-specific entity types
    this.registerNode('SCENE', {
      kind: 'SCENE',
      labelProp: 'title',
      defaultStyle: { shape: 'roundrectangle', 'background-color': '#9B59B6' },
      attributes: {
        'mood': { type: 'enum', label: 'Mood', options: ['Tense', 'Calm', 'Mysterious', 'Joyful', 'Sad'], default: 'Calm' },
        'time': { type: 'string', label: 'Time', default: '' },
        'weather': { type: 'enum', label: 'Weather', options: ['Clear', 'Rainy', 'Stormy', 'Foggy', 'Snowy'], default: 'Clear' },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    
    this.registerNode('FACTION', {
      kind: 'FACTION',
      labelProp: 'title',
      defaultStyle: { shape: 'pentagon', 'background-color': '#F39C12' },
      attributes: {
        'alignment': { type: 'enum', label: 'Alignment', options: ['Good', 'Neutral', 'Evil'], default: 'Neutral' },
        'power': { type: 'number', label: 'Power (1-10)', default: 5 },
        'territory': { type: 'string', label: 'Territory', default: '' },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    
    this.registerNode('ITEM', {
      kind: 'ITEM',
      labelProp: 'title',
      defaultStyle: { shape: 'triangle', 'background-color': '#1ABC9C' },
      attributes: {
        'rarity': { type: 'enum', label: 'Rarity', options: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'], default: 'Common' },
        'power': { type: 'number', label: 'Power (1-10)', default: 1 },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    
    this.registerNode('NPC', {
      kind: 'NPC',
      labelProp: 'title',
      defaultStyle: { shape: 'ellipse', 'background-color': '#F1C40F' },
      attributes: {
        'role': { type: 'string', label: 'Role', default: '' },
        'motivation': { type: 'string', label: 'Motivation', default: '' },
        'alignment': { type: 'enum', label: 'Alignment', options: ['Good', 'Neutral', 'Evil'], default: 'Neutral' },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    
    this.registerNode('EVENT', {
      kind: 'EVENT',
      labelProp: 'title',
      defaultStyle: { shape: 'star', 'background-color': '#E67E22' },
      attributes: {
        'date': { type: 'string', label: 'Date/Time', default: '' },
        'impact': { type: 'enum', label: 'Impact', options: ['Minor', 'Moderate', 'Major', 'Catastrophic'], default: 'Moderate' },
        'description': { type: 'string', label: 'Description', default: '' }
      }
    });
    
    // Register built-in edge types (remove automatic RELATED_TO creation)
    this.registerEdge('HAS_TAG', { from: 'NOTE', to: 'TAG', directed: true });
    this.registerEdge('MENTIONS', { from: 'NOTE', to: 'MENTION', directed: true });
    this.registerEdge('CONTAINS', { from: 'FOLDER', to: ['NOTE', 'FOLDER'], directed: true });
    this.registerEdge('LINKS_TO', { from: 'NOTE', to: 'NOTE', directed: true });
    this.registerEdge('REFERS_TO', { from: 'NOTE', to: '*', directed: true });
    this.registerEdge('ALLY_OF', { 
      from: 'CHARACTER', 
      to: 'CHARACTER', 
      directed: false,
      symmetric: true,
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
    
    // Keep RELATED_TO for explicit relationships only
    this.registerEdge('RELATED_TO', { from: '*', to: '*', directed: false });
    
    // Example reflexive predicate
    this.registerEdge('IDENTICAL_TO', {
      from: '*',
      to: '*',
      directed: false,
      symmetric: true,
      defaultStyle: { 'line-color': '#F1C40F', 'width': 2, 'line-style':'dashed' }
    });
    
    // Register reification edges
    this.registerEdge('SUBJECT_OF', { from: '*', to: 'TRIPLE', directed: true });
    this.registerEdge('OBJECT_OF', { from: '*', to: 'TRIPLE', directed: true });
    
    // Register provenance edge
    this.registerEdge('MENTIONED_IN', { from: '*', to: 'NOTE', directed: true });
    
    // Register new story-specific relationships
    this.registerEdge('PART_OF', {
      from: ['CHARACTER', 'NPC'],
      to: 'FACTION',
      directed: true,
      defaultStyle: { 'line-color': '#F39C12', 'width': 2 }
    });
    
    this.registerEdge('OCCURS_IN', {
      from: ['EVENT', 'SCENE'],
      to: 'LOCATION',
      directed: true,
      defaultStyle: { 'line-color': '#9B59B6', 'width': 2 }
    });
    
    this.registerEdge('PARTICIPATES_IN', {
      from: ['CHARACTER', 'NPC'],
      to: ['EVENT', 'SCENE'],
      directed: true,
      defaultStyle: { 'line-color': '#E67E22', 'width': 2 }
    });
    
    this.registerEdge('OWNS', {
      from: ['CHARACTER', 'NPC', 'FACTION'],
      to: 'ITEM',
      directed: true,
      defaultStyle: { 'line-color': '#1ABC9C', 'width': 2 }
    });
    
    this.registerEdge('PRECEDES', {
      from: ['EVENT', 'SCENE'],
      to: ['EVENT', 'SCENE'],
      directed: true,
      defaultStyle: { 'line-color': '#34495E', 'width': 2, 'line-style': 'dashed' }
    });
    
    this.registerEdge('FOLLOWS', {
      from: ['EVENT', 'SCENE'],
      to: ['EVENT', 'SCENE'],
      directed: true,
      defaultStyle: { 'line-color': '#34495E', 'width': 2, 'line-style': 'dotted' }
    });
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

// Use the canonical generateEntityId from utils/ids.ts
export { generateEntityId } from './utils/ids';

// Helper to check if two entity types are compatible for an edge
export function areTypesCompatible(edgeDef: EdgeDef, sourceKind: string, targetKind: string): boolean {
  const fromTypes = Array.isArray(edgeDef.from) ? edgeDef.from : [edgeDef.from];
  const toTypes = Array.isArray(edgeDef.to) ? edgeDef.to : [edgeDef.to];
  
  const sourceCompatible = fromTypes.includes('*') || fromTypes.includes(sourceKind);
  const targetCompatible = toTypes.includes('*') || toTypes.includes(targetKind);
  
  return sourceCompatible && targetCompatible;
}
