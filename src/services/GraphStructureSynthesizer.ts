
import { graphService } from './GraphService';
import { 
  entityCoOccurrences$, 
  globalTriples$ 
} from '@/livestore/queries/derived';
import { Store } from '@livestore/livestore';

/**
 * GraphStructureSynthesizer
 * 
 * Subscribes to LiveStore derived queries and syncs computed cross-note 
 * relationships to the GraphService (Cytoscape instance).
 * 
 * This service bridges the gap between analysis (CrossNoteRelationService)
 * and visualization (GraphService) by adding derived structural elements
 * to the core graph model.
 */
export class GraphStructureSynthesizer {
  private debounceTimeout: NodeJS.Timeout | null = null;
  private readonly debounceMs = 500;
  private isSubscribed = false;
  private store: Store | null = null;
  
  /**
   * Initialize the synthesizer with a LiveStore instance
   */
  public initialize(store: Store): void {
    if (this.isSubscribed) {
      console.warn('[GraphStructureSynthesizer] Already initialized');
      return;
    }
    
    this.store = store;
    this.subscribeToQueries();
    this.isSubscribed = true;
    
    console.log('[GraphStructureSynthesizer] Initialized and subscribed to derived queries');
  }
  
  /**
   * Clean up subscriptions
   */
  public destroy(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    this.isSubscribed = false;
    this.store = null;
    
    console.log('[GraphStructureSynthesizer] Destroyed');
  }
  
  /**
   * Subscribe to LiveStore derived queries
   */
  private subscribeToQueries(): void {
    if (!this.store) {
      console.error('[GraphStructureSynthesizer] No store available for subscription');
      return;
    }
    
    // Subscribe to entity co-occurrences
    this.store.subscribe(entityCoOccurrences$, {
      onUpdate: () => {
        this.scheduleSync('co-occurrences');
      }
    });
    
    // Subscribe to global triples
    this.store.subscribe(globalTriples$, {
      onUpdate: () => {
        this.scheduleSync('global-triples');
      }
    });
  }
  
  /**
   * Schedule a debounced sync operation
   */
  private scheduleSync(reason: string): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.performSync(reason);
      this.debounceTimeout = null;
    }, this.debounceMs);
  }
  
  /**
   * Perform the actual sync operation
   */
  private performSync(reason: string): void {
    if (!this.store) {
      console.error('[GraphStructureSynthesizer] No store available for sync');
      return;
    }
    
    console.log(`[GraphStructureSynthesizer] Starting sync (reason: ${reason})`);
    
    try {
      // Start batch operation for performance
      graphService.startBatchOperations();
      
      // Sync co-occurrences
      this.syncCoOccurrences();
      
      // Sync global triples  
      this.syncGlobalTriples();
      
      // End batch operation
      graphService.endBatchOperations();
      
      console.log('[GraphStructureSynthesizer] Sync completed successfully');
      
    } catch (error) {
      console.error('[GraphStructureSynthesizer] Error during sync:', error);
      
      // Ensure we end the batch even if there's an error
      try {
        graphService.endBatchOperations();
      } catch (batchError) {
        console.error('[GraphStructureSynthesizer] Error ending batch operation:', batchError);
      }
    }
  }
  
  /**
   * Sync entity co-occurrences to the graph
   */
  private syncCoOccurrences(): void {
    if (!this.store) return;
    
    const coOccurrences = this.store.query(entityCoOccurrences$);
    
    coOccurrences.forEach((entityCoOccs, entityKey) => {
      entityCoOccs.forEach(coOcc => {
        const entity1Id = entityKey.replace('::', '_'); // Convert back to entity ID format
        const entity2Id = `${coOcc.entity.kind}_${coOcc.entity.label}`;
        
        graphService.upsertCoOccurrenceEdge(entity1Id, entity2Id, {
          count: coOcc.count,
          noteIds: new Set(coOcc.noteIds)
        });
      });
    });
  }
  
  /**
   * Sync global triples to the graph
   */
  private syncGlobalTriples(): void {
    if (!this.store) return;
    
    const globalTriples = this.store.query(globalTriples$);
    
    globalTriples.forEach(triple => {
      const canonicalKey = `${triple.subject.kind}_${triple.subject.label}_${triple.predicate}_${triple.object.kind}_${triple.object.label}`;
      
      graphService.upsertGlobalTripleNode(canonicalKey, {
        subject: triple.subject,
        predicate: triple.predicate,
        object: triple.object,
        noteIds: new Set(triple.noteIds)
      });
    });
  }
}

// Export singleton instance
export const graphStructureSynthesizer = new GraphStructureSynthesizer();
