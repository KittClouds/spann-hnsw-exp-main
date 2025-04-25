import cytoscape, {
  Core,
  CollectionReturnValue,
  NodeSingular,
  EdgeSingular,
  NodeCollection,
  EdgeCollection,
  ElementDefinition,
} from 'cytoscape';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';
import { generateNodeId, NodeId } from '@/lib/utils/ids';

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
  private titleIndex = new Map<string, string>();
  private notifyScheduled = false;
  private pendingChanges: ElementDefinition[] = [];
  private changeListeners: Array<(elements: ElementDefinition[]) => void> = [];
  private clusterExists = new Set<string>();

  constructor() {
    this.cy = cytoscape({ headless: true });
    this.initializeGraph();
  }

  private initializeGraph() {
    // Clear existing elements
    this.cy.elements().remove();
    this.titleIndex.clear();
    this.clusterExists.clear();
    
    if (this.cy.$(`node[type = "${NodeType.STANDARD_ROOT}"]`).empty()) {
      this.cy.add({
        group: 'nodes',
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
        group: 'nodes',
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

  private queueNotify(defs: ElementDefinition[]) {
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

  private flushNotify() {
    const changes = this.pendingChanges;
    this.pendingChanges = [];
    this.changeListeners.forEach(l => l(changes));
  }

  private edgeExists(src: string, tgt: string, label: EdgeType) {
    const s = this.cy.getElementById(src);
    const t = this.cy.getElementById(tgt);
    if (s.empty() || t.empty()) return false;

    return !s
      .edgesWith(t)
      .filter(`[label = "${label}"]`)
      .empty();
  }

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

    this.queueNotify(this.cy.elements().jsons() as unknown as ElementDefinition[]);
  }

  public clearGraph(): void {
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
      group: 'nodes',
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

    const node = this.cy.add(el) as NodeSingular;
    this.titleIndex.set(slugTitle, nodeId);
    this.queueNotify([el]);
    
    if (clusterId && this.clusterExists.has(clusterId)) {
      this.moveNodeToCluster(nodeId, clusterId);
    } else if (clusterId) {
      node.data('cluster', clusterId);
    }
    
    return node;
  }

  // ... rest of GraphService class methods and exports unchanged
}
