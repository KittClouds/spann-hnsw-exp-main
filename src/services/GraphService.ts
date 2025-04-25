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
    this.cy.automove({
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
    
    if (this.cy.$(`node[type = "${NodeType.STANDARD_ROOT}"]`).empty()) {
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
    
    if (this.cy.$(`node[type = "${NodeType.CLUSTERS_ROOT}"]`).empty()) {
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
    const changes = this.pendingChanges;
    this.pendingChanges = [];
    this.changeListeners.forEach(l => l(changes));
  }

  private edgeExists(src: string, tgt: string, label: EdgeType): boolean {
    const s = this.cy.getElementById(src);
    const t = this.cy.getElementById(tgt);
    if (s.empty() || t.empty()) return false;

    return !s
      .edgesWith(t)
      .filter(`[label = "${label}"]`)
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

  public exportGraph(): object {
    return this.cy.json();
  }

  public importGraph(graphData: any): void {
    if (!graphData || !graphData.elements || !Array.isArray(graphData.elements)) {
      console.error("Invalid graph data format", graphData);
      return;
    }

    this.cy.batch(() => {
      const elements = graphData.elements.map((e: any) => {
        if (e && e.data) {
          if (!e.data.id || e.data.id.length < 15) {
            e.data.id = generateNodeId();
          }
        }
        return e;
      });

      this.cy.json({ elements });

      this.titleIndex.clear();
      this.cy.$(`node[type = "${NodeType.NOTE}"]`).forEach(node => {
        this.titleIndex.set(slug(node.data('title')), node.id());
      });
    });

    // Fix: Ensure we're using ElementDefinition[] by explicitly casting
    const elementDefs = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.queueNotify(elementDefs);
  }

  public clearGraph(): void {
    // Fix: Ensure we're using ElementDefinition[] by explicitly casting
    const removed = this.cy.elements().jsons() as unknown as ElementDefinition[];
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.queueNotify(removed);
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
    const nodeId = id && id.length >= 15 ? id : generateNodeId();
    if (this.cy.getElementById(nodeId).nonempty())
      return this.cy.getElementById(nodeId) as NodeSingular;

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
        parent: folderId
      }
    };

    this.ur.do('add', { nodes: [el] });
    this.titleIndex.set(slugTitle, nodeId);
    
    if (clusterId && this.clusterExists.has(clusterId)) {
      this.moveNodeToCluster(nodeId, clusterId);
    } else if (clusterId) {
      this.cy.getElementById(nodeId).data('cluster', clusterId);
    }
    
    return this.cy.getElementById(nodeId) as NodeSingular;
  }

  public moveNodeToCluster(nodeId: string, clusterId?: string): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return false;
    
    if (clusterId && !this.clusterExists.has(clusterId)) {
      console.warn(`Cannot move node ${nodeId} to non-existent cluster ${clusterId}`);
      return false;
    }
    
    const edgeSel = `edge[label = "${EdgeType.IN_CLUSTER}"][source = "${nodeId}"]`;
    const existingEdge = this.cy.$(edgeSel).first();
    
    if (existingEdge.nonempty()) {
      if (!clusterId) {
        // Fix: Ensure we're using ElementDefinition by explicitly casting
        const rm = existingEdge.json() as unknown as ElementDefinition;
        this.ur.do('remove', existingEdge);
        this.queueNotify([rm]);
      } else {
        existingEdge.move({ target: clusterId });
        existingEdge.data('target', clusterId);
        // Fix: Ensure we're using ElementDefinition by explicitly casting
        this.queueNotify([existingEdge.json() as unknown as ElementDefinition]);
      }
    }
    
    if (clusterId && existingEdge.empty()) {
      const edgeDef: ElementDefinition = {
        group: 'edges' as ElementGroup,
        data: {
          id: `${EdgeType.IN_CLUSTER}_${nodeId}_${clusterId}`,
          source: nodeId,
          target: clusterId,
          label: EdgeType.IN_CLUSTER
        }
      };
      this.ur.do('add', { edges: [edgeDef] });
      this.queueNotify([edgeDef]);
    }
    
    node.data('cluster', clusterId);
    // Fix: Ensure we're using ElementDefinition by explicitly casting
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public importFromStore(notes: Note[], clusters: Cluster[]) {
    this.cy.batch(() => {
      this.initializeGraph();

      const elements: ElementDefinition[] = [];

      // Add standard root and clusters root
      elements.push({
        group: 'nodes' as ElementGroup,
        data: {
          id: 'standard_root',
          type: NodeType.STANDARD_ROOT,
          title: 'Root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      elements.push({
        group: 'nodes' as ElementGroup,
        data: {
          id: 'clusters_root',
          type: NodeType.CLUSTERS_ROOT,
          title: 'Clusters',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      clusters.forEach(cluster => {
        this.clusterExists.add(cluster.id);
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...cluster,
            type: NodeType.CLUSTER,
          }
        });
      });

      notes.forEach(note => {
        elements.push({
          group: 'nodes' as ElementGroup,
          data: {
            ...note,
            type: NodeType.NOTE,
          }
        });
      });

      this.cy.add(elements);

      notes.forEach(note => {
        if (note.parentId) {
          const edgeDef: ElementDefinition = {
            group: 'edges' as ElementGroup,
            data: {
              id: `contains_${note.id}_${note.parentId}`,
              source: note.parentId,
              target: note.id,
              label: EdgeType.CONTAINS
            }
          };
          this.cy.add(edgeDef);
        }
        
        if (note.clusterId) {
          const edgeDef: ElementDefinition = {
            group: 'edges' as ElementGroup,
            data: {
              id: `${EdgeType.IN_CLUSTER}_${note.id}_${note.clusterId}`,
              source: note.id,
              target: note.clusterId,
              label: EdgeType.IN_CLUSTER
            }
          };
          this.cy.add(edgeDef);
        }
      });

      this.titleIndex.clear();
      this.cy.$(`node[type = "${NodeType.NOTE}"]`).forEach(node => {
        this.titleIndex.set(slug(node.data('title')), node.id());
      });
    });

    this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
  }

  public exportToStore() {
    const nodes = this.cy.nodes().map(node => node.data());
    const notes = nodes.filter(node => node.type === NodeType.NOTE);
    const clusters = nodes.filter(node => node.type === NodeType.CLUSTER);

    return {
      notes: notes as Note[],
      clusters: clusters as Cluster[]
    };
  }

  public updateNote(id: string, updates: Partial<Note>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty()) return false;

    const oldTitle = node.data('title');
    const newTitle = updates.title || oldTitle;
    const slugTitle = slug(newTitle);

    const newData = {
      ...updates,
      slugTitle,
      updatedAt: new Date().toISOString()
    };

    this.ur.do('changeData', {
      eles: node,
      name: Object.keys(newData)[0],
      oldValue: node.data()[Object.keys(newData)[0]],
      newValue: Object.values(newData)[0]
    });

    node.data(newData);
    this.titleIndex.delete(slug(oldTitle));
    this.titleIndex.set(slugTitle, id);

    // Fix: Ensure we're using ElementDefinition by explicitly casting
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty()) return false;

    // Fix: Ensure we're using ElementDefinition[] by explicitly casting
    const removed = node.json() as unknown as ElementDefinition;
    this.ur.do('remove', node);
    this.titleIndex.delete(node.data('slugTitle'));
    this.queueNotify([removed]);
    return true;
  }

  public addCluster({ id, title, createdAt, updatedAt }: Partial<Cluster>): NodeSingular {
    const clusterId = id || generateNodeId();
    if (this.cy.getElementById(clusterId).nonempty())
      return this.cy.getElementById(clusterId) as NodeSingular;

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

    this.ur.do('add', { nodes: [el] });
    this.clusterExists.add(clusterId);
    this.queueNotify([el]);
    return this.cy.getElementById(clusterId) as NodeSingular;
  }

  public updateCluster(id: string, updates: Partial<Cluster>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty()) return false;

    const newData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.ur.do('changeData', {
      eles: node,
      name: Object.keys(newData)[0],
      oldValue: node.data()[Object.keys(newData)[0]],
      newValue: Object.values(newData)[0]
    });

    node.data(newData);
    // Fix: Ensure we're using ElementDefinition by explicitly casting
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public deleteCluster(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty()) return false;

    this.clusterExists.delete(id);
    // Fix: Ensure we're using ElementDefinition[] by explicitly casting
    const removed = node.json() as unknown as ElementDefinition;
    this.ur.do('remove', node);
    this.queueNotify([removed]);
    return true;
  }

  public moveNode(nodeId: string, newParentId?: string): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return false;

    const edgeSel = `edge[label = "${EdgeType.CONTAINS}"][target = "${nodeId}"]`;
    const existingEdge = this.cy.$(edgeSel).first();

    if (existingEdge.nonempty()) {
      if (!newParentId) {
        // Fix: Ensure we're using ElementDefinition by explicitly casting
        const rm = existingEdge.json() as unknown as ElementDefinition;
        this.ur.do('remove', existingEdge);
        this.queueNotify([rm]);
      } else {
        existingEdge.move({ target: newParentId });
        existingEdge.data('target', newParentId);
        // Fix: Ensure we're using ElementDefinition by explicitly casting
        this.queueNotify([existingEdge.json() as unknown as ElementDefinition]);
      }
    }

    if (newParentId && existingEdge.empty()) {
      const edgeDef: ElementDefinition = {
        group: 'edges' as ElementGroup,
        data: {
          id: `contains_${nodeId}_${newParentId}`,
          source: newParentId,
          target: nodeId,
          label: EdgeType.CONTAINS
        }
      };
      this.ur.do('add', { edges: [edgeDef] });
      this.queueNotify([edgeDef]);
    }

    node.data('parent', newParentId);
    // Fix: Ensure we're using ElementDefinition by explicitly casting
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public searchNodes(query: string, types: NodeType[]): NodeCollection {
    if (!query) return this.cy.collection() as NodeCollection;

    const selector = types.map(type => `node[type = "${type}"][title @*= "${query}"]`).join(', ');
    return this.cy.$(selector);
  }

  public getRelatedNodes(nodeId: string): NodeCollection {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return this.cy.collection() as NodeCollection;

    return node.neighborhood().nodes();
  }

  public getBacklinks(nodeId: string): any[] {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return [];

    const incomingEdges = node.incomers('edge');
    return incomingEdges.sources().map(source => ({
      id: source.id(),
      title: source.data('title'),
      type: source.data('type')
    }));
  }

  public tagNote(noteId: string, tagName: string): boolean {
    const note = this.cy.getElementById(noteId);
    if (note.empty()) return false;

    const tagId = slug(tagName);
    let tag = this.cy.getElementById(tagId);

    if (tag.empty()) {
      const el: ElementDefinition = {
        group: 'nodes' as ElementGroup,
        data: {
          id: tagId,
          type: NodeType.TAG,
          title: tagName
        }
      };
      this.ur.do('add', { nodes: [el] });
      tag = this.cy.getElementById(tagId);
    }

    if (this.edgeExists(noteId, tagId, EdgeType.HAS_TAG)) return true;

    const edgeDef: ElementDefinition = {
      group: 'edges' as ElementGroup,
      data: {
        id: `has_tag_${noteId}_${tagId}`,
        source: noteId,
        target: tagId,
        label: EdgeType.HAS_TAG
      }
    };

    this.ur.do('add', { edges: [edgeDef] });
    this.queueNotify([edgeDef]);
    return true;
  }

  public getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', any[]> {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return { tag: [], concept: [], mention: [] };

    const getConnectedNodes = (edgeType: EdgeType) => {
      return node.connectedEdges(`[label = "${edgeType}"]`).targets().map(target => ({
        id: target.id(),
        title: target.data('title'),
        type: target.data('type')
      }));
    };

    return {
      tag: getConnectedNodes(EdgeType.HAS_TAG),
      concept: getConnectedNodes(EdgeType.HAS_CONCEPT),
      mention: getConnectedNodes(EdgeType.MENTIONS)
    };
  }
}

// Create and export a singleton instance of GraphService
export const graphService = new GraphService();
export default graphService;
