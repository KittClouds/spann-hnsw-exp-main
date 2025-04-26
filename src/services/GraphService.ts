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
  Style,
  StylesheetJson,
  CytoscapeOptions
} from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';
import { generateNodeId, NodeId, ClusterId, generateClusterId, generateNoteId } from '@/lib/utils/ids';

cytoscape.use(automove);
cytoscape.use(undoRedo);

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
  elements: CyElementJSON[];
}

interface UndoRedoInstance {
  do: (actionName: string, args?: any) => CollectionReturnValue;
  undo: () => void;
  redo: () => void;
  action: (
    name: string,
    doFn: (args: any) => any,
    undoFn: (args: any) => void
  ) => void;
  lastAction: () => { name: string; result: any } | undefined;
}

export class GraphService {
  private cy: Core;
  private ur: UndoRedoInstance;
  private titleIndex = new Map<string, string>();
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = [];
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>();

  constructor() {
    this.cy = cytoscape({ headless: true });
    this.ur = this.cy.undoRedo() as unknown as UndoRedoInstance;

    (this.cy as any).automove({
      nodesMatching: 'node[type = "note"]',
      reposition: 'drag',
      dragWith: 'node[type = "folder"]'
    });

    this.initializeGraph();
  }

  private initializeGraph() {
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();

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
    if (this.pendingChanges.length > 0) {
        const changes = [...this.pendingChanges];
        this.pendingChanges = [];
        this.changeListeners.forEach(l => l(changes));
    }
  }

