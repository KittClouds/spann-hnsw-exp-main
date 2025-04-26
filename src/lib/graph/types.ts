
import { Core, CollectionReturnValue, LayoutOptions, ElementDefinition, NodeCollection, Position } from 'cytoscape';
import { Note, Cluster } from '../store';

// Basic types for graph elements
export type NodeType = 'note' | 'folder' | 'tag' | 'cluster';
export type EdgeType = 'child' | 'reference' | 'tag';

// Graph metadata for imports/exports 
export interface GraphMeta {
    version: string;
    created: string;
    updated: string;
}

// Graph element data structure
export interface GraphElementData {
    id: string;
    type: NodeType | EdgeType;
    label?: string;
    [key: string]: any; // Allow for flexible data attributes
}

// Edge specific type
export interface Edge extends GraphElementData {
    type: EdgeType;
    source: string;
    target: string;
}

// Tag specific type 
export interface Tag extends GraphElementData {
    type: 'tag';
    name: string;
}

// Graph JSON format for import/export
export interface CyElementJSON {
    data: GraphElementData;
    position?: Position;
    group?: 'nodes' | 'edges';
}

export interface GraphJSON {
    elements: CyElementJSON[];
    meta?: GraphMeta;
    style?: any[]; // Style is flexible
}

// Type for graph data structure
export interface GraphData {
    nodes: Note[];
    edges: Edge[];
    clusters: Cluster[];
    tags: Tag[];
}

// Type for change listeners
export type ChangeListener = (elements: ElementDefinition[]) => void;
