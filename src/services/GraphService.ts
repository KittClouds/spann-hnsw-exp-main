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
  SingularElementArgument,
  StylesheetJson,
  CytoscapeOptions,
  Stylesheet,
  NodeDefinition, // Added
  EdgeDefinition, // Added
  BoundingBox // Added for fitView potentially
} from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';
import { Note, Cluster } from '@/lib/store'; // Assuming these are the primary types
import { slug } from '@/lib/utils';
import { generateNodeId, NodeId, ClusterId } from '@/lib/utils/ids';

// --- BEGIN Assumption of types defined elsewhere (e.g., ../types) ---
// You'll need to define these or adjust imports based on your actual types
export interface Edge {
    id: string;
    source: string;
    target: string;
    label?: EdgeType | string; // Allow flexibility
    [key: string]: any; // Allow other data
}

export interface Tag {
    id: string; // Typically the slug of the title
    type: NodeType.TAG;
    title: string;
    [key: string]: any;
}

export interface GraphElementData {
    id?: string;
    type?: NodeType | string;
    title?: string;
    [key: string]: any; // Allow arbitrary data
}

export interface GraphData { // Replacement for GraphJSON potentially
    meta: GraphMeta;
    data?: Record<string, unknown>;
    layout?: LayoutOptions;
    style?: StylesheetJson[];
    viewport?: { zoom: number; pan: Position };
    elements: ElementDefinition[]; // Use Cytoscape's definition
}

export type ChangeListener = (changeType: 'add' | 'update' | 'remove', elements: ElementDefinition[]) => void; // Modified listener signature

// Define IGraphService if it's not imported
export interface IGraphService {
    // Lifecycle
    // init(container: HTMLElement): void; // Omitted due to headless constructor
    destroy(): void;
    getCy(): Core | null;

    // Data I/O
    importGraph(data: GraphData | GraphJSON): Promise<void>; // Allow GraphJSON for compatibility
    exportGraph(): GraphJSON; // Keep GraphJSON export for now

    // Change Notification
    addChangeListener(listener: ChangeListener): void; // Keep existing listener type for now
    removeChangeListener(listener: ChangeListener): void; // Keep existing listener type for now

    // Undo/Redo
    undo(): void;
    redo(): void;
    clearUndoStack(): void;

    // Layout
    applyLayout(options?: LayoutOptions): void;

    // Element Access
    getNodes(): Note[]; // Specific type
    getEdges(): Edge[];
    getClusters(): Cluster[]; // Specific type
    getTags(): Tag[];
    getNode(id: string): Note | undefined; // Specific type
    getEdge(id: string): Edge | undefined;
    getCluster(id: string): Cluster | undefined; // Specific type
    findElementById(id: string): CollectionReturnValue | undefined;

    // Node Operations
    addNote(noteData: Partial<Note>, folderId?: string, clusterId?: string): Promise<string>; // Modified existing signature
    updateNote(noteId: string, data: Partial<GraphElementData>): void;
    deleteNote(noteId: string): void; // Changed return type
    moveNode(nodeId: string, newPosition: { x: number; y: number }): void; // Positional move
    moveNodeToParent(nodeId: string, newParentId?: string | null): void; // Renamed existing compound move

    // Edge Operations
    addEdge(sourceId: string, targetId: string, data?: Partial<GraphElementData>): Promise<string>;
    updateEdge(edgeId: string, data: Partial<GraphElementData>): void;
    deleteEdge(edgeId: string): void;

    // Cluster Operations
    addCluster(clusterData: Partial<Cluster>): Promise<string>; // Modified existing signature
    updateCluster(clusterId: string, data: Partial<GraphElementData>): void;
    deleteCluster(clusterId: string): void; // Changed return type
    moveNodeToCluster(nodeId: string, clusterId: string | null): void; // Changed return type, allow null
    addNodeToCluster(nodeId: string, clusterId: string): void;
    removeNodeFromCluster(nodeId: string): void;

    // Tag Operations
    tagNote(noteId: string, tagName: string): void; // Changed return type
    untagNote(noteId: string, tagName: string): void;
    getNotesByTag(tagName: string): Note[];

    // Querying & Selection
    searchNodes(query: string, types: NodeType[]): NodeCollection; // Keep existing search
    getRelatedNodes(nodeId: string, includeClusters?: boolean): (Note | Cluster)[]; // Changed return type
    getBacklinks(nodeId: string): any[]; // Keep existing
    getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]>; // Keep existing
    selectNode(nodeId: string): void;
    selectEdge(edgeId: string): void;
    selectCluster(clusterId: string): void;
    clearSelection(): void;
    focusNode(nodeId: string): void;
    fitView(elementIds?: string[]): void;

    // Utility
    generateId(): string;
    isCluster(elementId: string): boolean;
    isNote(elementId: string): boolean;
    isEdge(elementId: string): boolean;
}
// --- END Assumption of types defined elsewhere ---


cytoscape.use(automove);
cytoscape.use(undoRedo);

export enum NodeType {
  NOTE = 'note',
  FOLDER = 'folder', // Keep folder type if used by automove or compound nodes
  TAG = 'tag',
  CONCEPT = 'concept', // Keep concept type if used
  CLUSTER = 'cluster',
  STANDARD_ROOT = 'standard_root',
  CLUSTERS_ROOT = 'clusters_root',
  CLUSTER_DEFINITION = 'cluster_definition', // Keep if used elsewhere
  CLUSTER_ROOT = 'cluster_root' // Keep if used elsewhere
}

export enum EdgeType {
  CONTAINS = 'contains',
  NOTE_LINK = 'note_link', // Keep if used
  HAS_TAG = 'has_tag',
  MENTIONS = 'mentions', // Keep if used
  HAS_CONCEPT = 'has_concept', // Keep if used
  IN_CLUSTER = 'in_cluster' // This might become redundant if using compound parents strictly
}

export interface CyElementJSON extends ElementDefinition {} // Keep for compatibility

export interface GraphMeta {
  app: string;
  version: number;
  exportedAt: string;
}

// Keep GraphJSON for export/import compatibility for now
export interface GraphJSON {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: LayoutOptions;
  style?: StylesheetJson[];
  viewport?: { zoom: number; pan: Position };
  elements: CyElementJSON[];
}


// Debounce utility (keep commented out if using requestAnimationFrame)
/*
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout | null = null;

    const debounced = (...args: Parameters<F>) => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };

    return debounced as (...args: Parameters<F>) => ReturnType<F>;
};
*/

export class GraphService implements IGraphService {
  private cy: Core;
  private ur: ReturnType<Core['undoRedo']>;
  private titleIndex = new Map<string, string>(); // For quick lookup by slugified title
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = []; // Buffer for batch notifications
  // Use existing listener signature for now
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>(); // Track valid cluster IDs

