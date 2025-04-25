
import {
  Core,
  NodeSingular,
  NodeCollection,
  ElementDefinition,
  SingularElementArgument
} from 'cytoscape';
import { Note, Cluster } from '@/lib/store';
import { NodeType, EdgeType, GraphJSON, CyElementJSON } from './GraphService';

/**
 * Interface defining the public API for graph operations
 */
export interface GraphAPI {
  // == Undo/Redo ==
  /** Undoes the last graph operation. */
  undo(): void;
  /** Redoes the last undone graph operation. */
  redo(): void;

  // == Listeners ==
  /**
   * Adds a listener function that will be called when graph elements change.
   * The listener receives an array of element definitions representing the changes.
   * @param listener - The function to call on changes.
   */
  addChangeListener(listener: (elements: ElementDefinition[]) => void): void;
  
  /**
   * Removes a previously added change listener.
   * @param listener - The listener function to remove.
   */
  removeChangeListener(listener: (elements: ElementDefinition[]) => void): void;

  // == Graph Access ==
  /**
   * Gets the underlying Cytoscape Core instance.
   * Note: Direct manipulation might bypass undo/redo and change tracking.
   * @returns The Cytoscape Core instance.
   */
  getGraph(): Core;

  // == Import/Export ==
  /**
   * Exports the entire graph structure, optionally including style and layout.
   * @param opts - Optional configuration for export.
   * @param opts.includeStyle - Whether to include the stylesheet JSON.
   * @returns A GraphJSON object representing the current graph state.
   */
  exportGraph(opts?: { includeStyle?: boolean }): GraphJSON;
  
  /**
   * Imports graph data from a GraphJSON object, replacing the current graph.
   * @param g - The GraphJSON object to import.
   */
  importGraph(g: GraphJSON): void;
  
  /**
   * Exports a single graph element (node or edge) to its JSON definition.
   * @param ele - The Cytoscape element (NodeSingular or EdgeSingular) to export.
   * @returns The JSON definition of the element.
   */
  exportElement(ele: SingularElementArgument): CyElementJSON;
  
  /**
   * Imports or updates a single element from its JSON definition.
   * If an element with the same ID exists, it's updated; otherwise, it's added.
   * @param json - The JSON definition of the element to import/update.
   */
  importElement(json: CyElementJSON): void;
  
  /**
   * Removes all elements from the graph and re-initializes root nodes.
   */
  clearGraph(): void;

  // == Element Retrieval ==
  /**
   * Retrieves all nodes of a specific type.
   * @param type - The NodeType to filter by.
   * @returns A Cytoscape NodeCollection containing matching nodes.
   */
  getNodesByType(type: NodeType): NodeCollection;
  
  /**
   * Searches for nodes by title, optionally filtered by type.
   * @param query - The search string (will match partial titles).
   * @param types - An array of NodeTypes to include in the search.
   * @returns A Cytoscape NodeCollection containing matching nodes.
   */
  searchNodes(query: string, types: NodeType[]): NodeCollection;
  
  /**
   * Gets nodes directly connected to the given node (its neighbors).
   * @param nodeId - The ID of the node.
   * @returns A Cytoscape NodeCollection containing the node and its neighbors.
   */
  getRelatedNodes(nodeId: string): NodeCollection;
  
  /**
   * Finds nodes that have an edge pointing *to* the specified node.
   * @param nodeId - The ID of the target node.
   * @returns An array of objects representing the source nodes (backlinks).
   */
  getBacklinks(nodeId: string): Array<{ id: string; title?: string; type?: NodeType }>;
  
  /**
   * Gets connections (tags, concepts, mentions) associated with a node.
   * @param nodeId - The ID of the node.
   * @returns An object containing arrays of connected elements categorized by type.
   */
  getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', Array<{ id: string; title?: string; type?: NodeType }>>;

  // == Note Operations ==
  /**
   * Adds a new Note node to the graph.
   * @param options - Details of the note to add.
   * @param folderId - Optional ID of the parent folder (for compound nodes or custom relationships).
   * @param clusterId - Optional ID of the cluster the note initially belongs to.
   * @returns The newly created Cytoscape NodeSingular representing the note.
   */
  addNote(options: {
    id?: string;
    title: string;
    content?: any[]; // Define more specific type if possible
    createdAt?: string;
    updatedAt?: string;
    path?: string;
  }, folderId?: string, clusterId?: string): NodeSingular;
  
  /**
   * Updates the data of an existing Note node.
   * @param id - The ID of the note to update.
   * @param updates - An object containing the properties to update.
   * @returns True if the update was successful, false otherwise.
   */
  updateNote(id: string, updates: Partial<Note>): boolean;
  
  /**
   * Deletes a Note node and its connected edges from the graph.
   * @param id - The ID of the note to delete.
   * @returns True if the deletion was successful, false otherwise.
   */
  deleteNote(id: string): boolean;
  
  /**
   * Adds a tag to a note. Creates the tag node if it doesn't exist.
   * @param noteId - The ID of the note to tag.
   * @param tagName - The name of the tag (will be slugified for ID).
   * @returns True if the tagging was successful, false otherwise.
   */
  tagNote(noteId: string, tagName: string): boolean;

  // == Cluster Operations ==
  /**
   * Adds a new Cluster node to the graph.
   * @param options - Optional initial data for the cluster.
   * @returns The newly created Cytoscape NodeSingular representing the cluster.
   */
  addCluster(options?: Partial<Cluster>): NodeSingular;
  
  /**
   * Updates the data of an existing Cluster node.
   * @param id - The ID of the cluster to update.
   * @param updates - An object containing the properties to update.
   * @returns True if the update was successful, false otherwise.
   */
  updateCluster(id: string, updates: Partial<Cluster>): boolean;
  
  /**
   * Deletes a Cluster node. Nodes previously in this cluster will have their clusterId removed.
   * Edges connecting members *to* this cluster will also be removed.
   * @param id - The ID of the cluster to delete.
   * @returns True if the deletion was successful, false otherwise.
   */
  deleteCluster(id: string): boolean;
  
  /**
   * Moves a node into or out of a cluster by updating its 'clusterId' data
   * and managing the IN_CLUSTER edge.
   * @param nodeId - The ID of the node to move.
   * @param clusterId - The ID of the target cluster, or undefined/null to remove from any cluster.
   * @returns True if the move was successful, false otherwise.
   */
  moveNodeToCluster(nodeId: string, clusterId?: string | null): boolean;

  // == Hierarchy/Structure Operations ==
  /**
   * Moves a node to be a child of a different parent node (for compound graphs).
   * @param nodeId - The ID of the node to move.
   * @param newParentId - The ID of the new parent node, or null/undefined to move to the root.
   * @returns True if the move was successful, false otherwise.
   */
  moveNode(nodeId: string, newParentId?: string | null): boolean;

  // == Store Synchronization ==
  /**
   * Populates the graph from arrays of Note and Cluster objects (e.g., from a database/store).
   * Replaces the current graph content.
   * @param notes - An array of Note objects.
   * @param clusters - An array of Cluster objects.
   */
  importFromStore(notes: Note[], clusters: Cluster[]): void;
  
  /**
   * Exports the current graph nodes as arrays of Note and Cluster objects.
   * @returns An object containing arrays of notes and clusters.
   */
  exportToStore(): { notes: Note[]; clusters: Cluster[] };
}

// Export singleton instance of GraphService cast as GraphAPI for consumers
export { graphService as graphAPI } from './GraphService';
