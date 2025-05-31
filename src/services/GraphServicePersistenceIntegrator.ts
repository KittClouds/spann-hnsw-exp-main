
import { Core } from 'cytoscape';
import { Store } from '@livestore/livestore';
import { graphPersistenceService } from './GraphPersistenceService';
import { IGraphService } from './types';

/**
 * Helper class to integrate GraphPersistenceService with GraphService
 * This keeps the main GraphService file from getting too large
 */
export class GraphServicePersistenceIntegrator {
  private isInitialized = false;
  private originalMethods: Map<string, Function> = new Map();
  
  /**
   * Initialize persistence integration for a GraphService instance
   */
  public initialize(graphService: IGraphService, store: Store, cy: Core): void {
    if (this.isInitialized) {
      console.warn('[GraphServicePersistenceIntegrator] Already initialized');
      return;
    }
    
    try {
      // Initialize the persistence service
      graphPersistenceService.initialize(store, cy);
      
      // Wrap existing methods to add persistence triggers
      this.wrapGraphServiceMethods(graphService);
      
      this.isInitialized = true;
      console.log('[GraphServicePersistenceIntegrator] Successfully integrated persistence with GraphService');
      
    } catch (error) {
      console.error('[GraphServicePersistenceIntegrator] Failed to initialize:', error);
    }
  }
  
  /**
   * Clean up the integration
   */
  public destroy(): void {
    if (!this.isInitialized) return;
    
    try {
      graphPersistenceService.destroy();
      this.isInitialized = false;
      console.log('[GraphServicePersistenceIntegrator] Persistence integration destroyed');
    } catch (error) {
      console.error('[GraphServicePersistenceIntegrator] Error during cleanup:', error);
    }
  }
  
  /**
   * Wrap GraphService methods to trigger persistence
   */
  private wrapGraphServiceMethods(graphService: IGraphService): void {
    // Store original methods for potential restoration
    this.originalMethods.set('addNote', graphService.addNote.bind(graphService));
    this.originalMethods.set('updateNote', graphService.updateNote.bind(graphService));
    this.originalMethods.set('deleteNote', graphService.deleteNote.bind(graphService));
    this.originalMethods.set('addCluster', graphService.addCluster.bind(graphService));
    this.originalMethods.set('updateCluster', graphService.updateCluster.bind(graphService));
    this.originalMethods.set('deleteCluster', graphService.deleteCluster.bind(graphService));
    this.originalMethods.set('moveNode', graphService.moveNode.bind(graphService));
    this.originalMethods.set('updateNoteConnections', graphService.updateNoteConnections.bind(graphService));
    
    // Wrap addNote
    const originalAddNote = this.originalMethods.get('addNote')!;
    graphService.addNote = (noteData: any, folderId?: string, clusterId?: string) => {
      const result = originalAddNote(noteData, folderId, clusterId);
      this.schedulePersistence();
      return result;
    };
    
    // Wrap updateNote
    const originalUpdateNote = this.originalMethods.get('updateNote')!;
    graphService.updateNote = (id: string, updates: any) => {
      const result = originalUpdateNote(id, updates);
      if (result) {
        this.schedulePersistence();
      }
      return result;
    };
    
    // Wrap deleteNote
    const originalDeleteNote = this.originalMethods.get('deleteNote')!;
    graphService.deleteNote = (id: string) => {
      const result = originalDeleteNote(id);
      if (result) {
        this.schedulePersistence();
      }
      return result;
    };
    
    // Wrap addCluster
    const originalAddCluster = this.originalMethods.get('addCluster')!;
    graphService.addCluster = (clusterData: any) => {
      const result = originalAddCluster(clusterData);
      this.schedulePersistence();
      return result;
    };
    
    // Wrap updateCluster
    const originalUpdateCluster = this.originalMethods.get('updateCluster')!;
    graphService.updateCluster = (id: string, updates: any) => {
      const result = originalUpdateCluster(id, updates);
      if (result) {
        this.schedulePersistence();
      }
      return result;
    };
    
    // Wrap deleteCluster
    const originalDeleteCluster = this.originalMethods.get('deleteCluster')!;
    graphService.deleteCluster = (id: string) => {
      const result = originalDeleteCluster(id);
      if (result) {
        this.schedulePersistence();
      }
      return result;
    };
    
    // Wrap moveNode
    const originalMoveNode = this.originalMethods.get('moveNode')!;
    graphService.moveNode = (nodeId: string, newParentId?: string | null) => {
      const result = originalMoveNode(nodeId, newParentId);
      if (result) {
        this.schedulePersistence();
      }
      return result;
    };
    
    // Wrap updateNoteConnections
    const originalUpdateNoteConnections = this.originalMethods.get('updateNoteConnections')!;
    graphService.updateNoteConnections = (noteId: string, tags: string[], mentions: string[], links: string[], entities?: any[], triples?: any[]) => {
      originalUpdateNoteConnections(noteId, tags, mentions, links, entities, triples);
      this.schedulePersistence();
    };
    
    console.log('[GraphServicePersistenceIntegrator] Wrapped GraphService methods for persistence');
  }
  
  /**
   * Schedule persistence with debouncing to avoid excessive saves
   */
  private debounceTimeout: NodeJS.Timeout | null = null;
  private schedulePersistence(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      if (this.isInitialized) {
        graphPersistenceService.saveGraphToStore().catch(error => {
          console.error('[GraphServicePersistenceIntegrator] Error during scheduled persistence:', error);
        });
      }
      this.debounceTimeout = null;
    }, 500); // 500ms debounce
  }
  
  /**
   * Get the current persistence service instance
   */
  public getPersistenceService() {
    return graphPersistenceService;
  }
  
  /**
   * Check if the integrator is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const graphServicePersistenceIntegrator = new GraphServicePersistenceIntegrator();