  constructor() {
    // Initialize headless Cytoscape core
    this.cy = cytoscape({ headless: true });
    this.ur = this.cy.undoRedo(); // Initialize undo/redo

    // Configure automove (if needed, assumes FOLDER type exists)
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

    // Ensure root nodes exist (could be omitted if not strictly needed)
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
        // console.log(`Flushing ${changesToNotify.length} changes`); // Debugging
        // Notify listeners with the batch of changes
        // TODO: Adapt listener signature if needed (e.g., provide change type 'add'/'update'/'remove')
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
      // Simple ID generation, consider a more robust UUID approach if needed
      return `${type}_${sourceId}_${targetId}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private selectElement(elementId: string): void {
      if (!this.cy) return;
      this.cy.elements().unselect(); // Clear previous selection
      const ele = this.cy.getElementById(elementId);
      if (ele.length > 0) {
          ele.select();
          // TODO: Notify about selection change? (Optional)
      } else {
          console.warn(`Element with ID ${elementId} not found for selection.`);
      }
  }

  // --- Initialization & Lifecycle ---

  // init(container: HTMLElement): void { Omitted - Initialized headlessly in constructor }

  destroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null as any; // Clear reference
    }
    this.changeListeners = [];
    this.titleIndex.clear();
    this.clusterExists.clear();
    this.pendingChanges = [];
    this.ur = null as any; // Clear undo/redo instance
    console.log('GraphService destroyed.');
  }

  getCy(): Core | null {
    return this.cy;
  }

  // --- Data Import/Export ---

  // Keep existing GraphJSON import for now, adapt if GraphData is strictly needed
  async importGraph(g: GraphJSON | GraphData): Promise<void> {
    // Basic validation
    if (!g || !g.elements || !Array.isArray(g.elements)) {
      console.error("Invalid graph data format for import", g);
      return Promise.reject(new Error("Invalid graph data format"));
    }

    if (!this.cy) {
        console.error("GraphService not initialized, cannot import.");
        return Promise.reject(new Error("GraphService not initialized"));
    }


    this.cy.startBatch(); // Batch operations for performance
    try {
      // Clear existing graph state before import
      this.initializeGraph();

      // Process elements, ensuring valid IDs
      const elements = g.elements.map((e: ElementDefinition) => {
        if (e && e.data) {
          // Ensure ID exists and is reasonably long (basic heuristic)
          if (!e.data.id || String(e.data.id).length < 10) { // Adjusted length check
             console.warn(`Element missing valid ID, generating new one:`, e.data);
             e.data.id = this.generateId();
          }
        } else if (e) {
             console.warn(`Element missing data field, attempting to generate ID:`, e);
             e.data = { id: this.generateId() };
        } else {
            console.warn(`Encountered null or undefined element definition in import.`);
            return null; // Skip invalid elements
        }
        return e;
      }).filter(e => e !== null) as ElementDefinition[]; // Remove nulls

      // Load elements into Cytoscape
      this.cy.json({ elements: elements } as CytoscapeOptions);

      // Apply layout, style, data, viewport if present
      if (g.layout) this.cy.layout(g.layout).run(); // Run layout after adding elements
      if (g.style && Array.isArray(g.style)) {
        (this.cy.style() as Stylesheet).fromJson(g.style).update();
      }
      if (g.data) this.cy.data(g.data); // Set graph-level data
      if (g.viewport) {
        this.cy.viewport({ zoom: g.viewport.zoom, pan: g.viewport.pan });
      }

      // Rebuild internal indices after import
      this.titleIndex.clear();
      this.clusterExists.clear();
      this.cy.nodes().forEach(node => {
          const type = node.data('type');
          const title = node.data('title');
          const id = node.id();

          if (type === NodeType.NOTE && title && id) {
             this.titleIndex.set(slug(title), id);
          } else if (type === NodeType.CLUSTER && id) {
             this.clusterExists.add(id);
          }
      });

      this.ur.reset(); // Clear undo stack after import
      this.ur.stop(); // Ensure undo/redo is active after potential stop/start
      this.ur.start();

    } catch (error) {
        console.error("Error during graph import:", error);
        this.cy.endBatch(); // Ensure batch ends even on error
        return Promise.reject(error);
    } finally {
      this.cy.endBatch(); // End batching
    }

    // Notify listeners about the full graph load (send all elements)
    this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
    return Promise.resolve();
  }

  // Keep GraphJSON export format
  exportGraph(opts: {includeStyle?: boolean} = {}): GraphJSON {
    if (!this.cy) {
        throw new Error("GraphService not initialized, cannot export.");
    }
    const cyJson = this.cy.json() as CytoscapeOptions;
    const g: GraphJSON = {
      meta: { app: 'BlockNote Graph', version: 2, exportedAt: new Date().toISOString() },
      data: this.cy.data(),
      // layout: cyJson.layout, // Layout state is complex, usually re-run on import
      style: opts.includeStyle ? (this.cy.style() as Stylesheet).json() : undefined,
      viewport: { zoom: this.cy.zoom(), pan: this.cy.pan() },
      elements: this.cy.elements().jsons() as unknown as CyElementJSON[]
    };
    return g;
  }

  // exportElement and importElement might be less useful if full import/export is used
  public exportElement(ele: SingularElementArgument): CyElementJSON {
      return ele.json();
  }

  public importElement(json: CyElementJSON): void {
      if (!this.cy) return;
      if (!json || !json.data || !json.data.id) {
          console.error("Invalid element JSON for import:", json);
          return;
      }
      const elementId = json.data.id;
      const exists = this.cy.getElementById(elementId);

      if (exists.nonempty()) {
          // Handle update with undo/redo
          const oldJson = exists.json();
          this.ur.action('importElementUpdate', { oldJson, newJson: json },
              (args) => { this.cy.getElementById(args.newJson.data.id).json(args.newJson); return args; },
              (undoArgs) => { this.cy.getElementById(undoArgs.oldJson.data.id).json(undoArgs.oldJson); }
          );
      } else {
          // Handle add with undo/redo
          this.ur.do('add', json);

          // Update indices if needed
          if (json.data.type === NodeType.NOTE && json.data.title) {
              this.titleIndex.set(slug(json.data.title), elementId);
          }
          if (json.data.type === NodeType.CLUSTER) {
              this.clusterExists.add(elementId);
          }
      }
      this.queueNotify([json]); // Notify about the change
  }


  // --- Change Notification ---

  // Assuming listener signature is (elements: ElementDefinition[]) => void
  addChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    if (!this.changeListeners.includes(listener)) {
        this.changeListeners.push(listener);
    }
  }

  removeChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners = this.changeListeners.filter((l) => l !== listener);
  }

  // --- Undo/Redo ---

  undo(): void { this.ur?.undo(); }
  redo(): void { this.ur?.redo(); }

  clearUndoStack(): void {
    if (this.ur) {
        this.ur.reset();
        console.log('Undo stack cleared');
        // Optionally notify listeners if this is considered a significant change
    }
  }

  // --- Layout ---

  applyLayout(options?: LayoutOptions): void {
    if (!this.cy) return;
    // Define a default layout if none provided
    const defaultLayout: LayoutOptions = { name: 'cose', animate: true };
    const layoutOptions = options || defaultLayout;

    try {
        this.cy.layout(layoutOptions).run();
    } catch (e) {
        console.error("Error applying layout:", e, layoutOptions);
        // Fallback to a simpler layout?
        try {
            this.cy.layout({ name: 'grid', animate: false }).run();
        } catch (fallbackError) {
             console.error("Error applying fallback layout:", fallbackError);
        }
    }
  }

  // --- Element Access ---

  getNodes(): Note[] {
    if (!this.cy) return [];
    return this.cy.nodes(`[type = "${NodeType.NOTE}"]`)
               .map(node => node.data() as Note)
               .filter(data => !!data); // Filter out potential null/undefined data
  }

  getEdges(): Edge[] {
      if (!this.cy) return [];
      // Map all edges, assuming they fit the 'Edge' interface structure
      return this.cy.edges()
                 .map(edge => edge.data() as Edge)
                 .filter(data => !!data);
  }

  getClusters(): Cluster[] {
      if (!this.cy) return [];
      return this.cy.nodes(`[type = "${NodeType.CLUSTER}"]`)
                 .map(node => node.data() as Cluster)
                 .filter(data => !!data);
  }

  getTags(): Tag[] {
      if (!this.cy) return [];
      return this.cy.nodes(`[type = "${NodeType.TAG}"]`)
                 .map(node => node.data() as Tag)
                 .filter(data => !!data);
  }

  getNode(id: string): Note | undefined {
    if (!this.cy) return undefined;
    const node = this.cy.getElementById(id);
    if (node.length > 0 && node.isNode() && node.data('type') === NodeType.NOTE) {
        return node.data() as Note;
    }
    return undefined;
  }

  getEdge(id: string): Edge | undefined {
    if (!this.cy) return undefined;
    const edge = this.cy.getElementById(id);
    if (edge.length > 0 && edge.isEdge()) {
        return edge.data() as Edge;
    }
    return undefined;
  }

  getCluster(id: string): Cluster | undefined {
      if (!this.cy) return undefined;
      const node = this.cy.getElementById(id);
      if (node.length > 0 && node.isNode() && node.data('type') === NodeType.CLUSTER) {
          return node.data() as Cluster;
      }
      return undefined;
  }

  findElementById(id: string): CollectionReturnValue | undefined {
      if (!this.cy) return undefined;
      const ele = this.cy.getElementById(id);
      return ele.length > 0 ? ele : undefined;
  }

  // --- Node Operations ---

  // Modified existing addNote to fit signature (returns Promise<string>)
  async addNote(
      noteData: Partial<Note>,
      folderId?: string, // Keep folderId for parenting
      clusterId?: string // Keep clusterId for initial assignment
  ): Promise<string> {
      if (!this.cy) return Promise.reject("GraphService not initialized");

      const nodeId = noteData.id && String(noteData.id).length >= 10 ? noteData.id : this.generateId();
      const existingNode = this.cy.getElementById(nodeId);

      if (existingNode.nonempty()) {
          console.warn(`Note with ID ${nodeId} already exists. Returning existing ID.`);
          return Promise.resolve(nodeId);
      }

      const now = new Date().toISOString();
      const title = noteData.title || 'Untitled Note';
      const slugTitle = slug(title);

      const elData: Note & { type: NodeType, slugTitle: string, parent?: string, clusterId?: string } = {
          // Defaults for Note type
          id: nodeId,
          title: title,
          content: [], // Default content
          path: '/', // Default path
          createdAt: now,
          updatedAt: now,
          // Merge provided data, ensuring required fields have defaults
          ...noteData,
          // Explicitly set core fields
          id: nodeId, // Ensure ID is correct
          title: title,
          createdAt: noteData.createdAt || now,
          updatedAt: noteData.updatedAt || now,
          // Graph-specific data
          type: NodeType.NOTE,
          slugTitle: slugTitle,
          parent: folderId, // Use folderId for compound parent
          clusterId: undefined, // Initialize clusterId as undefined, handle below
      };

      const el: ElementDefinition = {
          group: 'nodes' as ElementGroup,
          data: elData,
          // position: position // Add position if provided and needed
      };

      // Add using undo/redo
      this.ur.do('add', [el]);
      this.titleIndex.set(slugTitle, nodeId); // Update title index

      const newNode = this.cy.getElementById(nodeId) as NodeSingular;

      // Handle initial cluster assignment *after* adding the node
      let clusterAssignmentSuccess = false;
      if (clusterId) {
          if (this.clusterExists.has(clusterId)) {
              // Use moveNodeToCluster for consistent logic and undo/redo
              clusterAssignmentSuccess = this.moveNodeToClusterInternal(nodeId, clusterId); // Internal call to avoid double notification
          } else {
              console.warn(`Attempted to add note ${nodeId} to non-existent cluster ${clusterId}. Storing ID in data.`);
              // Store the intended clusterId in data if assignment fails
              this.ur.action('setInitialClusterId', { nodeId, clusterId },
                  (args) => { this.cy.getElementById(args.nodeId).data('clusterId', args.clusterId); return args; },
                  (undoArgs) => { this.cy.getElementById(undoArgs.nodeId).data('clusterId', undefined); }
              );
          }
      }

      // Notify about the added node and potential clusterId update
      this.queueNotify([this.cy.getElementById(nodeId).json() as unknown as ElementDefinition]);

      return Promise.resolve(nodeId);
  }

  // Existing updateNote adapted for GraphElementData and undo/redo
  updateNote(noteId: string, updates: Partial<GraphElementData>): void {
      if (!this.cy) return;
      const node = this.cy.getElementById(noteId);
      if (node.empty() || node.data('type') !== NodeType.NOTE) {
          console.warn(`Node ${noteId} not found or not a Note for update.`);
          return;
      }

      const oldData = { ...node.data() }; // Shallow copy for undo
      const newData: Partial<GraphElementData> = {
          ...updates, // Apply updates
          updatedAt: new Date().toISOString() // Always update timestamp
      };

      // Handle title slug update specifically
      const oldTitle = oldData.title;
      const newTitle = updates.hasOwnProperty('title') ? updates.title as string : oldTitle;
      if (updates.hasOwnProperty('title') && newTitle !== oldTitle) {
          newData.slugTitle = slug(newTitle || '');
      }

      // Prepare data changes for undo/redo action
      const changeOps: { name: string; oldValue: any; newValue: any }[] = [];
      for (const key in newData) {
          // Only include keys that actually changed or are new
          if (Object.prototype.hasOwnProperty.call(newData, key) && oldData[key] !== (newData as any)[key]) {
              // Exclude internal/read-only fields if necessary (e.g., id, type, createdAt)
              if (key !== 'id' && key !== 'type' && key !== 'createdAt') {
                  changeOps.push({
                      name: key,
                      oldValue: oldData[key],
                      newValue: (newData as any)[key]
                  });
              }
          }
      }

      // Only perform action if there are changes
      if (changeOps.length > 0) {
          this.ur.action('updateNodeData', { elementId: noteId, changes: changeOps },
              (args) => {
                  const ele = this.cy.getElementById(args.elementId);
                  if (ele.nonempty()) {
                      args.changes.forEach(op => ele.data(op.name, op.newValue));
                      // Update title index if title changed
                      const titleChange = args.changes.find(c => c.name === 'title');
                      if (titleChange) {
                          const oldSlug = slug(oldData.title || '');
                          const newSlug = slug(titleChange.newValue || '');
                          if (oldSlug && this.titleIndex.get(oldSlug) === args.elementId) {
                              this.titleIndex.delete(oldSlug);
                          }
                          if (newSlug) {
                              this.titleIndex.set(newSlug, args.elementId);
                          }
                      }
                  }
                  return args; // Return args for undo
              },
              (undoArgs) => {
                  const ele = this.cy.getElementById(undoArgs.elementId);
                  if (ele.nonempty()) {
                      undoArgs.changes.forEach(op => ele.data(op.name, op.oldValue));
                      // Revert title index if title changed
                      const titleChange = undoArgs.changes.find(c => c.name === 'title');
                      if (titleChange) {
                          const oldSlug = slug(oldData.title || '');
                          const newSlug = slug(titleChange.newValue || '');
                          if (newSlug) {
                              this.titleIndex.delete(newSlug);
                          }
                          if (oldSlug) {
                              this.titleIndex.set(oldSlug, undoArgs.elementId);
                          }
                      }
                  }
              }
          );
          this.queueNotify([node.json() as unknown as ElementDefinition]);
      } else if (!updates.updatedAt) {
            // If only change was updatedAt, still update it directly (no undo needed for just timestamp)
            node.data('updatedAt', newData.updatedAt);
            this.queueNotify([node.json() as unknown as ElementDefinition]);
      }
  }

  // Existing deleteNote adapted for void return and undo/redo
  deleteNote(noteId: string): void {
      if (!this.cy) return;
      const node = this.cy.getElementById(noteId);
      if (node.empty() || node.data('type') !== NodeType.NOTE) {
           console.warn(`Node ${noteId} not found or is not a Note.`);
           return; // Changed from false to void
      }

      const slugTitle = node.data('slugTitle');
      const wasInCluster = node.data('clusterId');

      // Use ur.do('remove', ...) which handles undo/redo internally
      const removedCollection = this.ur.do('remove', node);

      // Clean up indices if the removal was successful (check collection size)
      if (removedCollection && removedCollection.length > 0) {
          if (slugTitle) {
              this.titleIndex.delete(slugTitle);
          }
          // Notify about the removed elements (node + potentially connected edges)
          this.queueNotify(removedCollection.jsons() as unknown as ElementDefinition[]);
      } else if (removedCollection === undefined){
         // If ur.do didn't return anything (e.g., undo/redo disabled or failed)
         // Still try to clean up index if node seems gone
          if (this.cy.getElementById(noteId).empty() && slugTitle) {
                this.titleIndex.delete(slugTitle);
          }
      }
      // Return type is void
  }

  // New method for positional move
  moveNode(nodeId: string, newPosition: { x: number; y: number }): void {
       if (!this.cy) return;
       const node = this.cy.getElementById(nodeId);
       if (node.length > 0 && node.isNode()) {
           const oldPosition = node.position();
           // Use action for undo/redo of position change
           this.ur.action('moveNodePosition', { nodeId, oldPosition, newPosition },
               (args) => {
                   this.cy.getElementById(args.nodeId).position(args.newPosition);
                   return args;
               },
               (undoArgs) => {
                   this.cy.getElementById(undoArgs.nodeId).position(undoArgs.oldPosition);
               }
           );
           this.queueNotify([node.json() as unknown as ElementDefinition]);
       } else {
           console.warn(`Node with ID ${nodeId} not found for moving.`);
       }
  }

  // Renamed existing compound move method
  moveNodeToParent(nodeId: string, newParentId?: string | null): void {
      const node = this.cy.getElementById(nodeId);
      if (node.empty() || !node.isNode()) {
          console.warn(`Node ${nodeId} not found for moving.`);
          return; // Changed from false to void
      }

      // Handle target parent validation
      const targetParent = newParentId ? this.cy.getElementById(newParentId) : null;
      if (newParentId && (!targetParent || targetParent.empty() || !targetParent.isNode())) {
          console.warn(`Target parent node ${newParentId} does not exist or is not a node.`);
          return; // Changed from false to void
      }

      const oldParentId = node.parent().id(); // Get current parent ID

      // Use action for undo/redo of parent change
      this.ur.action('moveNodeCompound', { nodeId: nodeId, oldParentId: oldParentId, newParentId: newParentId || null },
          (args) => {
              const nodeToMove = this.cy.getElementById(args.nodeId);
              if (nodeToMove.nonempty()) {
                  nodeToMove.move({ parent: args.newParentId }); // Move to new parent (null for root)
                  // Update folderId data if moving to/from a folder (optional, depends on data model)
                  // if (this.cy.getElementById(args.newParentId)?.data('type') === NodeType.FOLDER) {
                  //     nodeToMove.data('folderId', args.newParentId);
                  // } else if (nodeToMove.data('folderId') === args.oldParentId) {
                  //     nodeToMove.data('folderId', undefined);
                  // }
              }
              return args;
          },
          (undoArgs) => {
              const nodeToMove = this.cy.getElementById(undoArgs.nodeId);
               if (nodeToMove.nonempty()) {
                   nodeToMove.move({ parent: undoArgs.oldParentId }); // Move back to old parent
                    // Revert folderId data if applicable
                   // if (this.cy.getElementById(undoArgs.oldParentId)?.data('type') === NodeType.FOLDER) {
                   //     nodeToMove.data('folderId', undoArgs.oldParentId);
                   // } else if (nodeToMove.data('folderId') === undoArgs.newParentId) {
                   //     nodeToMove.data('folderId', undefined);
                   // }
               }
          }
      );

      this.queueNotify([node.json() as unknown as ElementDefinition]);
      // Return type is void
  }

  // --- Edge Operations ---

  async addEdge(sourceId: string, targetId: string, data?: Partial<GraphElementData>): Promise<string> {
      if (!this.cy) return Promise.reject("GraphService not initialized");

      const sourceNode = this.cy.getElementById(sourceId);
      const targetNode = this.cy.getElementById(targetId);

      if (sourceNode.empty() || !sourceNode.isNode()) return Promise.reject(`Source node ${sourceId} not found.`);
      if (targetNode.empty() || !targetNode.isNode()) return Promise.reject(`Target node ${targetId} not found.`);

      // Prevent duplicate edges if necessary (check by source, target, and potentially type/label)
      const label = data?.label as EdgeType | string | undefined;
      if (this.edgeExists(sourceId, targetId, label)) {
         console.warn(`Edge from ${sourceId} to ${targetId} ${label ? `with label ${label}`: ''} already exists.`);
         // Find existing edge and return its ID
         let selector = `edge[source = "${sourceId}"][target = "${targetId}"]`;
         if (label) selector += `[label = "${label}"]`;
         const existingEdge = this.cy.edges(selector).first();
         if (existingEdge.nonempty()) {
             return Promise.resolve(existingEdge.id());
         }
         // Fall through to add if somehow edgeExists passed but find failed
      }


      const edgeId = data?.id || this.generateEdgeId(sourceId, targetId, label || data?.type as string);
      const edgeData: GraphElementData = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          ...data // Include provided data (label, type, etc.)
      };

      const edgeDef: EdgeDefinition = {
          group: 'edges',
          data: edgeData
      };

      // Add using undo/redo
      const added = this.ur.do('add', [edgeDef]);

      if (added && added.length > 0) {
          this.queueNotify([added.first().json() as unknown as ElementDefinition]);
          return Promise.resolve(edgeId);
      } else {
          // Check if it was added anyway (e.g., undo disabled)
          if (this.cy.getElementById(edgeId).nonempty()) {
              this.queueNotify([this.cy.getElementById(edgeId).json() as unknown as ElementDefinition]);
              return Promise.resolve(edgeId);
          }
          return Promise.reject(`Failed to add edge ${edgeId}`);
      }
  }

  updateEdge(edgeId: string, updates: Partial<GraphElementData>): void {
      if (!this.cy) return;
      const edge = this.cy.getElementById(edgeId);
      if (edge.empty() || !edge.isEdge()) {
          console.warn(`Edge ${edgeId} not found for update.`);
          return;
      }

      const oldData = { ...edge.data() };
      const newData = { ...updates }; // Don't automatically add updatedAt for edges unless needed

      // Prepare changes for undo/redo
      const changeOps: { name: string; oldValue: any; newValue: any }[] = [];
      for (const key in newData) {
          if (Object.prototype.hasOwnProperty.call(newData, key) && oldData[key] !== (newData as any)[key]) {
              // Exclude read-only fields like id, source, target
              if (key !== 'id' && key !== 'source' && key !== 'target') {
                  changeOps.push({
                      name: key,
                      oldValue: oldData[key],
                      newValue: (newData as any)[key]
                  });
              }
          }
      }

      if (changeOps.length > 0) {
          this.ur.action('updateEdgeData', { elementId: edgeId, changes: changeOps },
              (args) => {
                  const ele = this.cy.getElementById(args.elementId);
                  if (ele.nonempty()) args.changes.forEach(op => ele.data(op.name, op.newValue));
                  return args;
              },
              (undoArgs) => {
                  const ele = this.cy.getElementById(undoArgs.elementId);
                  if (ele.nonempty()) undoArgs.changes.forEach(op => ele.data(op.name, op.oldValue));
              }
          );
          this.queueNotify([edge.json() as unknown as ElementDefinition]);
      }
  }

  deleteEdge(edgeId: string): void {
      if (!this.cy) return;
      const edge = this.cy.getElementById(edgeId);
      if (edge.empty() || !edge.isEdge()) {
           console.warn(`Edge ${edgeId} not found for deletion.`);
           return;
      }

      const removedCollection = this.ur.do('remove', edge);

      if (removedCollection && removedCollection.length > 0) {
          this.queueNotify(removedCollection.jsons() as unknown as ElementDefinition[]);
      }
  }

  // --- Cluster Operations ---

  // Existing addCluster adapted for signature
  async addCluster(clusterData: Partial<Cluster>): Promise<string> {
      if (!this.cy) return Promise.reject("GraphService not initialized");

      const clusterId = clusterData.id && String(clusterData.id).length >= 10 ? clusterData.id : this.generateId();
      const existingCluster = this.cy.getElementById(clusterId);
      if (existingCluster.nonempty()) {
          console.warn(`Cluster with ID ${clusterId} already exists. Returning existing ID.`);
          return Promise.resolve(clusterId);
      }

      const now = new Date().toISOString();
      const elData: Cluster & { type: NodeType } = {
          // Defaults for Cluster type
          id: clusterId,
          title: 'Untitled Cluster',
          createdAt: now,
          updatedAt: now,
          // Merge provided data
          ...clusterData,
          // Explicitly set core fields
          id: clusterId,
          createdAt: clusterData.createdAt || now,
          updatedAt: clusterData.updatedAt || now,
          // Graph-specific type
          type: NodeType.CLUSTER
      };

      const el: ElementDefinition = {
          group: 'nodes' as ElementGroup,
          data: elData,
          // position: position // Add position if needed
      };

      const addedElements = this.ur.do('add', [el]);
      this.clusterExists.add(clusterId); // Add to tracker

      if (addedElements && addedElements.length > 0) {
          this.queueNotify([addedElements.first().json() as unknown as ElementDefinition]);
          return Promise.resolve(clusterId);
      } else if (this.cy.getElementById(clusterId).nonempty()) {
            this.queueNotify([this.cy.getElementById(clusterId).json() as unknown as ElementDefinition]);
            return Promise.resolve(clusterId);
      } else {
         return Promise.reject(`Failed to add cluster ${clusterId}`);
      }
  }

  // Existing updateCluster adapted for GraphElementData
  updateCluster(clusterId: string, updates: Partial<GraphElementData>): void {
      if (!this.cy) return;
      const node = this.cy.getElementById(clusterId);
      if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
           console.warn(`Cluster ${clusterId} not found or not a Cluster for update.`);
           return;
      }
      // Use the same logic as updateNote, adapted for clusters
      const oldData = { ...node.data() };
      const newData: Partial<GraphElementData> = {
          ...updates,
          updatedAt: new Date().toISOString()
      };

      const changeOps: { name: string; oldValue: any; newValue: any }[] = [];
      for (const key in newData) {
          if (Object.prototype.hasOwnProperty.call(newData, key) && oldData[key] !== (newData as any)[key]) {
              if (key !== 'id' && key !== 'type' && key !== 'createdAt') {
                  changeOps.push({ name: key, oldValue: oldData[key], newValue: (newData as any)[key] });
              }
          }
      }

      if (changeOps.length > 0) {
          this.ur.action('updateNodeData', { elementId: clusterId, changes: changeOps }, // Reuse node update action
              (args) => {
                  const ele = this.cy.getElementById(args.elementId);
                  if (ele.nonempty()) args.changes.forEach(op => ele.data(op.name, op.newValue));
                  return args;
              },
              (undoArgs) => {
                  const ele = this.cy.getElementById(undoArgs.elementId);
                  if (ele.nonempty()) undoArgs.changes.forEach(op => ele.data(op.name, op.oldValue));
              }
          );
          this.queueNotify([node.json() as unknown as ElementDefinition]);
      } else if (!updates.updatedAt) {
          node.data('updatedAt', newData.updatedAt);
          this.queueNotify([node.json() as unknown as ElementDefinition]);
      }
  }

  // Existing deleteCluster adapted for void return and handling members
  deleteCluster(clusterId: string): void {
      if (!this.cy) return;
      const node = this.cy.getElementById(clusterId);
      if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
           console.warn(`Cluster ${clusterId} not found for deletion.`);
           return; // Changed to void
      }

      // Find nodes that considered this cluster their parent OR had it in clusterId data field
      const memberNodes = this.cy.nodes(`[parent = "${clusterId}"], [clusterId = "${clusterId}"]`);
      const memberNodeIds = memberNodes.map(n => n.id());
      const originalParentMap = new Map<string, string | null>();
      memberNodes.forEach(n => originalParentMap.set(n.id(), n.parent().id() || null)); // Store original parent
      const originalClusterIdMap = new Map<string, string | undefined>();
       memberNodes.forEach(n => originalClusterIdMap.set(n.id(), n.data('clusterId'))); // Store original clusterId data

      // Use a custom action to handle cluster removal and member node updates
      this.ur.action('deleteClusterAndMembers',
          { clusterId: clusterId, memberNodeIds: memberNodeIds, originalParentMap, originalClusterIdMap },
          (args) => { // Do
              const clusterNode = this.cy.getElementById(args.clusterId);
              let removedElements: ElementDefinition[] = [];
              let removedClusterJson: ElementDefinition | null = null;

              // Move member nodes out first (to root or previous parent if tracked?)
              // Simple approach: Move to root (parent: null)
              const membersToUpdate = this.cy.nodes().filter(n => args.memberNodeIds.includes(n.id()));
              membersToUpdate.forEach(member => {
                  member.move({ parent: null }); // Move to root
                  member.data('clusterId', undefined); // Clear clusterId data field
                  removedElements.push(member.json() as unknown as ElementDefinition); // Record state change
              });

              // Now remove the cluster node itself
              if (clusterNode.nonempty()) {
                  removedClusterJson = clusterNode.json() as unknown as ElementDefinition;
                  const removedCol = this.cy.remove(clusterNode); // This remove is NOT tracked by ur.do here
                  removedElements = removedElements.concat(removedCol.jsons() as unknown as ElementDefinition[]);
              }

              this.clusterExists.delete(args.clusterId); // Update tracker

              return { ...args, removedElements, removedClusterJson }; // Pass data for undo
          },
          (undoArgs) => { // Undo
              // Add the cluster back first
              if (undoArgs.removedClusterJson) {
                  this.cy.add(undoArgs.removedClusterJson);
                  this.clusterExists.add(undoArgs.clusterId); // Add back to tracker
              }

              // Move member nodes back to the cluster parent and restore clusterId data
              const membersToRestore = this.cy.nodes().filter(n => undoArgs.memberNodeIds.includes(n.id()));
              membersToRestore.forEach(member => {
                    // Restore parent using original map
                    const originalParent = undoArgs.originalParentMap.get(member.id());
                    // Check if original parent was the cluster being deleted, otherwise maybe restore to previous?
                    // Simplest undo: move back into the restored cluster
                    if (originalParent === undoArgs.clusterId) {
                       member.move({ parent: undoArgs.clusterId });
                    } else {
                        // If it wasn't parented to this cluster originally, maybe just restore data?
                        // Or move back to originalParent if it exists? For now, just restore data.
                         member.move({ parent: undoArgs.clusterId }); // Move into cluster for simplicity
                    }
                    // Restore the clusterId data field
                    member.data('clusterId', undoArgs.originalClusterIdMap.get(member.id()));
              });
          }
      );

      const actionResult = this.ur.lastAction()?.result;
      const changedElements = actionResult?.removedElements || [];
       if (changedElements.length > 0) {
         this.queueNotify(changedElements);
       } else {
           // If action didn't run/return elements, maybe notify about intended removal
            this.queueNotify([node.json() as unknown as ElementDefinition]);
       }
       // Return type is void
  }

  // Internal helper for moveNodeToCluster to avoid double notification from addNote
  private moveNodeToClusterInternal(nodeId: string, clusterId: string | null): boolean {
       const node = this.cy.getElementById(nodeId);
       if (node.empty()) {
           console.warn(`Node ${nodeId} not found for moving to cluster.`);
           return false;
       }

       // Validate target cluster
       if (clusterId && !this.clusterExists.has(clusterId)) {
           console.warn(`Cannot move node ${nodeId} to non-existent cluster ${clusterId}.`);
           return false;
       }
       // Ensure target is a cluster node
       if (clusterId && this.cy.getElementById(clusterId).data('type') !== NodeType.CLUSTER) {
           console.warn(`Target ${clusterId} is not a cluster node.`);
           return false;
       }

       const oldClusterIdData = node.data('clusterId');
       const oldParentId = node.parent().id(); // Track compound parent change

       this.ur.action('moveNodeToCluster', {
           nodeId: nodeId,
           oldClusterIdData: oldClusterIdData,
           oldParentId: oldParentId,
           newClusterId: clusterId, // Can be null
       }, (args) => { // Do
           const currentNode = this.cy.getElementById(args.nodeId);
           if (currentNode.empty()) return args;

           // Update compound parentage
           currentNode.move({ parent: args.newClusterId });

           // Update the clusterId data field
           currentNode.data('clusterId', args.newClusterId);

           return args;
       }, (undoArgs) => { // Undo
           const currentNode = this.cy.getElementById(undoArgs.nodeId);
           if (currentNode.empty()) return;

           // Restore compound parentage
           currentNode.move({ parent: undoArgs.oldParentId });

           // Restore the clusterId data field
           currentNode.data('clusterId', undoArgs.oldClusterIdData);
       });

       // Notification is handled by the calling function (addNote or public moveNodeToCluster)
       return true;
  }


  // Existing moveNodeToCluster adapted for void return, null clusterId, and compound parents
  moveNodeToCluster(nodeId: string, clusterId: string | null): void {
       const success = this.moveNodeToClusterInternal(nodeId, clusterId);
       if (success) {
           // Notify about the change if successful
           const node = this.cy.getElementById(nodeId);
           if (node.nonempty()) {
              this.queueNotify([node.json() as unknown as ElementDefinition]);
           }
       }
       // Return type is void
  }

  // Uses compound node logic
  addNodeToCluster(nodeId: string, clusterId: string): void {
       if (!this.cy) return;
       const node = this.cy.getElementById(nodeId);
       const cluster = this.cy.getElementById(clusterId);

       if (node.empty() || !node.isNode()) {
           console.warn(`Node ${nodeId} not found for adding to cluster.`);
           return;
       }
       if (cluster.empty() || !cluster.isNode() || cluster.data('type') !== NodeType.CLUSTER) {
           console.warn(`Cluster ${clusterId} not found or is not a valid cluster node.`);
           return;
       }

       // Check if already in the target cluster
       if (node.parent().id() === clusterId) {
           console.log(`Node ${nodeId} is already in cluster ${clusterId}.`);
           return; // Already in the correct cluster
       }

       // Use the general moveNodeToParent method which handles undo/redo
       this.moveNodeToParent(nodeId, clusterId);

       // Additionally, ensure the clusterId data field is set (moveNodeToParent might not do this)
       if (node.data('clusterId') !== clusterId) {
           const oldClusterIdData = node.data('clusterId');
            this.ur.action('setClusterIdData', { nodeId, oldClusterIdData, newClusterId: clusterId },
               (args) => { this.cy.getElementById(args.nodeId)?.data('clusterId', args.newClusterId); return args; },
               (undoArgs) => { this.cy.getElementById(undoArgs.nodeId)?.data('clusterId', undoArgs.oldClusterIdData); }
            );
            this.queueNotify([node.json() as unknown as ElementDefinition]); // Notify about data change
       }

  }

  // Uses compound node logic
  removeNodeFromCluster(nodeId: string): void {
       if (!this.cy) return;
       const node = this.cy.getElementById(nodeId);

       if (node.empty() || !node.isNode()) {
           console.warn(`Node ${nodeId} not found for removing from cluster.`);
           return;
       }

       const parent = node.parent();
       // Check if it's actually in a cluster (or any parent)
       if (parent.empty() || parent.id() === undefined) {
           console.log(`Node ${nodeId} is not currently in a cluster (or parent).`);
            // Ensure clusterId data is also cleared if inconsistent
            if (node.data('clusterId')) {
                 const oldClusterIdData = node.data('clusterId');
                 this.ur.action('clearClusterIdData', { nodeId, oldClusterIdData },
                    (args) => { this.cy.getElementById(args.nodeId)?.data('clusterId', undefined); return args; },
                    (undoArgs) => { this.cy.getElementById(undoArgs.nodeId)?.data('clusterId', undoArgs.oldClusterIdData); }
                 );
                 this.queueNotify([node.json() as unknown as ElementDefinition]);
            }
           return; // Not in a cluster
       }

       // Use moveNodeToParent to move to root (null parent)
       this.moveNodeToParent(nodeId, null);

       // Ensure clusterId data field is also cleared
        if (node.data('clusterId')) {
             const oldClusterIdData = node.data('clusterId');
             this.ur.action('clearClusterIdData', { nodeId, oldClusterIdData },
                (args) => { this.cy.getElementById(args.nodeId)?.data('clusterId', undefined); return args; },
                (undoArgs) => { this.cy.getElementById(undoArgs.nodeId)?.data('clusterId', undoArgs.oldClusterIdData); }
             );
             this.queueNotify([node.json() as unknown as ElementDefinition]); // Notify about data change
        }
  }

  // --- Tag Operations ---

  // Existing tagNote adapted for void return
  tagNote(noteId: string, tagName: string): void {
      if (!this.cy) return;
      const note = this.cy.getElementById(noteId);
      if (note.empty() || note.data('type') !== NodeType.NOTE) {
           console.warn(`Node ${noteId} not found or not a Note, cannot add tag.`);
           return; // Changed to void
      }

      const trimmedTagName = tagName.trim();
      const tagId = slug(trimmedTagName); // Use slug as the tag node ID
      if (!tagId) {
          console.warn(`Invalid tag name "${tagName}" resulted in empty slug.`);
          return; // Changed to void
      }

      // Use action for composite operation (add tag node if needed, add edge)
      this.ur.action('tagNote', { noteId, tagId, tagName: trimmedTagName },
          (args) => { // Do
              let currentTagNode = this.cy.getElementById(args.tagId);
              let addedElementDefs: ElementDefinition[] = [];
              let createdTagNode = false;
              let tagNodeJson: ElementDefinition | null = null;

              // Create tag node if it doesn't exist
              if (currentTagNode.empty()) {
                  const tagEl: ElementDefinition = {
                      group: 'nodes' as ElementGroup,
                      data: {
                          id: args.tagId,
                          type: NodeType.TAG,
                          title: args.tagName
                      }
                  };
                  this.cy.add(tagEl); // Add directly here, remove in undo
                  tagNodeJson = tagEl;
                  addedElementDefs.push(tagEl);
                  createdTagNode = true;
                  currentTagNode = this.cy.getElementById(args.tagId); // Get reference to added node
              }

              let addedEdgeJson: ElementDefinition | null = null;
              // Add edge if it doesn't exist
              if (!this.edgeExists(args.noteId, args.tagId, EdgeType.HAS_TAG)) {
                  const edgeDef: ElementDefinition = {
                      group: 'edges' as ElementGroup,
                      data: {
                          id: this.generateEdgeId(args.noteId, args.tagId, EdgeType.HAS_TAG),
                          source: args.noteId,
                          target: args.tagId,
                          label: EdgeType.HAS_TAG
                      }
                  };
                   this.cy.add(edgeDef); // Add directly here, remove in undo
                   addedEdgeJson = edgeDef;
                   addedElementDefs.push(edgeDef);
              }

               return { ...args, addedElements: addedElementDefs, createdTagNode, tagNodeJson, addedEdgeJson };
          },
          (undoArgs) => { // Undo
              // Remove the edge if it was added by this action
               if (undoArgs.addedEdgeJson) {
                  this.cy.remove(this.cy.getElementById(undoArgs.addedEdgeJson.data.id));
               }
              // Remove the tag node ONLY if it was created by this action
               if (undoArgs.createdTagNode && undoArgs.tagNodeJson) {
                  this.cy.remove(this.cy.getElementById(undoArgs.tagNodeJson.data.id));
               }
          }
      );

      const actionResult = this.ur.lastAction()?.result;
      const changedElements = actionResult?.addedElements || [];
      if (changedElements.length > 0) {
          this.queueNotify(changedElements);
      }
      // Return type is void
  }

  untagNote(noteId: string, tagName: string): void {
      if (!this.cy) return;
      const note = this.cy.getElementById(noteId);
      if (note.empty() || !note.isNode()) {
           console.warn(`Node ${noteId} not found for untagging.`);
           return;
      }

      const tagId = slug(tagName.trim());
      if (!tagId) {
          console.warn(`Invalid tag name "${tagName}" for untagging.`);
          return;
      }

      const tagNode = this.cy.getElementById(tagId);
      if (tagNode.empty() || tagNode.data('type') !== NodeType.TAG) {
           console.warn(`Tag node with ID ${tagId} (from name "${tagName}") not found.`);
           return;
      }

      // Find the specific edge connecting the note and tag
      const edgeSelector = `edge[label = "${EdgeType.HAS_TAG}"][source = "${noteId}"][target = "${tagId}"]`;
      const edgeToRemove = this.cy.edges(edgeSelector).first(); // Assume only one such edge

      if (edgeToRemove.empty()) {
           console.warn(`Tag edge from ${noteId} to ${tagId} not found.`);
           return;
      }

      // Remove the edge using undo/redo
      const removed = this.ur.do('remove', edgeToRemove);

      if (removed && removed.length > 0) {
         this.queueNotify(removed.jsons() as unknown as ElementDefinition[]);

         // Optional: Check if the tag node is now orphaned (has no connections)
         // const tagNodeCheck = this.cy.getElementById(tagId); // Re-fetch after edge removal
         // if (tagNodeCheck.nonempty() && tagNodeCheck.connectedEdges().length === 0) {
         //    console.log(`Tag node ${tagId} is now orphaned. Consider removing it.`);
         //    // Add logic to remove orphaned tag node if desired, also with undo/redo
         //    // this.ur.do('remove', tagNodeCheck);
         //    // this.queueNotify(...)
         // }
      }
  }

  getNotesByTag(tagName: string): Note[] {
      if (!this.cy) return [];
      const tagId = slug(tagName.trim());
      if (!tagId) return [];

      const tagNode = this.cy.getElementById(tagId);
      if (tagNode.empty() || tagNode.data('type') !== NodeType.TAG) return [];

      // Find incoming 'HAS_TAG' edges and get their source nodes (the notes)
      const notes = tagNode.incomers(`edge[label = "${EdgeType.HAS_TAG}"]`)
                           .sources(`node[type = "${NodeType.NOTE}"]`); // Ensure sources are notes

      return notes.map(node => node.data() as Note).filter(data => !!data);
  }

  // --- Querying & Selection ---

  // Existing searchNodes - implementation is fine
  searchNodes(query: string, types: NodeType[]): NodeCollection {
      if (!this.cy) return this.cy.collection() as NodeCollection; // Return empty collection if not initialized
      if (!query || query.trim() === '') {
          return this.cy.collection() as NodeCollection;
      }
      if (!types || types.length === 0) {
          // Default to searching notes if no types provided? Or return empty?
          // types = [NodeType.NOTE]; // Example default
           return this.cy.collection() as NodeCollection;
      }

      // Escape special characters for Cytoscape attribute selectors
      const sanitizedQuery = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      // Build selector for each type, searching in 'title' attribute case-insensitively (@*=)
      const selectors = types.map(type => `node[type = "${type}"][title @*= "${sanitizedQuery}"]`);
      const finalSelector = selectors.join(', '); // Combine selectors with comma (OR)

      try {
          return this.cy.$(finalSelector);
      } catch (e) {
          console.error(`Error executing search selector: "${finalSelector}"`, e);
          return this.cy.collection() as NodeCollection; // Return empty on error
      }
  }

  // Existing getRelatedNodes adapted for return type and cluster filter
  getRelatedNodes(nodeId: string, includeClusters: boolean = false): (Note | Cluster)[] {
      if (!this.cy) return [];
      const node = this.cy.getElementById(nodeId);
      if (node.empty() || !node.isNode()) return [];

      let neighbors = node.neighborhood().nodes(); // Get all neighboring nodes

      // Filter based on type and includeClusters flag
      const relatedNodes = neighbors.filter(n => {
          const type = n.data('type');
          if (type === NodeType.NOTE) return true;
          if (includeClusters && type === NodeType.CLUSTER) return true;
          // Add other types here if needed, e.g., TAG, CONCEPT
          // if (type === NodeType.TAG) return true;
          return false;
      });

      // Map data to the expected return type array
      return relatedNodes.map(n => n.data() as Note | Cluster) // Adjust cast as needed
                        .filter(data => !!data);
  }

  // Existing backlinks implementation
  getBacklinks(nodeId: string): any[] {
      if (!this.cy) return [];
      const node = this.cy.getElementById(nodeId);
      if (node.empty() || !node.isNode()) return [];

      // Find incoming edges (any type) and get their source nodes
      const backlinkingNodes = (node as NodeSingular).incomers('edge').sources();

      // Map to desired format
      return backlinkingNodes.map(sourceNode => ({
          id: sourceNode.id(),
          title: sourceNode.data('title') || 'Untitled', // Provide default title
          type: sourceNode.data('type') || undefined // Include type if available
      })).filter(data => !!data.id); // Ensure valid data
  }

  // Existing connections implementation
  getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]> {
      const defaultResult = { tag: [], concept: [], mention: [] };
      if (!this.cy) return defaultResult;
      const node = this.cy.getElementById(nodeId);
      if (node.empty() || !node.isNode()) return defaultResult;

      const nodeSingular = node as NodeSingular;

      // Helper to get targets of outgoing edges of a specific type
      const getConnectedTargets = (edgeType: EdgeType): any[] => {
          const outgoingEdges = nodeSingular.connectedEdges(`edge[label = "${edgeType}"][source = "${nodeId}"]`);
          return outgoingEdges.targets().map(target => ({
              id: target.id(),
              title: target.data('title') || 'Untitled',
              type: target.data('type') || undefined
          })).filter(d => !!d.id);
      };

      // Helper to get sources of incoming edges (useful for mentions, etc.)
       const getConnectingSources = (edgeType: EdgeType): any[] => {
           const incomingEdges = nodeSingular.connectedEdges(`edge[label = "${edgeType}"][target = "${nodeId}"]`);
           return incomingEdges.sources().map(source => ({
               id: source.id(),
               title: source.data('title') || 'Untitled',
               type: source.data('type') || undefined
           })).filter(d => !!d.id);
       };

      // Populate the result object
      return {
          tag: getConnectedTargets(EdgeType.HAS_TAG),
          concept: getConnectedTargets(EdgeType.HAS_CONCEPT),
          // Decide if mentions are outgoing or incoming based on EdgeType meaning
          mention: getConnectedTargets(EdgeType.MENTIONS) // Or use getConnectingSources if mentions point *to* this node
      };
  }

  selectNode(nodeId: string): void { this.selectElement(nodeId); }
  selectEdge(edgeId: string): void { this.selectElement(edgeId); }
  selectCluster(clusterId: string): void { this.selectElement(clusterId); }

  clearSelection(): void {
      this.cy?.elements().unselect();
      // TODO: Notify about selection change? (Optional)
  }

  focusNode(nodeId: string): void {
      if (!this.cy) return;
      const node = this.cy.getElementById(nodeId);
      if (node.length > 0 && node.isNode()) {
          // Animate viewport to center on the node
          this.cy.animate({
              center: {
                  eles: node
              },
              zoom: Math.max(this.cy.zoom(), 1.2), // Zoom in slightly if not already zoomed
              duration: 400 // Animation duration
          });
      } else {
           console.warn(`Node with ID ${nodeId} not found for focusing.`);
      }
  }

  fitView(elementIds?: string[]): void {
      if (!this.cy) return;
      let elesToFit: CollectionReturnValue;

      if (elementIds && elementIds.length > 0) {
          const selector = elementIds.map(id => `#${id}`).join(', ');
          elesToFit = this.cy.elements(selector);
          if (elesToFit.empty()) {
              console.warn("Specified elements for fitView not found. Fitting all elements.");
              elesToFit = this.cy.elements(); // Fallback to all elements
          }
      } else {
          elesToFit = this.cy.elements(); // Default to all elements
      }

