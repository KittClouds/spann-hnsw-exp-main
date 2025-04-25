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
  // Import CytoscapeOptions for better typing of cy.json() results
  CytoscapeOptions,
  // Import Stylesheet for better typing of cy.style() results
  Stylesheet
} from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';
import { generateNodeId, NodeId, ClusterId } from '@/lib/utils/ids';

// Register plugins
cytoscape.use(automove);
cytoscape.use(undoRedo);

// Node and Edge type enums
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

// TypeScript interfaces for graph JSON
// Keep CyElementJSON extending ElementDefinition for clarity if needed elsewhere,
// but internally we often work directly with ElementDefinition.
export interface CyElementJSON extends ElementDefinition {}

export interface GraphMeta {
  app: string;
  version: number;
  exportedAt: string;
}

export interface GraphJSON {
  meta: GraphMeta;
  data?: Record<string, unknown>;
  layout?: LayoutOptions;
  style?: StylesheetJson[];
  viewport?: { zoom: number; pan: Position };
  elements: CyElementJSON[]; // Keep this using CyElementJSON for the external interface
}

export class GraphService {
  private cy: Core;
  private ur: ReturnType<Core['undoRedo']>;
  private titleIndex = new Map<string, string>();
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = [];
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>();

  constructor() {
    this.cy = cytoscape({ headless: true });
    this.ur = this.cy.undoRedo();

    // Configure automove to keep notes connected to their folders
    // Ensure the extension is typed correctly if possible, otherwise use 'any' temporarily
    (this.cy as any).automove({
      nodesMatching: 'node[type = "note"]',
      reposition: 'drag',
      dragWith: 'node[type = "folder"]'
    });

    this.initializeGraph();
  }

  private initializeGraph() {
    // Clear existing elements
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();

    // Check if standard root exists, add if not
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

    // Check if clusters root exists, add if not
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

  private queueNotify(defs: ElementDefinition[]): void {
    this.pendingChanges.push(...defs);

    const MAX_BUFFER = 200;
    if (this.pendingChanges.length >= MAX_BUFFER) {
      this.flushNotify();
      return;
    }

    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    requestAnimationFrame(() => {
      this.notifyScheduled = false;
      this.flushNotify();
    });
  }

  private flushNotify(): void {
    // Ensure we only notify if there are actual changes
    if (this.pendingChanges.length > 0) {
        const changes = [...this.pendingChanges]; // Clone to avoid issues if listeners modify things
        this.pendingChanges = [];
        this.changeListeners.forEach(l => l(changes));
    }
  }


  private edgeExists(srcId: string, tgtId: string, label: EdgeType): boolean {
    const src = this.cy.getElementById(srcId);
    if (src.empty()) return false;

    // Use template literal for selector correctness
    return !src
      .connectedEdges(`[label = "${label}"][target = "${tgtId}"]`)
      .empty();
  }

  public undo() { this.ur.undo(); }
  public redo() { this.ur.redo(); }

  public addChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners.push(listener);
  }

