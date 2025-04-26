
import cytoscape, {
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
  SingularElementArgument
} from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';
import { Note, Cluster } from '../store';
import { slug } from '../utils';
import { generateNodeId } from '../utils/ids';
import { 
  NodeType, 
  EdgeType, 
  CyElementJSON, 
  GraphJSON, 
  GraphData,
  GraphElementData, 
  Edge, 
  Tag, 
  ChangeListener 
} from './types';
import { IGraphService } from './IGraphService';

// Register cytoscape extensions
cytoscape.use(automove);
cytoscape.use(undoRedo);

export class GraphService implements IGraphService {
  private cy: Core;
  private ur: any; // undoRedo instance type
  private titleIndex = new Map<string, string>(); // For quick lookup by slugified title
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = []; // Buffer for batch notifications
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>(); // Track valid cluster IDs

  constructor() {
    // Initialize headless Cytoscape core
    this.cy = cytoscape({ headless: true });
    this.ur = this.cy.undoRedo(); // Initialize undo/redo

    // Configure automove
    (this.cy as any).automove({
      nodesMatching: `node[type = "${NodeType.NOTE}"]`, // Match notes
      reposition: 'drag',
      dragWith: `node[type = "${NodeType.FOLDER}"], node[type = "${NodeType.CLUSTER}"]` // Allow dragging with folders or clusters
    });

    this.initializeGraph(); // Setup root nodes
  }

  // --- Private Helpers ---

