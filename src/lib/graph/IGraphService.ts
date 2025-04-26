
import { 
  Core, 
  CollectionReturnValue, 
  NodeSingular, 
  EdgeSingular, 
  NodeCollection,
  ElementDefinition,
  CytoscapeOptions
} from 'cytoscape';
import { Note, Cluster } from '@/lib/store';
import { NodeType, CyElementJSON, GraphJSON, ChangeListener, ConnectionsResult } from './types';
import { ClusterId, NoteId } from '@/lib/utils/ids';

/**
 * Interface for the Graph Service
 */
export interface IGraphService {
  // Core functionality
  getGraph(): Core;
  clearGraph(): void;
  
  // Undo/Redo
  undo(): void;
  redo(): void;
  
  // Change management
  addChangeListener(listener: ChangeListener): void;
  removeChangeListener(listener: ChangeListener): void;
  
  // Import/Export
  exportGraph(opts?: { includeStyle?: boolean }): GraphJSON;
  importGraph(g: GraphJSON): void;
  exportElement(ele: ElementDefinition | CollectionReturnValue): CyElementJSON;
  importElement(json: CyElementJSON): void;
  
  // Store integration
  importFromStore(notes: Note[], clusters: Cluster[]): void;
  exportToStore(): { notes: Note[], clusters: Cluster[] };
  
  // Node operations
  addNote(noteData: Partial<Note> & { title: string }, folderId?: string, clusterId?: string): NodeSingular;
  updateNote(id: string, updates: Partial<Note>): boolean;
  deleteNote(id: string): boolean;
  
  // Cluster operations
  addCluster(clusterData: Partial<Cluster> & { title: string }): NodeSingular;
  updateCluster(id: string, updates: Partial<Cluster>): boolean;
  deleteCluster(id: string): boolean;
  moveNodeToCluster(nodeId: string, clusterId?: string): boolean;
  
  // Structure operations
  moveNode(nodeId: string, newParentId?: string | null): boolean | void;
  
  // Query operations
  getNodesByType(type: NodeType): NodeCollection;
  searchNodes(query: string, types: NodeType[]): NodeCollection;
  getRelatedNodes(nodeId: string): NodeCollection;
  getBacklinks(noteId: string): any[];
  
  // Tag operations
  tagNote(noteId: string, tagName: string): boolean;
  
  // Connection operations
  getConnections(nodeId: string): ConnectionsResult;
}
