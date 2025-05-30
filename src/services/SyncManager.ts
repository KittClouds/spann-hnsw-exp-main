import { graphService } from './GraphService';
import { Note, Cluster } from '@/lib/store';
import { NodeType, Thread, ThreadMessage } from './types';
import { CrossNoteGraphSyncWorker } from './CrossNoteGraphSyncWorker';

/**
 * SyncManager service provides bidirectional synchronization between the store (jotai atoms)
 * and the graph service (cytoscape).
 */
export class SyncManager {
  private crossNoteWorker: CrossNoteGraphSyncWorker;

  constructor() {
    // Initialize the cross-note sync worker
    this.crossNoteWorker = new CrossNoteGraphSyncWorker(graphService);
  }

  /**
   * Starts the cross-note relationship sync worker
   */
  public startCrossNoteSync(): void {
    this.crossNoteWorker.start();
  }

  /**
   * Stops the cross-note relationship sync worker
   */
  public stopCrossNoteSync(): void {
    this.crossNoteWorker.stop();
  }

  /**
   * Triggers an update of cross-note relationships in the graph
   */
  public updateCrossNoteRelationships(): void {
    this.crossNoteWorker.triggerUpdate();
  }

  /**
   * Synchronizes data from the store to the graph
   * @param notes Notes from the store
   * @param clusters Clusters from the store
   */
  public importFromStore(notes: Note[], clusters: Cluster[]): void {
    graphService.importFromStore(notes, clusters);
  }
  
  /**
   * Exports data from the graph to a format compatible with the store
   * @returns Object containing notes and clusters arrays
   */
  public exportToStore(): { notes: Note[], clusters: Cluster[] } {
    return graphService.exportToStore();
  }
  
  /**
   * Adds a note to the graph
   * @param note Note to add
   * @param parentId Optional parent ID
   * @param clusterId Optional cluster ID
   * @returns The ID of the added note
   */
  public addNoteToGraph(note: Partial<Note>, parentId: string | null = null, clusterId: string | null = null): string {
    const node = graphService.addNote({
      id: note.id,
      title: note.title || 'Untitled Note',
      content: note.content || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }, parentId || undefined, clusterId || undefined);
    
    return node.id();
  }
  
  /**
   * Updates a note in the graph
   * @param noteId ID of the note to update
   * @param updates Partial note updates
   * @returns Whether the update was successful
   */
  public updateNoteInGraph(noteId: string, updates: Partial<Note>): boolean {
    return graphService.updateNote(noteId, updates);
  }
  
  /**
   * Deletes a note from the graph
   * @param noteId ID of the note to delete
   * @returns Whether the deletion was successful
   */
  public deleteNoteFromGraph(noteId: string): boolean {
    return graphService.deleteNote(noteId);
  }
  
  /**
   * Adds a cluster to the graph
   * @param cluster Cluster to add
   * @returns The ID of the added cluster
   */
  public addClusterToGraph(cluster: Partial<Cluster>): string {
    const node = graphService.addCluster({
      id: cluster.id,
      title: cluster.title || 'Untitled Cluster',
      createdAt: cluster.createdAt,
      updatedAt: cluster.updatedAt,
    });
    
    return node.id();
  }
  
  /**
   * Updates a cluster in the graph
   * @param clusterId ID of the cluster to update
   * @param updates Partial cluster updates
   * @returns Whether the update was successful
   */
  public updateClusterInGraph(clusterId: string, updates: Partial<Cluster>): boolean {
    return graphService.updateCluster(clusterId, updates);
  }
  
  /**
   * Deletes a cluster from the graph
   * @param clusterId ID of the cluster to delete
   * @returns Whether the deletion was successful
   */
  public deleteClusterFromGraph(clusterId: string): boolean {
    return graphService.deleteCluster(clusterId);
  }
  
  /**
   * Moves a note to a different parent or cluster
   * @param noteId ID of the note to move
   * @param newParentId New parent ID (optional)
   * @param newClusterId New cluster ID (optional)
   * @returns Whether the move was successful
   */
  public moveNoteInGraph(noteId: string, newParentId?: string | null, newClusterId?: string | null): boolean {
    let success = true;
    
    if (newParentId !== undefined) {
      success = graphService.moveNode(noteId, newParentId);
    }
    
    if (success && newClusterId !== undefined) {
      success = graphService.moveNodeToCluster(noteId, newClusterId || undefined);
    }
    
    return success;
  }
  
  /**
   * Checks if a node exists in the graph
   * @param nodeId ID of the node to check
   * @returns Whether the node exists
   */
  public nodeExists(nodeId: string): boolean {
    return !graphService.getGraph().getElementById(nodeId).empty();
  }
  
  /**
   * Gets all nodes of a specific type from the graph
   * @param type Node type to retrieve
   * @returns Array of node data
   */
  public getNodesByType(type: NodeType): any[] {
    return graphService.getNodesByType(type).map(node => node.data());
  }
  
  /**
   * Adds a thread to the graph
   * @param thread Thread to add
   * @returns ID of the added thread node
   */
  public addThreadToGraph(thread: Thread): string {
    return graphService.addThread(thread).id();
  }

  /**
   * Adds a thread message to the graph
   * @param msg ThreadMessage to add
   * @returns ID of the added message node
   */
  public addThreadMessageToGraph(msg: ThreadMessage): string {
    return graphService.addThreadMessage(msg).id();
  }

  /**
   * Updates a thread message in the graph
   * @param id ID of the message to update
   * @param updates Partial message updates
   * @returns Whether the update was successful
   */
  public updateThreadMessageInGraph(id: string, updates: Partial<ThreadMessage>): boolean {
    return graphService.updateThreadMessage(id, updates);
  }

  /**
   * Deletes a thread message from the graph
   * @param id ID of the message to delete
   * @returns Whether the deletion was successful
   */
  public deleteThreadMessageFromGraph(id: string): boolean {
    return graphService.deleteThreadMessage(id);
  }
}

export const syncManager = new SyncManager();
export default syncManager;
