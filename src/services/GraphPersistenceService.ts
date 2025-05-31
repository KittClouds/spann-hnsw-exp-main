import { Store } from '@livestore/livestore';
import { Core, ElementDefinition, NodeSingular, EdgeSingular } from 'cytoscape';
import { events, tables } from '@/livestore/schema';
import { graphNodes$, graphEdges$ } from '@/livestore/queries/graphPersistence';
import { NodeType, EdgeType } from './types';

/**
 * GraphPersistenceService provides bidirectional synchronization between 
 * Cytoscape graph and LiveStore database for complete graph persistence.
 */
export class GraphPersistenceService {
  private store: Store | null = null;
  private cy: Core | null = null;
  private isInitialized = false;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private readonly debounceMs = 300;
  private batchOperations: (() => void)[] = [];
  private isBatchMode = false;
  private unsubscribeFunctions: (() => void)[] = [];
  
  /**
   * Initialize the service with LiveStore and Cytoscape instances
   */
  public initialize(store: Store, cy: Core): void {
    if (this.isInitialized) {
      console.warn('[GraphPersistenceService] Already initialized');
      return;
    }
    
    this.store = store;
    this.cy = cy;
    this.isInitialized = true;
    
    this.setupCytoscapeListeners();
    this.setupLiveStoreListeners();
    this.loadGraphFromStore();
    
    console.log('[GraphPersistenceService] Initialized with bidirectional sync');
  }
  
  /**
   * Clean up the service
   */
  public destroy(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.removeCytoscapeListeners();
    this.removeLiveStoreListeners();
    this.isInitialized = false;
    this.store = null;
    this.cy = null;
    
    console.log('[GraphPersistenceService] Destroyed');
  }
  
  /**
   * Load complete graph state from LiveStore
   */
  public async loadGraphFromStore(): Promise<void> {
    if (!this.store || !this.cy) return;
    
    try {
      console.log('[GraphPersistenceService] Loading graph from LiveStore...');
      
      // Temporarily disable listeners during bulk load
      this.removeCytoscapeListeners();
      
      this.cy.startBatch();
      
      // Load nodes
      const nodes = this.store.query(graphNodes$);
      for (const node of nodes) {
        this.addNodeToCytoscape(node);
      }
      
      // Load edges
      const edges = this.store.query(graphEdges$);
      for (const edge of edges) {
        this.addEdgeToCytoscape(edge);
      }
      
      this.cy.endBatch();
      
      // Re-enable listeners after load
      this.setupCytoscapeListeners();
      
      console.log(`[GraphPersistenceService] Loaded ${nodes.length} nodes and ${edges.length} edges`);
      
    } catch (error) {
      console.error('[GraphPersistenceService] Error loading graph from store:', error);
    }
  }
  
  /**
   * Save current graph state to LiveStore
   */
  public async saveGraphToStore(): Promise<void> {
    if (!this.store || !this.cy) return;
    
    try {
      console.log('[GraphPersistenceService] Saving graph to LiveStore...');
      
      this.startBatch();
      
      // Save all nodes
      this.cy.nodes().forEach(node => {
        this.persistNode(node);
      });
      
      // Save all edges
      this.cy.edges().forEach(edge => {
        this.persistEdge(edge);
      });
      
      this.endBatch();
      
      console.log('[GraphPersistenceService] Graph saved to LiveStore');
      
    } catch (error) {
      console.error('[GraphPersistenceService] Error saving graph to store:', error);
    }
  }
  