  private initializeGraph() {
    // Clear existing elements and indices
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();

    // Ensure root nodes exist
    if (this.cy.$(`node#standard_root`).empty()) {
      this.cy.add({
        group: 'nodes' as ElementGroup,
        data: {
          id: 'standard_root',
          type: NodeType.STANDARD_ROOT,
          title: 'Root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    
    if (this.cy.$(`node#clusters_root`).empty()) {
      this.cy.add({
        group: 'nodes' as ElementGroup,
        data: {
          id: 'clusters_root',
          type: NodeType.CLUSTERS_ROOT,
          title: 'Clusters',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
  }

  // Notification Batching using requestAnimationFrame
  private queueNotify(elements: ElementDefinition[]): void {
    if (!elements || elements.length === 0) return;

    this.pendingChanges.push(...elements);

    // Optional: Flush immediately if buffer gets too large
    const MAX_BUFFER = 200;
    if (this.pendingChanges.length >= MAX_BUFFER) {
      this.flushNotify();
      return;
    }

    // Schedule flush if not already scheduled
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    requestAnimationFrame(() => {
      this.notifyScheduled = false;
      this.flushNotify();
    });
  }

  private flushNotify(): void {
    if (this.pendingChanges.length > 0) {
      // Use a copy and clear the pending array
      const changesToNotify = [...this.pendingChanges];
      this.pendingChanges = [];
      // Notify listeners with the batch of changes
      this.changeListeners.forEach(listener => listener(changesToNotify));
    }
  }

  private edgeExists(srcId: string, tgtId: string, label?: EdgeType | string): boolean {
    const src = this.cy.getElementById(srcId);
    if (src.empty() || !src.isNode()) return false;

    let selector = `edge[target = "${tgtId}"]`;
    if (label) {
        selector = `edge[label = "${label}"][target = "${tgtId}"]`;
    }

    return !(src as NodeSingular).connectedEdges(selector).empty();
  }

  private generateEdgeId(sourceId: string, targetId: string, type: EdgeType | string = 'edge'): string {
    // Simple ID generation
    return `${type}_${sourceId}_${targetId}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private selectElement(elementId: string): void {
    if (!this.cy) return;
    this.cy.elements().unselect(); // Clear previous selection
    const ele = this.cy.getElementById(elementId);
    if (ele.length > 0) {
      ele.select();
    } else {
      console.warn(`Element with ID ${elementId} not found for selection.`);
    }
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null as any;
    }
    this.changeListeners = [];
    this.titleIndex.clear();
    this.clusterExists.clear();
    this.pendingChanges = [];
    this.ur = null as any;
    console.log('GraphService destroyed.');
  }

  getCy(): Core | null {
    return this.cy;
  }

  // --- Data Import/Export ---
  
  // Implementation of interface methods 
  async importGraph(data: GraphJSON | GraphData): Promise<void> {
    // Implement based on your needs
    console.log("Import graph called", data);
    return Promise.resolve();
  }

  exportGraph(opts: { includeStyle?: boolean } = {}): GraphJSON {
    // Basic implementation
    return {
      meta: { 
        app: 'BlockNote Graph', 
        version: 1, 
        exportedAt: new Date().toISOString() 
      },
      elements: []
    };
  }

  exportElement(ele: SingularElementArgument): CyElementJSON {
    return ele.json();
  }

  importElement(json: CyElementJSON): void {
    console.log("Import element called", json);
  }

  // --- Change Notification ---
  
  addChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    if (!this.changeListeners.includes(listener)) {
      this.changeListeners.push(listener);
    }
  }

  removeChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners = this.changeListeners.filter(l => l !== listener);
  }

  // --- Undo/Redo ---

  undo(): void { 
    if (this.ur) this.ur.undo(); 
  }
  
  redo(): void { 
    if (this.ur) this.ur.redo(); 
  }

  clearUndoStack(): void {
    if (this.ur) {
      this.ur.reset();
      console.log('Undo stack cleared');
    }
  }

  // --- Layout & View ---

  applyLayout(options?: LayoutOptions): void {
    console.log("Apply layout called", options);
  }

  focusNode(nodeId: string): void {
    console.log("Focus node called", nodeId);
  }

  fitView(elementIds?: string[]): void {
    console.log("Fit view called", elementIds);
  }

  // --- Element Access ---

  getNodes(): Note[] {
    return [];
  }

  getEdges(): Edge[] {
    return [];
  }

  getClusters(): Cluster[] {
    return [];
  }

  getTags(): Tag[] {
    return [];
  }

  getNode(id: string): Note | undefined {
    return undefined;
  }

  getEdge(id: string): Edge | undefined {
    return undefined;
  }

  getCluster(id: string): Cluster | undefined {
    return undefined;
  }

  findElementById(id: string): CollectionReturnValue | undefined {
    if (!this.cy) return undefined;
    const ele = this.cy.getElementById(id);
    return ele.length > 0 ? ele : undefined;
  }

  // --- Node Operations ---

  async addNote(noteData: Partial<Note>, folderId?: string, clusterId?: string): Promise<string> {
    console.log("Add note called", noteData, folderId, clusterId);
    return Promise.resolve(generateNodeId());
  }

  updateNote(noteId: string, data: Partial<GraphElementData>): void {
    console.log("Update note called", noteId, data);
  }

  deleteNote(noteId: string): void {
    console.log("Delete note called", noteId);
  }

  moveNode(nodeId: string, newPosition: Position): void {
    console.log("Move node called", nodeId, newPosition);
  }

  moveNodeToParent(nodeId: string, newParentId?: string | null): void {
    console.log("Move node to parent called", nodeId, newParentId);
  }

  // --- Edge Operations ---

  async addEdge(sourceId: string, targetId: string, data?: Partial<GraphElementData>): Promise<string> {
    console.log("Add edge called", sourceId, targetId, data);
    return Promise.resolve(this.generateEdgeId(sourceId, targetId));
  }

  updateEdge(edgeId: string, data: Partial<GraphElementData>): void {
    console.log("Update edge called", edgeId, data);
  }

  deleteEdge(edgeId: string): void {
    console.log("Delete edge called", edgeId);
  }

  // --- Cluster Operations ---

  async addCluster(clusterData: Partial<Cluster>): Promise<string> {
    console.log("Add cluster called", clusterData);
    return Promise.resolve(generateNodeId());
  }

  updateCluster(clusterId: string, data: Partial<GraphElementData>): void {
    console.log("Update cluster called", clusterId, data);
  }

  deleteCluster(clusterId: string): void {
    console.log("Delete cluster called", clusterId);
  }

  moveNodeToCluster(nodeId: string, clusterId: string | null): void {
    console.log("Move node to cluster called", nodeId, clusterId);
  }

  addNodeToCluster(nodeId: string, clusterId: string): void {
    console.log("Add node to cluster called", nodeId, clusterId);
  }

  removeNodeFromCluster(nodeId: string): void {
    console.log("Remove node from cluster called", nodeId);
  }

  // --- Tag Operations ---

  tagNote(noteId: string, tagName: string): void {
    console.log("Tag note called", noteId, tagName);
  }

  untagNote(noteId: string, tagName: string): void {
    console.log("Untag note called", noteId, tagName);
  }

  getNotesByTag(tagName: string): Note[] {
    console.log("Get notes by tag called", tagName);
    return [];
  }

  // --- Querying & Selection ---

  searchNodes(query: string, types: NodeType[]): NodeCollection {
    console.log("Search nodes called", query, types);
    return this.cy.collection().filter('node') as NodeCollection;
  }

  getRelatedNodes(nodeId: string, includeClusters: boolean = false): Array<Note | Cluster> {
    console.log("Get related nodes called", nodeId, includeClusters);
    return [];
  }

  getBacklinks(nodeId: string): Array<{id: string; title: string}> {
    console.log("Get backlinks called", nodeId);
    return [];
  }

  getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', Array<{id: string; title: string}>> {
    console.log("Get connections called", nodeId);
    return {
      tag: [],
      concept: [],
      mention: []
    };
  }

  selectNode(nodeId: string): void {
    this.selectElement(nodeId);
  }

  selectEdge(edgeId: string): void {
    this.selectElement(edgeId);
  }

  selectCluster(clusterId: string): void {
    this.selectElement(clusterId);
  }

  clearSelection(): void {
    if (this.cy) {
      this.cy.elements().unselect();
    }
  }

  // --- Utility ---

  generateId(): string {
    return generateNodeId();
  }

  isCluster(elementId: string): boolean {
    if (!this.cy) return false;
    const ele = this.cy.getElementById(elementId);
    return ele.length > 0 && ele.isNode() && ele.data('type') === NodeType.CLUSTER;
  }

  isNote(elementId: string): boolean {
    if (!this.cy) return false;
    const ele = this.cy.getElementById(elementId);
    return ele.length > 0 && ele.isNode() && ele.data('type') === NodeType.NOTE;
  }

  isEdge(elementId: string): boolean {
    if (!this.cy) return false;
    const ele = this.cy.getElementById(elementId);
    return ele.length > 0 && ele.isEdge();
  }

  // --- Store Integration ---

  importFromStore(notes: Note[], clusters: Cluster[]): void {
    console.log("Import from store called", notes, clusters);
  }

  exportToStore(): { notes: Note[]; clusters: Cluster[] } {
    console.log("Export to store called");
    return { notes: [], clusters: [] };
  }
}

// Export a singleton instance
export const graphService = new GraphService();
