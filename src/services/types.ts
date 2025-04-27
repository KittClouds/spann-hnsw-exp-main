
import { Core, NodeSingular, EdgeSingular, NodeCollection, EdgeCollection, ElementDefinition as CytoscapeElementDefinition, Position, SingularElementArgument } from 'cytoscape';
import { Note, Cluster } from '@/lib/store';

export type ElementDefinition = CytoscapeElementDefinition;

export enum NodeType {
  NOTE = 'note',
  FOLDER = 'folder',
  TAG = 'tag',
  CONCEPT = 'concept',
  CLUSTER = 'cluster',
  STANDARD_ROOT = 'standard_root',
  CLUSTERS_ROOT = 'clusters_root',
  CLUSTER_DEFINITION = 'cluster_definition',
  CLUSTER_ROOT = 'cluster_root'
}

export enum EdgeType {
  CONTAINS = 'contains',
  NOTE_LINK = 'note_link',
  HAS_TAG = 'has_tag',
  MENTIONS = 'mentions',
  HAS_CONCEPT = 'has_concept',
  IN_CLUSTER = 'in_cluster'
}

export interface GraphMeta {
  app: string;
  version: number;
  exportedAt: string;
}

export interface GraphJSON {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  viewport?: { zoom: number; pan: Position };
  elements: ElementDefinition[];
}

export type GraphChangeEvent = {
  type: 'add' | 'update' | 'remove';
  elements: ElementDefinition[];
}

export type GraphChangeListener = (event: GraphChangeEvent) => void;

export interface IGraphService {
  // Core operations
  getGraph(): Core;
  undo(): void;
  redo(): void;
  clearGraph(): void;
  
  // Change notifications
  addChangeListener(listener: (elements: ElementDefinition[]) => void): void;
  removeChangeListener(listener: (elements: ElementDefinition[]) => void): void;

  // Import/Export
  exportGraph(): GraphJSON;
  importGraph(data: GraphJSON): void;
  exportElement(ele: SingularElementArgument): ElementDefinition;
  importElement(json: ElementDefinition): void;
  
  // Note operations
  addNote(params: { 
    id?: string;
    title: string;
    content?: any[];
    createdAt?: string;
    updatedAt?: string;
    path?: string;
  }, folderId?: string, clusterId?: string): NodeSingular;
  updateNote(id: string, updates: Partial<Note>): boolean;
  deleteNote(id: string): boolean;

  // Cluster operations
  addCluster(params: Partial<Cluster>): NodeSingular;
  updateCluster(id: string, updates: Partial<Cluster>): boolean;
  deleteCluster(id: string): boolean;
  moveNodeToCluster(nodeId: string, clusterId?: string): boolean;
  
  // Node operations
  moveNode(nodeId: string, newParentId?: string | null): boolean;
  getNodesByType(type: NodeType): NodeCollection;
  
  // Search and relations
  searchNodes(query: string, types: NodeType[]): NodeCollection;
  getRelatedNodes(nodeId: string): NodeCollection;
  getBacklinks(nodeId: string): any[];
  tagNote(noteId: string, tagName: string): boolean;
  getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]>;
  
  // Store operations
  importFromStore(notes: Note[], clusters: Cluster[]): void;
  exportToStore(): { notes: Note[]; clusters: Cluster[]; };
}