  /**
   * Save current layout to LiveStore
   */
  public saveLayout(name: string, isDefault: boolean = false, clusterId?: string): void {
    if (!this.store || !this.cy) return;
    
    const layoutId = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nodePositions: Record<string, any> = {};
    
    this.cy.nodes().forEach(node => {
      const pos = node.position();
      nodePositions[node.id()] = { x: pos.x, y: pos.y };
    });
    
    const viewport = {
      zoom: this.cy.zoom(),
      pan: this.cy.pan()
    };
    
    this.store.commit(events.graphLayoutSaved({
      id: layoutId,
      name,
      layoutType: 'custom',
      viewport,
      nodePositions,
      isDefault,
      clusterId: clusterId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    console.log(`[GraphPersistenceService] Layout "${name}" saved`);
  }
  
  /**
   * Load layout from LiveStore
   */
  public loadLayout(layoutId: string): void {
    if (!this.store || !this.cy) return;
    
    const layouts = this.store.query(tables.graphLayouts.where({ id: layoutId }));
    if (layouts.length === 0) {
      console.warn(`[GraphPersistenceService] Layout ${layoutId} not found`);
      return;
    }
    
    const layout = layouts[0];
    
    this.cy.startBatch();
    
    // Restore node positions
    Object.entries(layout.nodePositions).forEach(([nodeId, position]: [string, any]) => {
      const node = this.cy.getElementById(nodeId);
      if (node.length > 0) {
        node.position(position);
      }
    });
    
    // Restore viewport
    this.cy.zoom(layout.viewport.zoom);
    this.cy.pan(layout.viewport.pan);
    
    this.cy.endBatch();
    
    this.store.commit(events.graphLayoutLoaded({
      id: layoutId,
      loadedAt: new Date().toISOString()
    }));
    
    console.log(`[GraphPersistenceService] Layout "${layout.name}" loaded`);
  }
  
  /**
   * Setup Cytoscape event listeners for persistence
   */
  private setupCytoscapeListeners(): void {
    if (!this.cy) return;
    
    // Node events
    this.cy.on('add', 'node', (evt) => {
      const node = evt.target;
      this.scheduleOperation(() => this.persistNode(node));
    });
    
    this.cy.on('remove', 'node', (evt) => {
      const node = evt.target;
      this.scheduleOperation(() => this.deleteNode(node.id()));
    });
    
    this.cy.on('position', 'node', (evt) => {
      const node = evt.target;
      this.scheduleOperation(() => this.persistNodePosition(node));
    });
    
    this.cy.on('style', 'node', (evt) => {
      const node = evt.target;
      this.scheduleOperation(() => this.persistNodeStyle(node));
    });
    
    // Edge events
    this.cy.on('add', 'edge', (evt) => {
      const edge = evt.target;
      this.scheduleOperation(() => this.persistEdge(edge));
    });
    
    this.cy.on('remove', 'edge', (evt) => {
      const edge = evt.target;
      this.scheduleOperation(() => this.deleteEdge(edge.id()));
    });
    
    this.cy.on('style', 'edge', (evt) => {
      const edge = evt.target;
      this.scheduleOperation(() => this.persistEdgeStyle(edge));
    });
    
    // Viewport changes
    this.cy.on('viewport', () => {
      this.scheduleOperation(() => this.persistViewport());
    });
  }
  
  /**
   * Remove Cytoscape event listeners
   */
  private removeCytoscapeListeners(): void {
    if (!this.cy) return;
    
    this.cy.off('add remove position style', 'node');
    this.cy.off('add remove style', 'edge');
    this.cy.off('viewport');
  }
  
  /**
   * Setup LiveStore listeners for reverse sync
   */
  private setupLiveStoreListeners(): void {
    if (!this.store) return;
    
    // Listen for graph node changes from other clients
    const unsubscribeNodes = this.store.subscribe(graphNodes$, (nodes) => {
      this.syncFromStore();
    });
    
    // Listen for graph edge changes from other clients
    const unsubscribeEdges = this.store.subscribe(graphEdges$, (edges) => {
      this.syncFromStore();
    });
    
    // Store unsubscribe functions for cleanup
    this.unsubscribeFunctions = [unsubscribeNodes, unsubscribeEdges];
  }
  
  /**
   * Remove LiveStore listeners
   */
  private removeLiveStoreListeners(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
  }
  
  /**
   * Sync changes from LiveStore to Cytoscape
   */
  private syncFromStore(): void {
    // TODO: Implement differential sync to avoid conflicts
    // For now, we'll skip reverse sync to prevent infinite loops
    // This should be implemented with proper conflict resolution
    console.log('[GraphPersistenceService] Store sync triggered (not implemented yet)');
  }
  
  /**
   * Persist a node to LiveStore
   */
  private persistNode(node: NodeSingular): void {
    if (!this.store) return;
    
    const data = node.data();
    const position = node.position();
    const style = node.style();
    
    this.store.commit(events.graphNodeCreated({
      id: node.id(),
      nodeType: data.type || NodeType.NOTE,
      entityKind: data.entityKind || null,
      entityLabel: data.entityLabel || null,
      position: { x: position.x, y: position.y },
      style: style,
      metadata: data,
      clusterId: data.clusterId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Persist node position to LiveStore
   */
  private persistNodePosition(node: NodeSingular): void {
    if (!this.store) return;
    
    const position = node.position();
    
    this.store.commit(events.graphNodeMoved({
      id: node.id(),
      position: { x: position.x, y: position.y },
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Persist node style to LiveStore
   */
  private persistNodeStyle(node: NodeSingular): void {
    if (!this.store) return;
    
    const style = node.style();
    
    this.store.commit(events.graphNodeStyled({
      id: node.id(),
      style: style,
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Delete a node from LiveStore
   */
  private deleteNode(nodeId: string): void {
    if (!this.store) return;
    
    this.store.commit(events.graphNodeDeleted({
      id: nodeId
    }));
  }
  
  /**
   * Persist an edge to LiveStore
   */
  private persistEdge(edge: EdgeSingular): void {
    if (!this.store) return;
    
    const data = edge.data();
    const style = edge.style();
    
    this.store.commit(events.graphEdgeCreated({
      id: edge.id(),
      sourceId: data.source,
      targetId: data.target,
      edgeType: data.label || EdgeType.LINKS_TO,
      weight: data.weight || 1,
      style: style,
      metadata: data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Persist edge style to LiveStore
   */
  private persistEdgeStyle(edge: EdgeSingular): void {
    if (!this.store) return;
    
    const style = edge.style();
    
    this.store.commit(events.graphEdgeUpdated({
      id: edge.id(),
      updates: { style },
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Delete an edge from LiveStore
   */
  private deleteEdge(edgeId: string): void {
    if (!this.store) return;
    
    this.store.commit(events.graphEdgeDeleted({
      id: edgeId
    }));
  }
  
  /**
   * Persist viewport changes
   */
  private persistViewport(): void {
    if (!this.store || !this.cy) return;
    
    // Find current default layout or create one
    const defaultLayouts = this.store.query(tables.graphLayouts.where({ isDefault: true }));
    let layoutId = 'default_layout';
    
    if (defaultLayouts.length === 0) {
      // Create default layout
      this.saveLayout('Default', true);
      return;
    } else {
      layoutId = defaultLayouts[0].id;
    }
    
    const viewport = {
      zoom: this.cy.zoom(),
      pan: this.cy.pan()
    };
    
    this.store.commit(events.graphViewportChanged({
      layoutId,
      viewport,
      updatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Add node to Cytoscape from LiveStore data
   */
  private addNodeToCytoscape(nodeData: any): void {
    if (!this.cy) return;
    
    const nodeDefinition: ElementDefinition = {
      group: 'nodes',
      data: {
        id: nodeData.id,
        type: nodeData.nodeType,
        entityKind: nodeData.entityKind,
        entityLabel: nodeData.entityLabel,
        clusterId: nodeData.clusterId,
        ...nodeData.metadata
      },
      position: nodeData.position,
      style: nodeData.style || {}
    };
    
    try {
      this.cy.add(nodeDefinition);
    } catch (error) {
      console.warn(`[GraphPersistenceService] Failed to add node ${nodeData.id}:`, error);
    }
  }
  
  /**
   * Add edge to Cytoscape from LiveStore data
   */
  private addEdgeToCytoscape(edgeData: any): void {
    if (!this.cy) return;
    
    const edgeDefinition: ElementDefinition = {
      group: 'edges',
      data: {
        id: edgeData.id,
        source: edgeData.sourceId,
        target: edgeData.targetId,
        label: edgeData.edgeType,
        weight: edgeData.weight,
        ...edgeData.metadata
      },
      style: edgeData.style || {}
    };
    
    try {
      this.cy.add(edgeDefinition);
    } catch (error) {
      console.warn(`[GraphPersistenceService] Failed to add edge ${edgeData.id}:`, error);
    }
  }
  
  /**
   * Start batch mode for multiple operations
   */
  private startBatch(): void {
    this.isBatchMode = true;
    this.batchOperations = [];
  }
  
  /**
   * End batch mode and execute all operations
   */
  private endBatch(): void {
    if (this.isBatchMode) {
      this.batchOperations.forEach(op => op());
      this.batchOperations = [];
      this.isBatchMode = false;
    }
  }
  
  /**
   * Schedule an operation with debouncing
   */
  private scheduleOperation(operation: () => void): void {
    if (this.isBatchMode) {
      this.batchOperations.push(operation);
      return;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      operation();
      this.debounceTimeout = null;
    }, this.debounceMs);
  }
}

// Export singleton instance
export const graphPersistenceService = new GraphPersistenceService();