  private edgeExists(srcId: string, tgtId: string, label: EdgeType): boolean {
    const src = this.cy.getElementById(srcId);
    if (src.empty()) return false;

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

  public exportGraph(opts: {includeStyle?: boolean} = {}): GraphJSON {
    const cyJson = this.cy.json() as CytoscapeOptions;
    const g: GraphJSON = {
      meta: { app: 'BlockNote Graph', version: 2, exportedAt: new Date().toISOString() },
      data: this.cy.data(),
      layout: cyJson.layout,
      style: opts.includeStyle ? this.cy.style().json() : undefined,
      viewport: { zoom: this.cy.zoom(), pan: this.cy.pan() },
      elements: this.cy.elements().jsons() as unknown as CyElementJSON[]
    };
    return g;
  }

  public importGraph(g: GraphJSON): void {
    if (!g || !g.elements || !Array.isArray(g.elements)) {
      console.error("Invalid graph data format", g);
      return;
    }

    this.cy.startBatch();
    try {
      const elements = g.elements
        .map((e: ElementDefinition) => {
          if (e && e.data) {
            if (!e.data.id || String(e.data.id).length < 15) {
              console.warn(`Element missing valid ID, generating new one:`, e.data);
              e.data.id = generateNodeId();
            }
          } else if (e) {
            console.warn(`Element missing data field, attempting to generate ID:`, e);
            e.data = { id: generateNodeId() };
          } else {
            console.warn(`Encountered null or undefined element definition in import.`);
            return null;
          }
          return e;
        })
        .filter((e): e is ElementDefinition => e !== null);

      this.cy.json({ elements: elements } as CytoscapeOptions);

      if (g.layout) this.cy.json({ layout: g.layout } as CytoscapeOptions);
      if (g.style && Array.isArray(g.style)) {
        this.cy.style().fromJson(g.style);
      }
      if (g.data) this.cy.data(g.data);
      if (g.viewport) {
        this.cy.zoom(g.viewport.zoom);
        this.cy.pan(g.viewport.pan);
      }

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

    } catch (error) {
        console.error("Error during graph import:", error);
    }
    finally {
      this.cy.endBatch();
    }

    const elementDefs = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.queueNotify(elementDefs);
  }

  public exportElement(ele: SingularElementArgument): CyElementJSON {
    return ele.json();
  }

  public importElement(json: CyElementJSON): void {
    if (!json || !json.data || !json.data.id) {
        console.error("Invalid element JSON for import:", json);
        return;
    }
    const elementId = json.data.id;
    const exists = this.cy.getElementById(elementId);

    if (exists.nonempty()) {
      exists.json(json);
    } else {
      this.cy.add(json);

      if (json.data.type === NodeType.NOTE && json.data.title) {
        this.titleIndex.set(slug(json.data.title), elementId);
      }

      if (json.data.type === NodeType.CLUSTER) {
        this.clusterExists.add(elementId);
      }
    }

    this.queueNotify([json]);
  }

  public clearGraph(): void {
    const removed = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();
    if (removed.length > 0) {
      this.queueNotify(removed);
    }
    this.initializeGraph();
  }

  public getNodesByType(type: NodeType): NodeCollection {
    return this.cy.$(`node[type = "${type}"]`);
  }

  public addNote({ id, title, content = [], createdAt, updatedAt, path }: {
    id?: string;
    title: string;
    content?: any[];
    createdAt?: string;
    updatedAt?: string;
    path?: string;
  }, folderId?: string, clusterId?: string): NodeSingular {
    const nodeId = id && String(id).length >= 15 ? id : generateNoteId();
    const existingNode = this.cy.getElementById(nodeId);
    if (existingNode.nonempty()) {
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
        content,
        path: path || '/',
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
        parent: folderId,
        folderId: folderId,
        clusterId: undefined
      }
    };

    const addedElements = this.ur.do('add', [el]);
    this.titleIndex.set(slugTitle, nodeId);

    const newNode = this.cy.getElementById(nodeId) as NodeSingular;

    if (clusterId) {
        if (this.clusterExists.has(clusterId)) {
             this.moveNodeToCluster(nodeId, clusterId);
        } else {
            console.warn(`Attempted to add note ${nodeId} to non-existent cluster ${clusterId}. Storing ID in data.`);
            newNode.data('clusterId', clusterId);
            this.queueNotify([newNode.json() as unknown as ElementDefinition]);
        }
    } else {
        newNode.data('clusterId', undefined);
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

    if (clusterId && !this.clusterExists.has(clusterId)) {
      console.warn(`Cannot move node ${nodeId} to non-existent cluster ${clusterId}.`);
      return false;
    }

    const edgeSelector = `edge[label = "${EdgeType.IN_CLUSTER}"][source = "${nodeId}"]`;
    const existingEdges = this.cy.edges(edgeSelector);

    this.ur.action(
        'moveNodeToCluster',
        (args: { nodeId: string, oldClusterId: string, newClusterId: string | undefined }) => {
            const currentClusterId = args.newClusterId;
            const currentNode = this.cy.getElementById(args.nodeId);
            if (currentNode.empty()) return;

            const currentEdges = this.cy.edges(`edge[label = "${EdgeType.IN_CLUSTER}"][source = "${args.nodeId}"]`);
            const edgesToRemove = currentEdges.filter(edge => edge.target().id() !== currentClusterId);
            const targetEdgeExists = currentEdges.filter(edge => edge.target().id() === currentClusterId).nonempty();
            
            let removedEdges: ElementDefinition[] = [];
            let addedEdges: ElementDefinition[] = [];

            if (edgesToRemove.nonempty()) {
                removedEdges = edgesToRemove.jsons() as unknown as ElementDefinition[];
                this.cy.remove(edgesToRemove);
            }

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
                addedEdges = [edgeDef];
                this.cy.add(edgeDef);
            }

            currentNode.data('clusterId', currentClusterId);
            return { 
                nodeId: args.nodeId, 
                oldClusterId: args.oldClusterId, 
                newClusterId: args.newClusterId, 
                removedEdges, 
                addedEdges 
            };
        },
        (undoArgs: { nodeId: string, oldClusterId: string, newClusterId: string | undefined, removedEdges: ElementDefinition[], addedEdges: ElementDefinition[] }) => {
            const originalClusterId = undoArgs.oldClusterId;
            const currentNode = this.cy.getElementById(undoArgs.nodeId);
            if (currentNode.empty()) return;

            const currentEdges = this.cy.edges(`edge[label = "${EdgeType.IN_CLUSTER}"][source = "${undoArgs.nodeId}"]`);
            const edgesToRemove = currentEdges.filter(edge => edge.target().id() !== originalClusterId);

            if (edgesToRemove.nonempty()) {
                 this.cy.remove(edgesToRemove);
            }

            if (undoArgs.removedEdges && undoArgs.removedEdges.length > 0) {
                 this.cy.add(undoArgs.removedEdges);
            }

            currentNode.data('clusterId', originalClusterId);
        }
    );

    const changes: ElementDefinition[] = [];
    changes.push(node.json() as unknown as ElementDefinition);

    const actionResult = this.ur.lastAction()?.result;
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
      this.initializeGraph();

      const elements: ElementDefinition[] = [];

      clusters.forEach(cluster => {
        if (!cluster.id) {
            console.warn("Cluster missing ID during import from store:", cluster);
            cluster.id = generateClusterId();
        }
        this.clusterExists.add(cluster.id);
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...cluster,
            type: NodeType.CLUSTER,
            createdAt: cluster.createdAt || new Date().toISOString(),
            updatedAt: cluster.updatedAt || new Date().toISOString(),
          }
        });
      });

      notes.forEach(note => {
        if (!note.id) {
             console.warn("Note missing ID during import from store:", note);
             note.id = generateNoteId();
        }
        const slugTitle = slug(note.title || '');
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...note,
            type: NodeType.NOTE,
            slugTitle: slugTitle,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString(),
            parent: note.parentId,
            clusterId: note.clusterId,
          }
        });
        if (note.title) {
             this.titleIndex.set(slugTitle, note.id);
        }
      });

      this.cy.add(elements);

      const edgeElements: ElementDefinition[] = [];
      notes.forEach(note => {
        if (note.parentId && this.cy.getElementById(note.parentId).nonempty()) {
          edgeElements.push({
            group: 'edges' as ElementGroup,
            data: {
              id: `contains_${note.parentId}_${note.id}`,
              source: note.parentId,
              target: note.id,
              label: EdgeType.CONTAINS
            }
          });
        } else if (note.parentId) {
            console.warn(`Parent node ${note.parentId} not found for note ${note.id}`);
        }

        if (note.clusterId && this.clusterExists.has(note.clusterId)) {
           edgeElements.push({
            group: 'edges' as ElementGroup,
            data: {
              id: `${EdgeType.IN_CLUSTER}_${note.id}_${note.clusterId}`,
              source: note.id,
              target: note.clusterId,
              label: EdgeType.IN_CLUSTER
            }
          });
        } else if (note.clusterId) {
             console.warn(`Cluster node ${note.clusterId} not found for note ${note.id}`);
        }
      });

      if (edgeElements.length > 0) {
         this.cy.add(edgeElements);
      }

    } catch(error) {
        console.error("Error during importFromStore:", error);
    }
    finally {
      this.cy.endBatch();
    }

    this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
  }

  public exportToStore() {
    const nodes = this.cy.nodes().map(node => node.data());
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
    const newTitle = updates.hasOwnProperty('title') ? updates.title : oldTitle;
    const slugTitle = slug(newTitle || '');

    const newData: Partial<Note> & { slugTitle?: string; updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };

    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id' && key !== 'createdAt') {
             (newData as any)[key] = (updates as any)[key];
        }
    }

     if (updates.hasOwnProperty('title')) {
         newData.slugTitle = slugTitle;
     }

    const changeOps: { ele: NodeSingular; name: string; oldValue: any; newValue: any }[] = [];
    for (const key in newData) {
        if (key !== 'updatedAt' && Object.prototype.hasOwnProperty.call(newData, key)) {
            changeOps.push({
                ele: node as NodeSingular,
                name: key,
                oldValue: node.data(key),
                newValue: (newData as any)[key]
            });
        }
    }
    node.data('updatedAt', newData.updatedAt);

    if (changeOps.length > 0) {
        this.ur.action(
            'updateNoteData',
            (args: { changes: typeof changeOps }) => {
                args.changes.forEach(op => op.ele.data(op.name, op.newValue));
                return args;
            },
            (undoArgs: { changes: typeof changeOps }) => {
                undoArgs.changes.forEach(op => op.ele.data(op.name, op.oldValue));
            }
        );
    } else if (Object.keys(newData).length === 1 && newData.updatedAt) {
        node.data('updatedAt', newData.updatedAt);
    }

    if (updates.hasOwnProperty('title') && oldTitle !== newTitle) {
        if (oldTitle) this.titleIndex.delete(slug(oldTitle));
        if (newTitle) this.titleIndex.set(slugTitle, id);
    }

    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
         console.warn(`Node ${id} not found or is not a Note.`);
         return false;
    }

    const removedJson = node.json() as unknown as ElementDefinition;
    const slugTitle = node.data('slugTitle');

    const removedCollection = this.ur.do('remove', node);

    if (slugTitle) {
        this.titleIndex.delete(slugTitle);
    }

    const actualRemovedJsons = removedCollection?.jsons() as unknown as ElementDefinition[] || [];
    if (actualRemovedJsons.length > 0) {
       this.queueNotify(actualRemovedJsons);
    } else {
       this.queueNotify([removedJson]);
    }

    return true;
  }

  public addCluster({ id, title, createdAt, updatedAt }: Partial<Cluster> = {}): NodeSingular {
    const clusterId = id && String(id).length >= 15 ? id : generateClusterId();
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
        title: title || 'Untitled Cluster',
        createdAt: createdAt || now,
        updatedAt: updatedAt || now
      }
    };

    const addedElements = this.ur.do('add', [el]);
    this.clusterExists.add(clusterId);

    this.queueNotify([el]);

    return this.cy.getElementById(clusterId) as NodeSingular;
  }

  public updateCluster(id: string, updates: Partial<Cluster>): boolean {
    const node = this.cy.getElementById(id);
     if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
         console.warn(`Cluster ${id} not found for update.`);
         return false;
     }

    const newData: Partial<Cluster> & { updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id' && key !== 'createdAt') {
            (newData as any)[key] = (updates as any)[key];
        }
    }

    const changeOps: { ele: NodeSingular; name: string; oldValue: any; newValue: any }[] = [];
    for (const key in newData) {
         if (key !== 'updatedAt' && Object.prototype.hasOwnProperty.call(newData, key)) {
            changeOps.push({
                ele: node as NodeSingular,
                name: key,
                oldValue: node.data(key),
                newValue: (newData as any)[key]
            });
        }
    }
     node.data('updatedAt', newData.updatedAt);

    if (changeOps.length > 0) {
        this.ur.action(
            'updateClusterData',
            (args: { changes: typeof changeOps }) => {
                args.changes.forEach(op => op.ele.data(op.name, op.newValue));
                return args;
            },
            (undoArgs: { changes: typeof changeOps }) => {
                undoArgs.changes.forEach(op => op.ele.data(op.name, op.oldValue));
            }
        );
    } else if (Object.keys(newData).length === 1 && newData.updatedAt) {
         node.data('updatedAt', newData.updatedAt);
    }

    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public deleteCluster(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
      console.warn(`Cluster ${id} not found for deletion.`);
      return false;
    }

    const memberNodes = this.cy.nodes(`[clusterId = "${id}"]`);
    const memberNodeIds = memberNodes.toArray().map(n => n.id());

    const removedJson = node.json() as unknown as ElementDefinition;

    this.ur.action(
        'deleteClusterAndMembers',
        (args: { clusterId: string, memberNodeIds: string[] }) => {
            const clusterNode = this.cy.getElementById(args.clusterId);
            const removedElements: ElementDefinition[] = [];
            let removedClusterJson: ElementDefinition | null = null;

            if (clusterNode.nonempty()) {
                removedClusterJson = clusterNode.json() as unknown as ElementDefinition;
                const removedCol = this.cy.remove(clusterNode);
                removedElements.push(...(removedCol?.jsons() as unknown as ElementDefinition[] || []));
            }

             const membersToUpdate = this.cy.nodes().filter(n => args.memberNodeIds.includes(n.id()));
             membersToUpdate.forEach(member => {
                 member.data('clusterId', undefined);
                 removedElements.push(member.json() as unknown as ElementDefinition);
             });

             return { removedElements, clusterId: args.clusterId, memberNodeIds: args.memberNodeIds, removedClusterJson };
        },
        (undoArgs: { removedElements: ElementDefinition[], clusterId: string, memberNodeIds: string[], removedClusterJson: ElementDefinition | null }) => {
            if (undoArgs.removedClusterJson) {
                this.cy.add(undoArgs.removedClusterJson);
            }

             const membersToRestore = this.cy.nodes().filter(n => undoArgs.memberNodeIds.includes(n.id()));
             membersToRestore.forEach(member => {
                 member.data('clusterId', undoArgs.clusterId);
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
        }
    );

    this.clusterExists.delete(id);

    const actionResult = this.ur.lastAction()?.result;
    const changedElements = actionResult?.removedElements || [removedJson];
     if (changedElements.length > 0) {
       this.queueNotify(changedElements);
     }

    return true;
  }

  public moveNode(nodeId: string, newParentId?: string | null): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
        console.warn(`Node ${nodeId} not found for moving.`);
        return false;
    }

    if (newParentId && this.cy.getElementById(newParentId).empty()) {
        console.warn(`Target parent node ${newParentId} does not exist.`);
        return false;
    }

    const oldParentId = node.parent().id();

    this.ur.action(
        'moveNodeCompound',
        (args: { nodeId: string, oldParentId: string, newParentId: string | null }) => {
            const nodeToMove = this.cy.getElementById(args.nodeId);
            if (nodeToMove.nonempty()) {
                nodeToMove.move({ parent: args.newParentId });
            }
            return args;
        },
        (undoArgs: { nodeId: string, oldParentId: string, newParentId: string | null }) => {
            const nodeToMove = this.cy.getElementById(undoArgs.nodeId);
             if (nodeToMove.nonempty()) {
                 nodeToMove.move({ parent: undoArgs.oldParentId });
             }
        }
    );

    this.queueNotify([node.json() as unknown as ElementDefinition]);

    return true;
  }

  public searchNodes(query: string, types: NodeType[]): NodeCollection {
    if (!query || query.trim() === '') {
        return this.cy.collection() as NodeCollection;
    }
    if (!types || types.length === 0) {
        return this.cy.collection() as NodeCollection;
    }

    const sanitizedQuery = query.replace(/["\\]/g, '\\$&');

    const selectors = types.map(type => `node[type = "${type}"][title @*= "${sanitizedQuery}"]`);
    const finalSelector = selectors.join(', ');

    try {
        return this.cy.$(finalSelector);
    } catch (e) {
        console.error(`Error executing search selector: "${finalSelector}"`, e);
        return this.cy.collection() as NodeCollection;
    }
  }

  public getRelatedNodes(nodeId: string): NodeCollection {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return this.cy.collection() as NodeCollection;

    return node.neighborhood().nodes();
  }

  public getBacklinks(nodeId: string): any[] {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return [];

    const backlinkingNodes = node.incomers('edge').sources();

    return backlinkingNodes.map(sourceNode => ({
      id: sourceNode.id(),
      title: sourceNode.data('title') || 'Untitled',
      type: sourceNode.data('type') || undefined
    }));
  }

  public tagNote(noteId: string, tagName: string): boolean {
    const note = this.cy.getElementById(noteId);
     if (note.empty() || note.data('type') !== NodeType.NOTE) {
         console.warn(`Node ${noteId} not found or not a Note, cannot add tag.`);
         return false;
     }

    const tagId = slug(tagName.trim());
    if (!tagId) {
        console.warn(`Invalid tag name "${tagName}" resulted in empty slug.`);
        return false;
    }

    let tagNode = this.cy.getElementById(tagId);
    let addedTagJson: ElementDefinition | null = null;

    this.ur.action(
        'tagNote',
        (args: { noteId: string, tagId: string, tagName: string }) => {
            let currentTagNode = this.cy.getElementById(args.tagId);
            let addedElementDefs: ElementDefinition[] = [];
            let createdTagNode = false;

            if (currentTagNode.empty()) {
                const tagEl: ElementDefinition = {
                    group: 'nodes' as ElementGroup,
                    data: {
                    id: args.tagId,
                    type: NodeType.TAG,
                    title: args.tagName
                    }
                };
                this.cy.add(tagEl);
                addedElementDefs.push(tagEl);
                createdTagNode = true;
            }

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

             return { ...args, addedElements: addedElementDefs, createdTagNode };
        },
        (undoArgs: { addedElements?: ElementDefinition[], noteId: string, tagId: string, tagName: string }) => {
            if (undoArgs.addedElements && undoArgs.addedElements.length > 0) {
                const idsToRemove = undoArgs.addedElements.map(def => def.data.id);
                this.cy.remove(this.cy.elements().filter(el => idsToRemove.includes(el.id())));
            }
        }
    );

    const actionResult = this.ur.lastAction()?.result;
    const changedElements = actionResult?.addedElements || [];
    if (changedElements.length > 0) {
        this.queueNotify(changedElements);
    }

    return true;
  }

  public getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]> {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return { tag: [], concept: [], mention: [] };

    const getConnectedTargets = (edgeType: EdgeType): any[] => {
      if (!node.isNode()) return [];

      const outgoingEdges = (node as NodeSingular).connectedEdges(`[label = "${edgeType}"][source = "${nodeId}"]`);

      return outgoingEdges.targets().map(target => ({
        id: target.id(),
        title: target.data('title') || 'Untitled',
        type: target.data('type') || undefined
      }));
    };

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
      tag: getConnectedTargets(EdgeType.HAS_TAG),
      concept: getConnectedTargets(EdgeType.HAS_CONCEPT),
      mention: getConnectedTargets(EdgeType.MENTIONS)
    };
  }
}

export const graphService = new GraphService();
export default graphService;
