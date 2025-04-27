
import { Core, NodeSingular, EdgeSingular, NodeCollection, EdgeCollection, ElementDefinition as CytoscapeElementDefinition, Position, SingularElementArgument } from 'cytoscape';

export type ElementDefinition = CytoscapeElementDefinition;

export type GraphChangeCallback = (elements: ElementDefinition[]) => void;

export interface StoreFormat {
  notes: Note[];
  clusters: Cluster[];
}

export interface Note {
  id: string;
  title: string;
  content?: any[];
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  type: 'note' | 'folder';
  clusterId?: string | null;
  path?: string;
  tags?: string[];
  mentions?: string[];
  concepts?: Array<{ type: string; name: string }>;
}

export interface Cluster {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface IGraphService {
  // Initialization & Core Access
  initializeGraph(container: HTMLElement, elements?: ElementDefinition[]): void;
  getCy(): Core | null;

  // Undo/Redo
  undo(): void;
  redo(): void;
  isUndoable(): boolean;
  isRedoable(): boolean;

  // Change Events
  onGraphChange(callback: GraphChangeCallback): void;
  offGraphChange(callback: GraphChangeCallback): void;

  // Import/Export
  importGraph(data: GraphJSON): Promise<void>;
  exportGraph(): GraphJSON;
  exportStoreFormat(): Promise<StoreFormat>;

  // CRUD Operations - Notes
  addNote(note: Partial<Note>, position?: Position): Promise<NodeSingular>;
  updateNote(noteId: string, data: Partial<Note>): Promise<NodeSingular | null>;
  deleteNote(noteId: string): Promise<void>;
  getNoteById(noteId: string): NodeSingular | null;
  getNodeData(nodeId: string): Note | null;

  // CRUD Operations - Clusters
  addCluster(cluster: Partial<Cluster>, position?: Position): Promise<NodeSingular>;
  updateCluster(clusterId: string, data: Partial<Cluster>): Promise<NodeSingular | null>;
  deleteCluster(clusterId: string): Promise<void>;
  getClusterById(clusterId: string): NodeSingular | null;

  // Relationships & Traversal
  getRelatedNodes(nodeId: string): NodeCollection;
  getBacklinks(nodeId: string): NodeCollection;
  getForwardLinks(nodeId: string): NodeCollection;
  getConnections(nodeId: string): EdgeCollection;
  setParent(childId: string, parentId: string): Promise<EdgeSingular | null>;
  removeParent(childId: string): Promise<void>;
  addToCluster(noteId: string, clusterId: string): Promise<EdgeSingular | null>;
  removeFromCluster(noteId: string, clusterId: string): Promise<void>;
  addTag(noteId: string, tagId: string): Promise<EdgeSingular | null>;
  removeTag(noteId: string, tagId: string): Promise<void>;
  addLink(sourceId: string, targetId: string, data?: any): Promise<EdgeSingular | null>;
  removeLink(linkId: string): Promise<void>;
  getEdgeData(edgeId: string): any | null;

  // Search
  searchNotesByTitle(query: string): NodeCollection;

  // Graph State & View
  getGraphElements(): ElementDefinition[];
  layoutGraph(layoutName?: string, options?: any): void;
  centerGraph(): void;
  fitGraph(padding?: number): void;
  getNodePosition(nodeId: string): Position | null;
  setNodePosition(nodeId: string, position: Position): void;
  selectNodes(nodeIds: string[]): void;
  unselectNodes(): void;
  getSelectedNodes(): NodeCollection;
  zoomIn(level?: number): void;
  zoomOut(level?: number): void;
  resetZoom(): void;
  pan(position: Position): void;
}
