
import { Core } from 'cytoscape';
import { GraphService } from './GraphService';
import { crossNoteRelationService } from './CrossNoteRelationService';

/**
 * Debounced sync worker that updates the Cytoscape graph with cross-note relationships
 * Subscribes to LiveStore derived queries and updates CO_OCCURS edges and GLOBAL_TRIPLE nodes
 */
export class CrossNoteGraphSyncWorker {
  private graphService: GraphService;
  private cy: Core;
  private updateTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 300; // 300ms debounce
  private isActive = false;

  constructor(graphService: GraphService) {
    this.graphService = graphService;
    this.cy = graphService.getGraph();
  }

  /**
   * Starts the sync worker
   */
  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[CrossNoteGraphSyncWorker] Started');
  }

  /**
   * Stops the sync worker and cleans up
   */
  public stop(): void {
    this.isActive = false;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    console.log('[CrossNoteGraphSyncWorker] Stopped');
  }

  /**
   * Triggers a debounced update of the graph with cross-note relationships
   */
  public triggerUpdate(): void {
    if (!this.isActive) return;

    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Set new debounced timeout
    this.updateTimeout = setTimeout(() => {
      this.performUpdate();
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Performs the actual graph update with cross-note relationships
   */
  private performUpdate(): void {
    if (!this.isActive) return;

    console.log('[CrossNoteGraphSyncWorker] Performing cross-note graph update');

    this.cy.startBatch();
    
    try {
      // Update co-occurrence edges
      this.updateCoOccurrenceEdges();
      
      // Update global triple nodes
      this.updateGlobalTripleNodes();
      
    } catch (error) {
      console.error('[CrossNoteGraphSyncWorker] Error during graph update:', error);
    } finally {
      this.cy.endBatch();
    }
  }

  /**
   * Updates CO_OCCURS edges in the graph
   */
  private updateCoOccurrenceEdges(): void {
    const coOccurrences = crossNoteRelationService.getAllCoOccurrences();
    
    // Remove existing CO_OCCURS edges
    this.cy.edges(`[label = "CO_OCCURS"]`).remove();
    
    // Add updated CO_OCCURS edges
    coOccurrences.forEach(coOcc => {
      const entity1Id = `${coOcc.entity1.kind}::${coOcc.entity1.label}`;
      const entity2Id = `${coOcc.entity2.kind}::${coOcc.entity2.label}`;
      
      this.graphService.upsertCoOccurEdge(entity1Id, entity2Id, {
        count: coOcc.count,
        noteIds: Array.from(coOcc.noteIds) // Convert Set to Array
      });
    });
  }

  /**
   * Updates GLOBAL_TRIPLE nodes in the graph
   */
  private updateGlobalTripleNodes(): void {
    const globalTriples = crossNoteRelationService.getAllGlobalTriples();
    
    // Remove existing GLOBAL_TRIPLE nodes and their edges
    this.cy.nodes(`[type = "GLOBAL_TRIPLE"]`).remove();
    
    // Add updated GLOBAL_TRIPLE nodes
    globalTriples.forEach(triple => {
      const tripleHash = `${triple.subject.kind}:${triple.subject.label}:${triple.predicate}:${triple.object.kind}:${triple.object.label}`;
      
      this.graphService.upsertGlobalTripleNode(tripleHash, {
        subject: triple.subject,
        predicate: triple.predicate,
        object: triple.object,
        noteIds: Array.from(triple.noteIds) // Convert Set to Array
      });
    });
  }
}

// Export singleton instance
export const crossNoteGraphSyncWorker = new CrossNoteGraphSyncWorker(
  // We'll inject the graph service when initializing
  null as any
);