  public removeChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners = this.changeListeners.filter((l) => l !== listener);
  }

  public getGraph(): Core {
    return this.cy;
  }

  // ---------- EXPORT WHOLE GRAPH ----------
  public exportGraph(opts: {includeStyle?: boolean} = {}): GraphJSON {
    // Fix: Cast the result of cy.json() to CytoscapeOptions for proper typing
    const cyJson = this.cy.json() as CytoscapeOptions;
    const g: GraphJSON = {
      meta: { app: 'BlockNote Graph', version: 2, exportedAt: new Date().toISOString() },
      data: this.cy.data(),
      // Fix: Access layout from the typed cyJson object
      layout: cyJson.layout,
      // Fix: Ensure cy.style() returns Stylesheet and call .json() on it
      style: opts.includeStyle ? (this.cy.style() as Stylesheet).json() : undefined,
      viewport: { zoom: this.cy.zoom(), pan: this.cy.pan() },
      // Fix: Use cy.elements().jsons() for a direct array of ElementDefinition.
      // Cast to CyElementJSON[] using 'unknown' as requested by the error message context,
      // although cy.elements().jsons() directly returning ElementDefinition[] which CyElementJSON extends is usually sufficient.
      elements: this.cy.elements().jsons() as unknown as CyElementJSON[]
      // Alternative based on original code & error message:
      // elements: (cyJson.elements || []) as unknown as CyElementJSON[]
    };
    return g;
  }

  // ---------- IMPORT WHOLE GRAPH ----------
  public importGraph(g: GraphJSON): void {
    if (!g || !g.elements || !Array.isArray(g.elements)) {
      console.error("Invalid graph data format", g);
      return;
    }

    this.cy.startBatch();
    try {
      // Ensure IDs are valid before adding
      const elements = g.elements.map((e: ElementDefinition) => {
        // Ensure e and e.data exist before accessing id
        if (e && e.data) {
            // Generate ID if it's missing or too short (simple heuristic)
          if (!e.data.id || String(e.data.id).length < 15) {
             console.warn(`Element missing valid ID, generating new one:`, e.data);
             e.data.id = generateNodeId();
          }
        } else if (e) {
             // Handle case where e exists but e.data doesn't (less common but possible)
             console.warn(`Element missing data field, attempting to generate ID:`, e);
             // We need *some* data structure, minimal case:
             e.data = { id: generateNodeId() };
        } else {
            console.warn(`Encountered null or undefined element definition in import.`);
            // Return null or filter it out later
            return null;
        }
        return e;
      }).filter(e => e !== null) as ElementDefinition[]; // Filter out any nulls from invalid definitions

      // Fix: Pass the elements object correctly typed for cy.json update
      // Cast the partial update object to CytoscapeOptions to satisfy the type checker.
      this.cy.json({ elements: elements } as CytoscapeOptions);

      if (g.layout) this.cy.json({ layout: g.layout } as CytoscapeOptions);
       // Fix: Ensure cy.style() returns Stylesheet before chaining methods.
       // Also ensure g.style is valid StylesheetJson[]
      if (g.style && Array.isArray(g.style)) {
        (this.cy.style() as Stylesheet).fromJson(g.style).update(); // .update() takes 0 args
      }
      if (g.data) this.cy.data(g.data);
      if (g.viewport) {
        this.cy.zoom(g.viewport.zoom);
        this.cy.pan(g.viewport.pan);
      }

      // Rebuild titleIndex and clusterExists Set
      this.titleIndex.clear();
      this.clusterExists.clear();

      this.cy.nodes().forEach(node => {
          const type = node.data('type');
          const title = node.data('title');
          const id = node.id(); // Get id safely

          if (type === NodeType.NOTE && title && id) {
             this.titleIndex.set(slug(title), id);
          } else if (type === NodeType.CLUSTER && id) {
             this.clusterExists.add(id);
          }
      });

    } catch (error) {
        console.error("Error during graph import:", error);
        // Optionally re-throw or handle more gracefully
    }
    finally {
      this.cy.endBatch();
    }

    // Use jsons() which returns ElementDefinition[] directly.
    // Cast with 'unknown' as per error message context/requirement.
    const elementDefs = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.queueNotify(elementDefs);
  }

  // ---------- EXPORT ONE ELEMENT ----------
  public exportElement(ele: SingularElementArgument): CyElementJSON {
     // ele is already SingularElementArgument, which has .json() method
    // The return type ElementDefinition is compatible with CyElementJSON
    return ele.json();
  }

  // ---------- IMPORT / PATCH ONE ELEMENT ----------
  public importElement(json: CyElementJSON): void {
    // Ensure json and json.data exist and json.data.id is valid
    if (!json || !json.data || !json.data.id) {
        console.error("Invalid element JSON for import:", json);
        return;
    }
    const elementId = json.data.id;
    const exists = this.cy.getElementById(elementId);

    if (exists.nonempty()) {
      exists.json(json); // Update existing element
    } else {
      this.cy.add(json); // Add new element

      // Update indexes if newly added
      if (json.data.type === NodeType.NOTE && json.data.title) {
        this.titleIndex.set(slug(json.data.title), elementId);
      }

      if (json.data.type === NodeType.CLUSTER) {
        this.clusterExists.add(elementId);
      }
    }

    this.queueNotify([json]); // Notify about the change
  }

  public clearGraph(): void {
    // Fix: Ensure we're using ElementDefinition[] by explicitly casting via unknown
    const removed = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();
    // Only notify if elements were actually removed
    if (removed.length > 0) {
      this.queueNotify(removed);
    }
    this.initializeGraph(); // Re-add root nodes
  }


  public getNodesByType(type: NodeType): NodeCollection {
    return this.cy.$(`node[type = "${type}"]`);
  }

  public addNote({ id, title, content = [], createdAt, updatedAt, path }: {
    id?: string;
    title: string;
    content?: any[]; // Consider defining a stricter type for content if possible
    createdAt?: string;
    updatedAt?: string;
    path?: string;
  }, folderId?: string, clusterId?: string): NodeSingular {
    const nodeId = id && String(id).length >= 15 ? id : generateNodeId(); // Ensure id is treated as string for length check
    const existingNode = this.cy.getElementById(nodeId);
    if (existingNode.nonempty()) {
      // Optionally update existing node here if needed, or just return it
      console.warn(`Note with ID ${nodeId} already exists. Returning existing node.`);
      return existingNode as NodeSingular;
    }

    const now = new Date().toISOString();
    const slugTitle = slug(title);

    const el: ElementDefinition = {
      group: 'nodes' as ElementGroup,
      data: {
        id: nodeId,
        type: NodeType.NOTE,
        title,
        slugTitle,
        content, // Assuming content is serializable JSON
        path: path || '/', // Provide default path
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
        // Use parentId for compound graphs or specific folder logic, ensure consistency
        // If 'parent' is for cytoscape compound nodes, use it here.
        // If it's custom app logic (like folderId), handle separately or store in data.
        parent: folderId, // Cytoscape's parent for compound nodes
        folderId: folderId, // Store custom folder relationship if needed separately
        clusterId: undefined // Initialize clusterId, will be set below or by moveNodeToCluster
      }
    };

    // Use ur.do for undo/redo support
    const addedElements = this.ur.do('add', [el]);
    this.titleIndex.set(slugTitle, nodeId);

    // Get the newly added node (ur.do might return the collection)
    const newNode = this.cy.getElementById(nodeId) as NodeSingular;

    // Handle initial cluster assignment
    if (clusterId) {
        if (this.clusterExists.has(clusterId)) {
             this.moveNodeToCluster(nodeId, clusterId); // Creates edge and updates data
        } else {
            console.warn(`Attempted to add note ${nodeId} to non-existent cluster ${clusterId}. Storing ID in data.`);
            // Store clusterId in data only if moveNodeToCluster wasn't called
            newNode.data('clusterId', clusterId);
            // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
            this.queueNotify([newNode.json() as unknown as ElementDefinition]);
        }
    } else {
        // Ensure clusterId data field is absent or null if no cluster is assigned
        newNode.data('clusterId', undefined);
        // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
        this.queueNotify([newNode.json() as unknown as ElementDefinition]);
    }


    return newNode;
  }


  public moveNodeToCluster(nodeId: string, clusterId?: string): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
        console.warn(`Node ${nodeId} not found for moving to cluster.`);
        return false;
    }

    // Check if target cluster exists if a clusterId is provided
    if (clusterId && !this.clusterExists.has(clusterId)) {
      console.warn(`Cannot move node ${nodeId} to non-existent cluster ${clusterId}.`);
      return false;
    }

    const edgeSelector = `edge[label = "${EdgeType.IN_CLUSTER}"][source = "${nodeId}"]`;
    const existingEdges = this.cy.edges(edgeSelector); // Get all matching edges

    // --- Batch updates for efficiency and undo/redo ---
    this.ur.action('moveNodeToCluster', {
        nodeId: nodeId,
        oldClusterId: node.data('clusterId'),
        newClusterId: clusterId,
        removedEdges: [],
        addedEdges: [],
        movedEdges: [] // Keep track of moved edges if needed for complex undo
    }, (args) => { // DO action
        const currentClusterId = args.newClusterId;
        const currentNode = this.cy.getElementById(args.nodeId);
        if (currentNode.empty()) return; // Node might have been deleted

        const currentEdges = this.cy.edges(`edge[label = "${EdgeType.IN_CLUSTER}"][source = "${args.nodeId}"]`);
        const edgesToRemove = currentEdges.filter(edge => edge.target().id() !== currentClusterId);
        const targetEdgeExists = currentEdges.filter(edge => edge.target().id() === currentClusterId).nonempty();

        // Remove edges pointing to wrong clusters
        if (edgesToRemove.nonempty()) {
            // Fix: Ensure we're using ElementDefinition[] by explicitly casting via unknown
            args.removedEdges = edgesToRemove.jsons() as unknown as ElementDefinition[];
            this.cy.remove(edgesToRemove); // Use cy.remove for potential batching benefits
        }

        // Add new edge if needed and doesn't exist
        if (currentClusterId && !targetEdgeExists && this.clusterExists.has(currentClusterId)) {
            const edgeDef: ElementDefinition = {
                group: 'edges' as ElementGroup,
                data: {
                    id: `${EdgeType.IN_CLUSTER}_${args.nodeId}_${currentClusterId}`,
                    source: args.nodeId,
                    target: currentClusterId,
                    label: EdgeType.IN_CLUSTER
                }
            };
            args.addedEdges = [edgeDef];
            this.cy.add(edgeDef);
        }

        // Update the node's data
        currentNode.data('clusterId', currentClusterId);
        // Return data needed for UNDO
        return { nodeId: args.nodeId, oldClusterId: args.oldClusterId, newClusterId: args.newClusterId, removedEdges: args.removedEdges, addedEdges: args.addedEdges };

    }, (undoArgs) => { // UNDO action
        const originalClusterId = undoArgs.oldClusterId;
        const currentNode = this.cy.getElementById(undoArgs.nodeId);
        if (currentNode.empty()) return;

        const currentEdges = this.cy.edges(`edge[label = "${EdgeType.IN_CLUSTER}"][source = "${undoArgs.nodeId}"]`);
        const edgesToRemove = currentEdges.filter(edge => edge.target().id() !== originalClusterId);

        // Remove incorrectly added edges
        if (edgesToRemove.nonempty()) {
             this.cy.remove(edgesToRemove);
        }

        // Restore removed edges
        if (undoArgs.removedEdges && undoArgs.removedEdges.length > 0) {
             this.cy.add(undoArgs.removedEdges);
        }

        // Update node data back
        currentNode.data('clusterId', originalClusterId);
    });

    // --- Notify listeners outside the batch ---
    // Collect all potential changes (node data, added/removed edges)
    const changes: ElementDefinition[] = [];
    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    changes.push(node.json() as unknown as ElementDefinition); // Node data changed

    const actionResult = this.ur.lastAction()?.result; // Get results from ur.do
    if (actionResult) {
        if (actionResult.removedEdges) changes.push(...actionResult.removedEdges);
        if (actionResult.addedEdges) changes.push(...actionResult.addedEdges);
    }

    if (changes.length > 0) {
      this.queueNotify(changes);
    }

    return true;
  }


   public importFromStore(notes: Note[], clusters: Cluster[]) {
    this.cy.startBatch();
    try {
      this.initializeGraph(); // Clears graph and adds roots

      const elements: ElementDefinition[] = [];

      // Add clusters first so they exist when notes reference them
      clusters.forEach(cluster => {
        if (!cluster.id) {
            console.warn("Cluster missing ID during import from store:", cluster);
            cluster.id = generateNodeId(); // Assign an ID if missing
        }
        this.clusterExists.add(cluster.id);
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...cluster, // Spread existing cluster data
            type: NodeType.CLUSTER, // Ensure type is set correctly
            // Add default timestamps if missing
            createdAt: cluster.createdAt || new Date().toISOString(),
            updatedAt: cluster.updatedAt || new Date().toISOString(),
          }
        });
      });

      // Add notes
      notes.forEach(note => {
        if (!note.id) {
             console.warn("Note missing ID during import from store:", note);
             note.id = generateNodeId(); // Assign an ID if missing
        }
        const slugTitle = slug(note.title || ''); // Handle potential undefined title
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...note, // Spread existing note data
            type: NodeType.NOTE, // Ensure type is set correctly
            slugTitle: slugTitle,
            // Add default timestamps if missing
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString(),
            // Store parentId if using for compound nodes, otherwise handle relationship separately
            parent: note.parentId, // Assuming parentId is for cytoscape compound parent
            // Ensure clusterId is present, even if null/undefined
            clusterId: note.clusterId,
          }
        });
        // Add to title index
        if (note.title) {
             this.titleIndex.set(slugTitle, note.id);
        }
      });

      // Add all nodes first
      this.cy.add(elements);

      // Add edges after nodes exist
      const edgeElements: ElementDefinition[] = [];
      notes.forEach(note => {
        // Add CONTAINS edge (if parentId exists and parent node exists)
        if (note.parentId && this.cy.getElementById(note.parentId).nonempty()) {
          edgeElements.push({
            group: 'edges' as ElementGroup,
            data: {
              id: `contains_${note.parentId}_${note.id}`, // Swapped source/target order
              source: note.parentId,
              target: note.id,
              label: EdgeType.CONTAINS
            }
          });
        } else if (note.parentId) {
            console.warn(`Parent node ${note.parentId} not found for note ${note.id}`);
        }

        // Add IN_CLUSTER edge (if clusterId exists and cluster node exists)
        if (note.clusterId && this.clusterExists.has(note.clusterId)) {
           edgeElements.push({
            group: 'edges' as ElementGroup,
            data: {
              id: `${EdgeType.IN_CLUSTER}_${note.id}_${note.clusterId}`,
              source: note.id, // Source is the note
              target: note.clusterId, // Target is the cluster
              label: EdgeType.IN_CLUSTER
            }
          });
        } else if (note.clusterId) {
             console.warn(`Cluster node ${note.clusterId} not found for note ${note.id}`);
             // Optionally remove the clusterId from the node data if import fails
             // this.cy.getElementById(note.id).data('clusterId', undefined);
        }
      });

      // Add all edges
      if (edgeElements.length > 0) {
         this.cy.add(edgeElements);
      }

    } catch(error) {
        console.error("Error during importFromStore:", error);
    }
    finally {
      this.cy.endBatch();
    }

    // Notify about all elements added/updated
    // Fix: Ensure we're using ElementDefinition[] by explicitly casting via unknown
    this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
  }

  public exportToStore() {
    const nodes = this.cy.nodes().map(node => node.data());
    // Filter based on type and cast accurately
    const notes = nodes.filter(nodeData => nodeData.type === NodeType.NOTE) as Note[];
    const clusters = nodes.filter(nodeData => nodeData.type === NodeType.CLUSTER) as Cluster[];

    return {
      notes: notes,
      clusters: clusters
    };
  }

  public updateNote(id: string, updates: Partial<Note>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
        console.warn(`Node ${id} not found or not a Note for update.`);
        return false;
    }

    const oldTitle = node.data('title');
    const newTitle = updates.hasOwnProperty('title') ? updates.title : oldTitle; // Check if title is explicitly in updates
    const slugTitle = slug(newTitle || ''); // Handle potential null/undefined title

    // Prepare data, ensuring only valid Note properties are included
    // and handling potential undefined values from Partial<Note>
    const newData: Partial<Note> & { slugTitle?: string; updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };

    // Iterate over updates and add only valid keys for Note
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id' && key !== 'createdAt') {
             // Type assertion needed here if updates keys aren't strictly Note keys
             (newData as any)[key] = (updates as any)[key];
        }
    }

    // Add/update slugTitle if title changed
     if (updates.hasOwnProperty('title')) {
         newData.slugTitle = slugTitle;
     }

    // --- Use undo-redo for the data change ---
    // Group changes if multiple properties are updated
    const changeOps: { ele: NodeSingular; name: string; oldValue: any; newValue: any }[] = [];
    for (const key in newData) {
        if (key !== 'updatedAt' && Object.prototype.hasOwnProperty.call(newData, key)) { // Don't track updatedAt usually
            changeOps.push({
                ele: node as NodeSingular, // Cast needed
                name: key,
                oldValue: node.data(key),
                newValue: (newData as any)[key]
            });
        }
    }
    // Add updatedAt separately or decide if it needs undo
    node.data('updatedAt', newData.updatedAt); // Apply directly if not undoable

    // Apply changes via undo-redo if there are tracked changes
    if (changeOps.length > 0) {
        this.ur.action('updateNoteData', { changes: changeOps },
            (args) => { // DO
                args.changes.forEach(op => op.ele.data(op.name, op.newValue));
                return args; // Pass args to undo
            },
            (undoArgs) => { // UNDO
                undoArgs.changes.forEach(op => op.ele.data(op.name, op.oldValue));
            }
        );
    } else if (Object.keys(newData).length === 1 && newData.updatedAt) {
        // Only timestamp changed, might not need undo or complex handling
        node.data('updatedAt', newData.updatedAt);
    }
    // --- End undo-redo block ---

    // Update title index if title changed
    if (updates.hasOwnProperty('title') && oldTitle !== newTitle) {
        if (oldTitle) this.titleIndex.delete(slug(oldTitle));
        if (newTitle) this.titleIndex.set(slugTitle, id);
    }

    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }


  public deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    // Ensure it's actually a note before deleting
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
         console.warn(`Node ${id} not found or is not a Note.`);
         return false;
    }

    // Store JSON *before* removal for notification
    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    const removedJson = node.json() as unknown as ElementDefinition;
    const slugTitle = node.data('slugTitle'); // Get slug before removal

    // Use undo-redo (removes node and connected edges)
    const removedCollection = this.ur.do('remove', node);

    // Clean up index if title existed
    if (slugTitle) {
        this.titleIndex.delete(slugTitle);
    }

    // Notify with the JSON of the removed element(s)
    // ur.do('remove', ...) returns the removed collection. Use its jsons().
    // Fix: Ensure we're using ElementDefinition[] by explicitly casting via unknown
    const actualRemovedJsons = removedCollection.jsons() as unknown as ElementDefinition[];
    if (actualRemovedJsons.length > 0) {
       this.queueNotify(actualRemovedJsons);
    } else {
       // Fallback if ur.do didn't return collection correctly
       this.queueNotify([removedJson]);
    }

    return true;
  }


  public addCluster({ id, title, createdAt, updatedAt }: Partial<Cluster> = {}): NodeSingular {
    const clusterId = id && String(id).length >= 15 ? id : generateNodeId(); // Ensure ID validity
    const existingCluster = this.cy.getElementById(clusterId);
    if (existingCluster.nonempty()) {
        console.warn(`Cluster with ID ${clusterId} already exists. Returning existing cluster.`);
        return existingCluster as NodeSingular;
    }

    const now = new Date().toISOString();

    const el: ElementDefinition = {
      group: 'nodes' as ElementGroup,
      data: {
        id: clusterId,
        type: NodeType.CLUSTER,
        title: title || 'Untitled Cluster', // Default title
        createdAt: createdAt || now,
        updatedAt: updatedAt || now
      }
    };

    // Use undo-redo
    const addedElements = this.ur.do('add', [el]);
    this.clusterExists.add(clusterId); // Update internal set

    // Notify listeners
    this.queueNotify([el]); // Pass the definition used for adding

    return this.cy.getElementById(clusterId) as NodeSingular; // Return the added cluster
  }


  public updateCluster(id: string, updates: Partial<Cluster>): boolean {
    const node = this.cy.getElementById(id);
     if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
         console.warn(`Cluster ${id} not found for update.`);
         return false;
     }

    // Prepare data, excluding non-updatable fields
    const newData: Partial<Cluster> & { updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id' && key !== 'createdAt') {
            // Type assertion needed
            (newData as any)[key] = (updates as any)[key];
        }
    }

    // --- Use undo-redo for the data change ---
    const changeOps: { ele: NodeSingular; name: string; oldValue: any; newValue: any }[] = [];
    for (const key in newData) {
         if (key !== 'updatedAt' && Object.prototype.hasOwnProperty.call(newData, key)) { // Don't track updatedAt usually
            changeOps.push({
                ele: node as NodeSingular,
                name: key,
                oldValue: node.data(key),
                newValue: (newData as any)[key]
            });
        }
    }
     node.data('updatedAt', newData.updatedAt); // Apply directly

    if (changeOps.length > 0) {
        this.ur.action('updateClusterData', { changes: changeOps },
            (args) => { // DO
                args.changes.forEach(op => op.ele.data(op.name, op.newValue));
                return args;
            },
            (undoArgs) => { // UNDO
                undoArgs.changes.forEach(op => op.ele.data(op.name, op.oldValue));
            }
        );
    } else if (Object.keys(newData).length === 1 && newData.updatedAt) {
         node.data('updatedAt', newData.updatedAt);
    }
     // --- End undo-redo block ---


    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }


  public deleteCluster(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
         console.warn(`Cluster ${id} not found for deletion.`);
         return false;
    }

    // --- Pre-computation for cleanup ---
    // Find nodes belonging to this cluster to update their data
    const memberNodes = this.cy.nodes(`[clusterId = "${id}"]`);
    const memberNodeIds = memberNodes.map(n => n.id());

    // Get JSON before removal
    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    const removedJson = node.json() as unknown as ElementDefinition;


    // --- Use undo-redo for the cluster removal and member update ---
    this.ur.action('deleteClusterAndMembers', { clusterId: id, memberNodeIds: memberNodeIds },
        (args) => { // DO action
            const clusterNode = this.cy.getElementById(args.clusterId);
            const removedElements: ElementDefinition[] = [];
            let removedClusterJson: ElementDefinition | null = null;

            if (clusterNode.nonempty()) {
                // Fix: Cast via unknown
                removedClusterJson = clusterNode.json() as unknown as ElementDefinition;
                // Remove cluster and its connected edges (like IN_CLUSTER)
                const removedCol = this.cy.remove(clusterNode);
                // Fix: Cast via unknown
                removedElements.push(...removedCol.jsons() as unknown as ElementDefinition[]);
            }

             // Update member nodes: set their clusterId to undefined
             const membersToUpdate = this.cy.nodes().filter(n => args.memberNodeIds.includes(n.id()));
             membersToUpdate.forEach(member => {
                 member.data('clusterId', undefined);
                 // Fix: Cast via unknown
                 removedElements.push(member.json() as unknown as ElementDefinition); // Add updated member json for notification
             });


             return { removedElements, clusterId: args.clusterId, memberNodeIds: args.memberNodeIds, removedClusterJson }; // Data for undo and notification
        },
        (undoArgs) => { // UNDO action
            // Add back the cluster node and its edges if they were removed
            if (undoArgs.removedClusterJson) {
                this.cy.add(undoArgs.removedClusterJson); // Add cluster back
                // Note: Edges connected to the cluster were removed by cy.remove(clusterNode)
                // We might need to store and restore those edges explicitly if not handled automatically
                // For simplicity, assume IN_CLUSTER edges need recreation based on memberNodeIds
            }

            // Restore clusterId on member nodes
             const membersToRestore = this.cy.nodes().filter(n => undoArgs.memberNodeIds.includes(n.id()));
             membersToRestore.forEach(member => {
                 member.data('clusterId', undoArgs.clusterId);
                 // Recreate IN_CLUSTER edge if necessary (assuming it was removed)
                 if (this.cy.getElementById(undoArgs.clusterId).nonempty()) {
                      const edgeId = `${EdgeType.IN_CLUSTER}_${member.id()}_${undoArgs.clusterId}`;
                      if (this.cy.getElementById(edgeId).empty()) {
                           this.cy.add({
                               group: 'edges',
                               data: { id: edgeId, source: member.id(), target: undoArgs.clusterId, label: EdgeType.IN_CLUSTER }
                           });
                      }
                 }
             });

        });
     // --- End undo-redo block ---

    // Update internal set
    this.clusterExists.delete(id);

    // --- Notify listeners ---
    const actionResult = this.ur.lastAction()?.result;
    const changedElements = actionResult?.removedElements || [removedJson]; // Use result if available
     if (changedElements.length > 0) {
       this.queueNotify(changedElements);
     }

    return true;
  }


  // Assumes 'parent' manipulation for Cytoscape compound nodes
  public moveNode(nodeId: string, newParentId?: string | null): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
        console.warn(`Node ${nodeId} not found for moving.`);
        return false;
    }

    // Check if the new parent exists, allow null/undefined for moving to root
    if (newParentId && this.cy.getElementById(newParentId).empty()) {
        console.warn(`Target parent node ${newParentId} does not exist.`);
        return false;
    }

    // --- Use eles.move() for compound parent changes ---
    // This handles Cytoscape's internal parent updates and emits 'move' events.
    // It's often simpler than managing CONTAINS edges manually for compound graphs.

    const oldParentId = node.parent().id(); // Get current compound parent ID

    // Use undo-redo for the move operation
    this.ur.action('moveNodeCompound', { nodeId: nodeId, oldParentId: oldParentId, newParentId: newParentId || null }, // Store null for root
        (args) => { // DO action
            const nodeToMove = this.cy.getElementById(args.nodeId);
            if (nodeToMove.nonempty()) {
                nodeToMove.move({ parent: args.newParentId }); // Move to new parent (or null for root)
            }
            return args; // Pass data for undo
        },
        (undoArgs) => { // UNDO action
            const nodeToMove = this.cy.getElementById(undoArgs.nodeId);
             if (nodeToMove.nonempty()) {
                 nodeToMove.move({ parent: undoArgs.oldParentId }); // Move back to original parent
             }
        }
    );

    // --- Notify listeners ---
    // The 'move' event is automatically fired by eles.move().
    // We still need to notify our listeners about the data change (if 'parent' is stored in data)
    // and potentially the visual change. Sending the node's updated JSON covers this.
    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    this.queueNotify([node.json() as unknown as ElementDefinition]);

    return true;


    // --- Old manual CONTAINS edge logic (keep if not using compound nodes) ---
    /*
    const edgeSel = `edge[label = "${EdgeType.CONTAINS}"][target = "${nodeId}"]`; // Edge points TO the child
    const existingEdges = this.cy.edges(edgeSel); // Can have multiple? Should be only one parent edge.

    this.ur.action('moveNodeParent', { nodeId: nodeId, oldParentId: node.data('parentId'), newParentId: newParentId },
    (args) => { // DO
        const nodeToUpdate = this.cy.getElementById(args.nodeId);
        if (nodeToUpdate.empty()) return;

        const currentEdges = this.cy.edges(`edge[label = "${EdgeType.CONTAINS}"][target = "${args.nodeId}"]`);
        const removedEdges: ElementDefinition[] = [];
        const addedEdges: ElementDefinition[] = [];

        // Remove old parent edge(s)
        if (currentEdges.nonempty()) {
            removedEdges.push(...currentEdges.jsons() as unknown as ElementDefinition[]);
            this.cy.remove(currentEdges);
        }

        // Add new parent edge if newParentId is provided and exists
        if (args.newParentId && this.cy.getElementById(args.newParentId).nonempty()) {
            const edgeDef: ElementDefinition = {
                group: 'edges' as ElementGroup,
                data: {
                id: `contains_${args.newParentId}_${args.nodeId}`, // Correct source/target order
                source: args.newParentId,
                target: args.nodeId,
                label: EdgeType.CONTAINS
                }
            };
            addedEdges.push(edgeDef);
            this.cy.add(edgeDef);
        }

        // Update parent data field on the node
        nodeToUpdate.data('parentId', args.newParentId);

        return { ...args, removedEdges, addedEdges }; // Data for undo
    },
    (undoArgs) => { // UNDO
        const nodeToUpdate = this.cy.getElementById(undoArgs.nodeId);
        if (nodeToUpdate.empty()) return;

        const currentEdges = this.cy.edges(`edge[label = "${EdgeType.CONTAINS}"][target = "${undoArgs.nodeId}"]`);

        // Remove newly added edge
        if (currentEdges.nonempty()) {
             this.cy.remove(currentEdges);
        }

        // Restore old edges
        if (undoArgs.removedEdges.length > 0) {
            this.cy.add(undoArgs.removedEdges);
        }

        // Restore parent data field
        nodeToUpdate.data('parentId', undoArgs.oldParentId);
    });

    // --- Notify listeners ---
    const changes: ElementDefinition[] = [];
    // Fix: Ensure we're using ElementDefinition by explicitly casting via unknown
    changes.push(node.json() as unknown as ElementDefinition); // Node data updated

    const actionResult = this.ur.lastAction()?.result;
    if (actionResult) {
        if (actionResult.removedEdges) changes.push(...actionResult.removedEdges);
        if (actionResult.addedEdges) changes.push(...actionResult.addedEdges);
    }
    if (changes.length > 0) {
        this.queueNotify(changes);
    }

    return true;
    */
  }

  public searchNodes(query: string, types: NodeType[]): NodeCollection {
    if (!query || query.trim() === '') {
        // Return empty collection if query is empty or whitespace
        return this.cy.collection() as NodeCollection;
    }
    if (!types || types.length === 0) {
        // Return empty collection if no types specified
        return this.cy.collection() as NodeCollection;
    }

    // Sanitize query for use in selector: escape special characters if necessary
    // Basic escaping for quotes - more robust escaping might be needed depending on allowed query characters
    const sanitizedQuery = query.replace(/["\\]/g, '\\$&');

    // Build selector string safely
    const selectors = types.map(type => `node[type = "${type}"][title @*= "${sanitizedQuery}"]`);
    const finalSelector = selectors.join(', ');

    try {
        return this.cy.$(finalSelector);
    } catch (e) {
        console.error(`Error executing search selector: "${finalSelector}"`, e);
        return this.cy.collection() as NodeCollection; // Return empty on error
    }
  }


  public getRelatedNodes(nodeId: string): NodeCollection {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return this.cy.collection() as NodeCollection; // Return empty collection if node not found

    // neighborhood() includes the node itself and its direct neighbors (nodes and edges)
    // Filter for nodes only
    return node.neighborhood().nodes();
  }

  public getBacklinks(nodeId: string): any[] { // Consider defining a stricter return type like { id: string; title?: string; type?: NodeType }[]
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return [];

    // incomers('edge') gets edges pointing *to* this node
    // sources() gets the source nodes of those incoming edges
    const backlinkingNodes = node.incomers('edge').sources();

    return backlinkingNodes.map(sourceNode => ({
      id: sourceNode.id(),
      // Provide default values if data fields might be missing
      title: sourceNode.data('title') || 'Untitled',
      type: sourceNode.data('type') || undefined // Or a default NodeType
    }));
  }

  public tagNote(noteId: string, tagName: string): boolean {
    const note = this.cy.getElementById(noteId);
     if (note.empty() || note.data('type') !== NodeType.NOTE) {
         console.warn(`Node ${noteId} not found or not a Note, cannot add tag.`);
         return false;
     }

    // Use slug for tag ID to handle case variations and special characters
    const tagId = slug(tagName.trim()); // Trim whitespace before slugging
    if (!tagId) {
        console.warn(`Invalid tag name "${tagName}" resulted in empty slug.`);
        return false; // Avoid creating tags with empty IDs
    }

    let tagNode = this.cy.getElementById(tagId);
    let addedTagJson: ElementDefinition | null = null;

    // --- Use undo-redo for adding tag node and edge ---
    this.ur.action('tagNote', { noteId, tagId, tagName },
        (args) => { // DO Action
            let currentTagNode = this.cy.getElementById(args.tagId);
            let addedElementDefs: ElementDefinition[] = [];
            let createdTagNode = false;

            // Create tag node if it doesn't exist
            if (currentTagNode.empty()) {
                const tagEl: ElementDefinition = {
                    group: 'nodes' as ElementGroup,
                    data: {
                    id: args.tagId,
                    type: NodeType.TAG,
                    title: args.tagName // Store original name for display
                    }
                };
                this.cy.add(tagEl);
                addedElementDefs.push(tagEl);
                createdTagNode = true;
            }

            // Create edge if it doesn't exist
            if (!this.edgeExists(args.noteId, args.tagId, EdgeType.HAS_TAG)) {
                const edgeDef: ElementDefinition = {
                    group: 'edges' as ElementGroup,
                    data: {
                        id: `has_tag_${args.noteId}_${args.tagId}`,
                        source: args.noteId,
                        target: args.tagId,
                        label: EdgeType.HAS_TAG
                    }
                };
                 this.cy.add(edgeDef);
                 addedElementDefs.push(edgeDef);
            }

             // Return data needed for undo
             return { ...args, addedElements: addedElementDefs, createdTagNode };
        },
        (undoArgs) => { // UNDO Action
            // Remove added elements (edge, potentially node)
            if (undoArgs.addedElements && undoArgs.addedElements.length > 0) {
                const idsToRemove = undoArgs.addedElements.map(def => def.data.id);
                this.cy.remove(this.cy.elements().filter(el => idsToRemove.includes(el.id())));
            }
            // Note: If multiple notes shared this tag, this might remove the tag node incorrectly on undo.
            // A more robust undo would check reference counts before removing the tag node.
            // For simplicity here, we remove if we created it in the DO step.
        }
    );
    // --- End undo-redo block ---

     // --- Notify listeners ---
    const actionResult = this.ur.lastAction()?.result;
    const changedElements = actionResult?.addedElements || []; // Get added elements from result
    if (changedElements.length > 0) {
        this.queueNotify(changedElements);
    }

    return true;
  }

  public getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]> { // Define stricter return type if possible
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return { tag: [], concept: [], mention: [] };

    // Helper function to get connected nodes by edge type (assuming node is the source)
    const getConnectedTargets = (edgeType: EdgeType): any[] => { // Stricter type: { id: string; title?: string; type?: NodeType }[]
      // Ensure node is NodeSingular to call connectedEdges
      if (!node.isNode()) return [];

      // Get edges originating from this node with the specified label
      const outgoingEdges = (node as NodeSingular).connectedEdges(`[label = "${edgeType}"][source = "${nodeId}"]`);

      return outgoingEdges.targets().map(target => ({
        id: target.id(),
        title: target.data('title') || 'Untitled',
        type: target.data('type') || undefined
      }));
    };

     // Helper function to get nodes connected via incoming edges (assuming node is the target)
     // Example: If a 'mention' edge points *to* this node
     const getConnectingSources = (edgeType: EdgeType): any[] => {
         if (!node.isNode()) return [];
         const incomingEdges = (node as NodeSingular).connectedEdges(`[label = "${edgeType}"][target = "${nodeId}"]`);
         return incomingEdges.sources().map(source => ({
             id: source.id(),
             title: source.data('title') || 'Untitled',
             type: source.data('type') || undefined
         }));
     };


    return {
      tag: getConnectedTargets(EdgeType.HAS_TAG), // Assuming note -> tag edge
      concept: getConnectedTargets(EdgeType.HAS_CONCEPT), // Assuming note -> concept edge
      mention: getConnectedTargets(EdgeType.MENTIONS) // Assuming note -> mentioned_note edge
      // OR use getConnectingSources if mentions point *to* the current node
      // mention: getConnectingSources(EdgeType.MENTIONS)
    };
  }
}

// Create and export a singleton instance of GraphService
export const graphService = new GraphService();
export default graphService;

// --- Citation and Notation sections removed for brevity ---