
import {
  Core,
  CollectionReturnValue,
  NodeSingular,
  EdgeSingular,
  NodeCollection,
  EdgeCollection,
  ElementDefinition,
  ElementGroup,
  ElementsDefinition,
  LayoutOptions,
  Position,
  SingularElementArgument,
  StylesheetCSS,
  CytoscapeOptions
} from 'cytoscape';
import { Note, Cluster } from '../store';
import { ClusterId, NoteId } from '../utils/ids';

// Node and edge types for the graph
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

// Element type for graph export/import
export interface CyElementJSON extends ElementDefinition {}

// Graph metadata for export/import
export interface GraphMeta {
  app: string;
  version: number;
  exportedAt: string;
}

// Complete graph JSON structure for export/import
export interface GraphJSON {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: LayoutOptions;
  style?: StylesheetCSS[];
  viewport?: { zoom: number; pan: Position };
  elements: CyElementJSON[];
}

// Type for change listeners
export type ChangeListener = (elements: ElementDefinition[], changeType?: string) => void;

// Connection types for getConnections method
export type ConnectionTypes = 'tag' | 'concept' | 'mention';
export type ConnectionsResult = Record<ConnectionTypes, any[]>;
