
import { ElementDefinition } from 'cytoscape';

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

export interface CyElementJSON extends ElementDefinition {}

export interface GraphMeta {
  app: string;
  version: number;
  exportedAt: string;
}

export interface GraphJSON {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: any;
  style?: any[];
  viewport?: { zoom: number; pan: { x: number, y: number } };
  elements: CyElementJSON[];
}

export interface GraphElementData {
  id?: string;
  type?: NodeType | string;
  title?: string;
  [key: string]: any; // Allow arbitrary data
}

export interface GraphData {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: any;
  style?: any[];
  viewport?: { zoom: number; pan: { x: number, y: number } };
  elements: ElementDefinition[];
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: EdgeType | string;
  [key: string]: any;
}

export interface Tag {
  id: string;
  type: NodeType.TAG;
  title: string;
  [key: string]: any;
}

// Define the change listener type
export type ChangeListener = (changeType: 'add' | 'update' | 'remove', elements: ElementDefinition[]) => void;