      if (elesToFit.length > 0) {
          this.cy.animate({
              fit: {
                  eles: elesToFit,
                  padding: 60 // Add some padding around the fitted elements
              },
              duration: 400 // Animation duration
          });
      } else {
           // If no elements exist at all, reset view perhaps?
           this.cy.animate({ fit: { padding: 60 }, duration: 400 });
      }
  }


  // --- Utility ---

  generateId(): string {
    // Use the imported utility function
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

  // --- Keep existing specific methods if needed ---
  public clearGraph(): void {
    if (!this.cy) return;
    const removed = this.cy.elements().jsons() as unknown as ElementDefinition[];
    // Use initializeGraph which handles removal and index clearing
    this.initializeGraph();
    this.ur.reset(); // Clear undo stack after full clear
    if (removed.length > 0) {
      this.queueNotify(removed); // Notify about the removed elements
    }
  }

  public getNodesByType(type: NodeType): NodeCollection {
    if (!this.cy) return this.cy.collection() as NodeCollection;
    return this.cy.$(`node[type = "${type}"]`);
  }

  public importFromStore(notes: Note[], clusters: Cluster[]) {
     if (!this.cy) return;
     this.cy.startBatch();
     try {
       this.initializeGraph(); // Clear existing graph first

       const elements: ElementDefinition[] = [];

       // Add Clusters first (as they might be parents)
       clusters.forEach(cluster => {
         const clusterId = cluster.id || this.generateId();
         if (!cluster.id) cluster.id = clusterId; // Ensure ID is set back
         this.clusterExists.add(clusterId);
         elements.push({
           group: 'nodes' as ElementGroup,
           data: {
             ...cluster,
             id: clusterId, // Ensure ID consistency
             type: NodeType.CLUSTER,
             createdAt: cluster.createdAt || new Date().toISOString(),
             updatedAt: cluster.updatedAt || new Date().toISOString(),
           }
         });
       });

       // Add Notes
       notes.forEach(note => {
         const noteId = note.id || this.generateId();
          if (!note.id) note.id = noteId; // Ensure ID is set back
         const slugTitle = slug(note.title || '');
         const parentId = note.parentId; // Determine parent (folder or maybe cluster if used that way)
         const clusterDataId = note.clusterId; // Store intended cluster relation

         elements.push({
           group: 'nodes' as ElementGroup,
           data: {
             ...note,
             id: noteId, // Ensure ID consistency
             type: NodeType.NOTE,
             slugTitle: slugTitle,
             createdAt: note.createdAt || new Date().toISOString(),
             updatedAt: note.updatedAt || new Date().toISOString(),
             parent: parentId, // Set compound parent if parentId exists
             clusterId: clusterDataId, // Store cluster relationship in data
           }
         });
         if (note.title) {
              this.titleIndex.set(slugTitle, noteId);
         }
       });

       this.cy.add(elements);

       // Add edges AFTER nodes are added (e.g., IN_CLUSTER edges)
       const edgeElements: ElementDefinition[] = [];
       notes.forEach(note => {
           // Optional: Add IN_CLUSTER edges if needed, though compound parentage might be sufficient
           // if (note.clusterId && this.clusterExists.has(note.clusterId)) {
           //    const edgeId = this.generateEdgeId(note.id!, note.clusterId, EdgeType.IN_CLUSTER);
           //    edgeElements.push({
           //     group: 'edges' as ElementGroup,
           //     data: { id: edgeId, source: note.id!, target: note.clusterId, label: EdgeType.IN_CLUSTER }
           //   });
           // }
           // Add other edge types based on note data (e.g., links, tags) if necessary
       });

       if (edgeElements.length > 0) {
          this.cy.add(edgeElements);
       }

       this.ur.reset(); // Clear undo stack after store import
       this.ur.start();

     } catch(error) {
         console.error("Error during importFromStore:", error);
     }
     finally {
       this.cy.endBatch();
     }

     this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
   }

   public exportToStore(): { notes: Note[]; clusters: Cluster[] } {
     const notes = this.getNodes(); // Use the specific getter
     const clusters = this.getClusters(); // Use the specific getter

     // Add parentId and clusterId back to notes based on graph structure
     notes.forEach(note => {
        const node = this.cy.getElementById(note.id);
        if (node.nonempty()) {
           note.parentId = node.parent()?.id(); // Get parent ID from compound structure
           // clusterId is likely already in the data from import/updates
           // note.clusterId = node.data('clusterId'); // Ensure it's up-to-date if needed
        }
     });

     return { notes, clusters };
   }

}

// Export a singleton instance (if desired)
// export const graphService = new GraphService();
// export default graphService;