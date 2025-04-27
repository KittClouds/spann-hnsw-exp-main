import cytoscape, { Core, NodeSingular, EdgeSingular, NodeCollection, ElementDefinition, ElementGroup, SingularElementArgument, Position } from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';
import { generateNodeId, generateClusterId, generateNoteId } from '@/lib/utils/ids';
import { IGraphService, NodeType, EdgeType, GraphJSON } from './types';
import { ClusterHandler } from './handlers/ClusterHandler';

cytoscape.use(automove);
cytoscape.use(undoRedo);

interface UndoRedoInstance {
  do: (actionName: string, args?: any) => any;
  undo: () => void;
  redo: () => void;
  action: (name: string, doFn: (args: any) => any, undoFn: (args: any) => void) => void;
  lastAction: () => { name: string; result: any } | undefined;
}

export class GraphService implements IGraphService {
  private cy: Core;
  private ur: UndoRedoInstance;
  private titleIndex = new Map<string, string>();
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = [];
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>();
  private clusterHandler: ClusterHandler;

  constructor() {
    this.cy = cytoscape({ headless: true });
    this.ur = this.cy.undoRedo() as unknown as UndoRedoInstance;
    this.clusterHandler = new ClusterHandler(this.cy, this.clusterExists);

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

  public getGraph(): Core {
    return this.cy;
  }

  public undo() { this.ur.undo(); }
  public redo() { this.ur.redo(); }

  public addChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners.push(listener);
  }

  public removeChangeListener(listener: (elements: ElementDefinition[]) => void): void {
    this.changeListeners = this.changeListeners.filter((l) => l !== listener);
  }

  public exportGraph(): GraphJSON {
    const cyJson = this.cy.json();
    const layoutData = ((cyJson as any).layout || {}) as Record<string, unknown>;
    
    return {
      meta: { 
        app: 'BlockNote Graph', 
        version: 2, 
        exportedAt: new Date().toISOString() 
      },
      data: this.cy.data(),
      layout: layoutData,
      viewport: { zoom: this.cy.zoom(), pan: this.cy.pan() },
      elements: this.cy.elements().jsons() as unknown as ElementDefinition[]
    };
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
            return e;
          } else {
            console.warn(`Encountered invalid element definition in import.`);
            return null;
          }
        })
        .filter((e): e is ElementDefinition => e !== null);

      this.cy.json({ elements: elements } as any);

      if (g.layout) this.cy.json({ layout: g.layout } as any);
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

  public exportElement(ele: SingularElementArgument): ElementDefinition {
    return ele.json() as ElementDefinition;
  }

  public importElement(json: ElementDefinition): void {
    if (!json || !json.data || !json.data.id) {
        console.error("Invalid element JSON for import:", json);
        return;
    }
    const elementId = json.data.id;
    const exists = this.cy.getElementById(elementId);

    if (exists.nonempty()) {
      exists.data(json.data);
      
      if (json.position && exists.isNode()) {
        (exists[0] as NodeSingular).position(json.position);
      }
      
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
            this.queueNotify([newNode.json() as ElementDefinition]);
        }
    } else {
        newNode.data('clusterId', undefined);
        this.queueNotify([newNode.json() as ElementDefinition]);
    }

    return newNode;
  }

  public moveNodeToCluster(nodeId: string, clusterId?: string): boolean {
    return this.clusterHandler.moveNodeToCluster(nodeId, clusterId);
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

    const elementDefs = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.queueNotify(elementDefs);
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

    this.queueNotify([node.json() as ElementDefinition]);
    return true;
  }

  public deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
         console.warn(`Node ${id} not found or is not a Note.`);
         return false;
    }

    const removedJson = node.json() as ElementDefinition;
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

  public addCluster(params: Partial<Cluster> = {}): NodeSingular {
    return this.clusterHandler.addCluster(params);
  }

  public updateCluster(id: string, updates: Partial<Cluster>): boolean {
    return this.clusterHandler.updateCluster(id, updates);
  }

  public deleteCluster(id: string): boolean {
    return this.clusterHandler.deleteCluster(id);
  }

  public moveNode(nodeId: string, newParentId?: string | null): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
        console.warn(`Node ${nodeId} not found for moving.`);
        return false;
    }

    const parent = node.parent().first();
    const oldParentId = parent.id();

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

    this.queueNotify([node.json() as ElementDefinition]);

    return true;
  }

  public searchNodes(query: string, types: NodeType[]): NodeCollection {
    if (!query || query.trim() === '') {
        return this.cy.collection() as NodeCollection;
    }
    if (!types || types.length === 0) {
        return this.cy.collection() as NodeCollection;
    }

    const sanitizedQuery = query.replace(/["\\]/g, '\\$&/');

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
    const removedJsons = actionResult?.addedElements || [];
    if (removedJsons.length > 0) {
       this.queueNotify(removedJsons);
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
