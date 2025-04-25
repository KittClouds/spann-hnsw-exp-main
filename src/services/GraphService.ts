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

  public updateNote(id: string, updates: Record<string, any>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) return false;
    
    if (updates.title && updates.title !== node.data('title')) {
      const oldSlug = slug(node.data('title'));
      this.titleIndex.delete(oldSlug);
      this.titleIndex.set(slug(updates.title), id);
    }
    
    if (!updates.updatedAt) {
      updates.updatedAt = new Date().toISOString();
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      node.data(key, value);
    });
    
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    
    return true;
  }

  public deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) return false;
    
    this.titleIndex.delete(slug(node.data('title')));
    
    const elementsToRemove = node.connectedEdges().union(node);
    const removed = elementsToRemove.jsons() as unknown as ElementDefinition[];
    
    elementsToRemove.remove();
    
    this.queueNotify(removed);
    
    return true;
  }

  public addCluster({ id, title, description = '', createdAt, updatedAt }: {
    id?: string;
    title: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  }): NodeSingular {
    const clusterId = id && id.length >= 15 ? id : generateNodeId();
    
    if (this.cy.getElementById(clusterId).nonempty())
      return this.cy.getElementById(clusterId) as NodeSingular;

    const now = new Date().toISOString();

    const el: ElementDefinition = {
      group: 'nodes',
      data: {
        id: clusterId,
        type: NodeType.CLUSTER_DEFINITION,
        title,
        description,
        createdAt: createdAt || now,
        updatedAt: updatedAt || now
      }
    };

    this.cy.add(el);
    this.clusterExists.add(clusterId);
    this.queueNotify([el]);
    
    this.cy.nodes().forEach(node => {
      if (node.data('cluster') === clusterId) {
        this.createClusterEdge(node.id(), clusterId);
      }
    });
    
    return this.cy.getElementById(clusterId) as NodeSingular;
  }

  private createClusterEdge(nodeId: string, clusterId: string): EdgeSingular | undefined {
    const edgeId = `${EdgeType.IN_CLUSTER}_${nodeId}_${clusterId}`;
    
    if (this.cy.getElementById(nodeId).empty() || this.cy.getElementById(clusterId).empty()) {
      return undefined;
    }
    
    if (this.edgeExists(nodeId, clusterId, EdgeType.IN_CLUSTER)) {
      return this.cy.$(`edge[source = "${nodeId}"][target = "${clusterId}"][label = "${EdgeType.IN_CLUSTER}"]`).first() as EdgeSingular;
    }
    
    const edgeDef: ElementDefinition = {
      group: 'edges',
      data: {
        id: edgeId,
        source: nodeId,
        target: clusterId,
        label: EdgeType.IN_CLUSTER
      }
    };
    
    this.cy.add(edgeDef);
    this.queueNotify([edgeDef]);
    return this.cy.getElementById(edgeDef.data!.id as string) as EdgeSingular;
  }

  public updateCluster(id: string, updates: Record<string, any>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER_DEFINITION) return false;
    
    if (!updates.updatedAt) {
      updates.updatedAt = new Date().toISOString();
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      node.data(key, value);
    });
    
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    
    return true;
  }

  public deleteCluster(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER_DEFINITION) return false;
    
    const inClusterEdges = this.cy.$(`edge[label = "${EdgeType.IN_CLUSTER}"][target = "${id}"]`);
    const edgesRemoved = inClusterEdges.jsons() as unknown as ElementDefinition[];
    
    inClusterEdges.sources().forEach(source => {
      source.data('cluster', undefined);
      this.pendingChanges.push(source.json() as unknown as ElementDefinition);
    });
    
    inClusterEdges.remove();
    
    const nodeRemoved = node.json() as unknown as ElementDefinition;
    node.remove();
    
    this.queueNotify([...edgesRemoved, nodeRemoved]);
    
    return true;
  }

  public addFolder({ id, title, path, createdAt, updatedAt }: {
    id?: string;
    title: string;
    path?: string;
    createdAt?: string;
    updatedAt?: string;
  }, parentId?: string, clusterId?: string): NodeSingular {
    const folderId = id && id.length >= 15 ? id : generateNodeId();
    if (this.cy.getElementById(folderId).nonempty())
      return this.cy.getElementById(folderId) as NodeSingular;

    const now = new Date().toISOString();

    const el: ElementDefinition = {
      group: 'nodes',
      data: {
        id: folderId,
        type: NodeType.FOLDER,
        title,
        path: path || '/',
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
        parent: parentId
      }
    };

    this.cy.add(el);
    this.queueNotify([el]);
    
    if (clusterId && this.clusterExists.has(clusterId)) {
      this.moveNodeToCluster(folderId, clusterId);
    } else if (clusterId) {
      this.cy.getElementById(folderId).data('cluster', clusterId);
    }
    
    return this.cy.getElementById(folderId) as NodeSingular;
  }

  public updateFolder(id: string, updates: Record<string, any>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.FOLDER) return false;
    
    if (!updates.updatedAt) {
      updates.updatedAt = new Date().toISOString();
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      node.data(key, value);
    });
    
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    
    return true;
  }

  public deleteFolder(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.FOLDER) return false;
    
    const childNotes = this.cy.$(`node[type = "${NodeType.NOTE}"][parent = "${id}"]`);
    const childFolders = this.cy.$(`node[type = "${NodeType.FOLDER}"][parent = "${id}"]`);
    
    childFolders.forEach(folder => {
      this.deleteFolder(folder.id());
    });
    
    childNotes.forEach(note => {
      this.deleteNote(note.id());
    });
    
    const elementsToRemove = node.connectedEdges().union(node);
    const removed = elementsToRemove.jsons() as unknown as ElementDefinition[];
    elementsToRemove.remove();
    
    this.queueNotify(removed);
    
    return true;
  }

  public createRelationship(sourceId: string, targetId: string): EdgeSingular | undefined {
    return this.linkNotes(sourceId, targetId);
  }

  public removeRelationship(sourceId: string, targetId: string): boolean {
    const edge = this.cy.$(`edge[source = "${sourceId}"][target = "${targetId}"][label = "${EdgeType.NOTE_LINK}"]`);
    if (edge.empty()) return false;
    
    const removed = edge.json() as unknown as ElementDefinition;
    edge.remove();
    this.queueNotify([removed]);
    
    return true;
  }

  public linkNotes(sourceId: string, targetId: string, alias?: string): EdgeSingular | undefined {
    const edgeId = `note_link_${sourceId}_${targetId}`;
    if (this.edgeExists(sourceId, targetId, EdgeType.NOTE_LINK)) {
      return this.cy.$(`edge[source = "${sourceId}"][target = "${targetId}"][label = "${EdgeType.NOTE_LINK}"]`).first() as EdgeSingular;
    }
    
    const def: ElementDefinition = {
      group: 'edges',
      data: {
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: EdgeType.NOTE_LINK,
        ...(alias ? { alias } : {})
      }
    };
    
    this.cy.add(def);
    this.pendingChanges.push(def);
    return this.cy.getElementById(def.data!.id as string) as EdgeSingular;
  }

  public tagNote(sourceId: string, tagName: string): EdgeSingular | undefined {
    const tag = this.addTag(tagName);
    if (this.edgeExists(sourceId, tag.id(), EdgeType.HAS_TAG)) {
      return this.cy.$(`edge[source = "${sourceId}"][target = "${tag.id()}"][label = "${EdgeType.HAS_TAG}"]`).first() as EdgeSingular;
    }

    const def: ElementDefinition = {
      group: 'edges',
      data: {
        id: `${EdgeType.HAS_TAG}_${sourceId}_${tag.id()}`,
        source: sourceId,
        target: tag.id(),
        label: EdgeType.HAS_TAG
      }
    };
    
    this.cy.add(def);
    this.pendingChanges.push(def);
    return this.cy.getElementById(def.data!.id as string) as EdgeSingular;
  }

  public mentionNote(sourceId: string, targetId: string): EdgeSingular | undefined {
    if (this.edgeExists(sourceId, targetId, EdgeType.MENTIONS)) {
      return this.cy.$(`edge[source = "${sourceId}"][target = "${targetId}"][label = "${EdgeType.MENTIONS}"]`).first() as EdgeSingular;
    }

    const def: ElementDefinition = {
      group: 'edges',
      data: {
        id: `${EdgeType.MENTIONS}_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        label: EdgeType.MENTIONS
      }
    };
    
    this.cy.add(def);
    this.pendingChanges.push(def);
    return this.cy.getElementById(def.data!.id as string) as EdgeSingular;
  }

  public addTag(name: string): NodeSingular {
    const slugName = slug(name);
    const existing = this.cy.$(`node[type = "${NodeType.TAG}"][name = "${slugName}"]`).first();
    if (existing.nonempty()) return existing as NodeSingular;

    const id = `tag_${slugName}`;
    const tagNode: ElementDefinition = {
      group: 'nodes',
      data: { 
        id, 
        type: NodeType.TAG,
        name: slugName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    this.cy.add(tagNode);
    this.queueNotify([tagNode]);
    return this.cy.getElementById(id) as NodeSingular;
  }

  public addConcept(conceptType: string, name: string): NodeSingular {
    const key = `${slug(conceptType)}:${slug(name)}`;
    const existing = this.cy.$(`node[type = "${NodeType.CONCEPT}"][key = "${key}"]`).first();
    if (existing.nonempty()) return existing as NodeSingular;

    const id = `concept_${key}`;
    const nodeDef: ElementDefinition = {
      group: 'nodes',
      data: {
        id,
        type: NodeType.CONCEPT,
        key,
        conceptType,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    this.cy.add(nodeDef);
    this.queueNotify([nodeDef]);
    return this.cy.getElementById(id) as NodeSingular;
  }

  public attachConcept(sourceId: string, conceptType: string, conceptName: string): EdgeSingular | undefined {
    const concept = this.addConcept(conceptType, conceptName);
    if (this.edgeExists(sourceId, concept.id(), EdgeType.HAS_CONCEPT)) {
      return this.cy.$(`edge[source = "${sourceId}"][target = "${concept.id()}"][label = "${EdgeType.HAS_CONCEPT}"]`).first() as EdgeSingular;
    }

    const def: ElementDefinition = {
      group: 'edges',
      data: {
        id: `${EdgeType.HAS_CONCEPT}_${sourceId}_${concept.id()}`,
        source: sourceId,
        target: concept.id(),
        label: EdgeType.HAS_CONCEPT
      }
    };
    
    this.cy.add(def);
    this.pendingChanges.push(def);
    return this.cy.getElementById(def.data!.id as string) as EdgeSingular;
  }

  public removeOutgoing(sourceId: string, labels: EdgeType[]) {
    if (!labels.length) return;
    const sel = labels.map(l => `edge[label = "${l}"][source = "${sourceId}"]`).join(',');
    const edges = this.cy.$(sel);
    if (edges.empty()) return;
    const removed = edges.jsons() as unknown as ElementDefinition[];
    edges.remove();
    this.queueNotify(removed);
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
        const rm = existingEdge.json() as unknown as ElementDefinition;
        existingEdge.remove();
        this.queueNotify([rm]);
      } else {
        existingEdge.move({ target: clusterId });
        existingEdge.data('target', clusterId);
        this.queueNotify([existingEdge.json() as unknown as ElementDefinition]);
      }
    }

    if (clusterId && existingEdge.empty()) {
      const edgeDef: ElementDefinition = {
        group: 'edges',
        data: {
          id: `${EdgeType.IN_CLUSTER}_${nodeId}_${clusterId}`,
          source: nodeId,
          target: clusterId,
          label: EdgeType.IN_CLUSTER
        }
      };
      
      this.cy.add(edgeDef);
      this.queueNotify([edgeDef]);
    }

    node.data('cluster', clusterId);
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return true;
  }

  public moveNode(nodeId: string, newParentId?: string): NodeSingular | undefined {
    const node = this.cy.getElementById(nodeId);
    const newParent = newParentId ? this.cy.getElementById(newParentId) : undefined;
    if (node.empty() || (newParentId && (!newParent || newParent.empty()))) return undefined;

    node.move({ parent: newParentId });
    node.data('parent', newParentId);
    this.queueNotify([node.json() as unknown as ElementDefinition]);
    return node as NodeSingular;
  }

  public searchNodes(query: string, types?: NodeType[]): NodeCollection {
    if (!query) return this.cy.collection();
    const q = query.toLowerCase();
    const selector = types?.length ? types.map(t => `node[type = "${t}"]`).join(',') : 'node';
    
    return this.cy.$(selector).filter(n => {
      const title = (n.data('title') ?? '').toLowerCase();
      const content = JSON.stringify(n.data('content') ?? '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }

  public updateNoteRelations(noteId: string, rawContent: string) {
    const note = this.cy.getElementById(noteId);
    if (note.empty() || note.data('type') !== NodeType.NOTE) return;

    const RE_NOTE_LINK = /\[\[(.*?)\]\]/g;
    const RE_TAG = /#(\w+)/g;
    const RE_MENTION = /@(\w+)/g;
    const RE_CONCEPT = /{{(.*?):(.*?)}}/g;

    this.cy.batch(() => {
      this.removeOutgoing(noteId, [EdgeType.NOTE_LINK, EdgeType.HAS_TAG, EdgeType.MENTIONS, EdgeType.HAS_CONCEPT]);

      const noteLinks = Array.from(rawContent.matchAll(RE_NOTE_LINK), m => m[1]);
      const tags = Array.from(rawContent.matchAll(RE_TAG), m => m[1]);
      const mentions = Array.from(rawContent.matchAll(RE_MENTION), m => m[1]);
      const concepts = Array.from(rawContent.matchAll(RE_CONCEPT), m => ({ 
        type: m[1].trim(), 
        name: m[2].trim() 
      }));

      for (const txt of noteLinks) {
        const slugKey = slug(txt);
        const targetId = this.titleIndex.get(slugKey);
        if (targetId) this.linkNotes(noteId, targetId);
      }

      tags.forEach(t => this.tagNote(noteId, t));

      for (const mt of mentions) {
        const slugKey = slug(mt);
        const targetId = this.titleIndex.get(slugKey);
        if (targetId) this.mentionNote(noteId, targetId);
      }

      concepts.forEach(c => this.attachConcept(noteId, c.type, c.name));
    });

    this.queueNotify([]);
  }

  public getConnections(noteId: string) {
    const out: Record<'tag' | 'concept' | 'mention', any[]> = { tag: [], concept: [], mention: [] };
    const note = this.cy.getElementById(noteId);
    if (note.empty() || note.data('type') !== NodeType.NOTE) return out;

    const outgoing = note.outgoers('edge');
    outgoing.filter(`edge[label = "${EdgeType.HAS_TAG}"]`).forEach(e => {
      const t = e.target();
      out.tag.push({ id: t.id(), type: 'tag', title: t.data('name'), sourceId: noteId, targetId: t.id() });
    });
    
    outgoing.filter(`edge[label = "${EdgeType.HAS_CONCEPT}"]`).forEach(e => {
      const t = e.target();
      out.concept.push({ id: t.id(), type: 'concept', title: `${t.data('conceptType')}: ${t.data('name')}`, sourceId: noteId, targetId: t.id() });
    });
    
    outgoing.filter(`edge[label = "${EdgeType.MENTIONS}"]`).forEach(e => {
      const t = e.target();
      out.mention.push({ id: t.id(), type: 'mention', title: t.data('title'), sourceId: noteId, targetId: t.id() });
    });
    
    return out;
  }

  public getBacklinks(noteId: string) {
    const res: any[] = [];
    const note = this.cy.getElementById(noteId);
    if (note.empty() || note.data('type') !== NodeType.NOTE) return res;
    const incoming = note.incomers('edge');

    incoming.filter(`edge[label = "${EdgeType.NOTE_LINK}"]`).forEach(e => {
      const s = e.source();
      res.push({ id: e.id(), type: 'link', title: s.data('title'), sourceId: s.id(), targetId: noteId });
    });
    
    incoming.filter(`edge[label = "${EdgeType.MENTIONS}"]`).forEach(e => {
      const s = e.source();
      res.push({ id: e.id(), type: 'mention', title: s.data('title'), sourceId: s.id(), targetId: noteId });
    });
    
    return res;
  }

  public getRelatedNotes(noteId: string) {
    const n = this.cy.getElementById(noteId);
    return n && n.data('type') === NodeType.NOTE 
      ? n.neighborhood().nodes(`[type = "${NodeType.NOTE}"]`) 
      : this.cy.collection();
  }

  public importFromStore(notes: any[], clusters: any[] = []) {
    this.initializeGraph();

    // Create a map to track processed clusters for quick lookup
    const processedClusterIds = new Set<string>();
    
    // First phase: Create all clusters before processing any notes
    this.cy.batch(() => {
      // First, ensure default cluster exists if needed
      const needsDefaultCluster = 
        notes.some(note => note.clusterId === 'default-cluster') && 
        !clusters.some(c => c.id === 'default-cluster');

      if (needsDefaultCluster) {
        console.log("Creating default cluster because it's needed but not in clusters array");
        const defaultCluster = this.addCluster({
          id: 'default-cluster',
          title: 'Main Cluster',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        processedClusterIds.add('default-cluster');
        this.clusterExists.add('default-cluster');
      }
      
      // Then add all other clusters from the array
      clusters.forEach(cluster => {
        if (processedClusterIds.has(cluster.id)) return; // Skip if already processed
        
        const clusterNode = this.addCluster({
          id: cluster.id,
          title: cluster.title,
          createdAt: cluster.createdAt,
          updatedAt: cluster.updatedAt
        });
        processedClusterIds.add(cluster.id);
        this.clusterExists.add(cluster.id);
        console.log(`Added cluster: ${cluster.id}`);
      });
    });
    
    // Second phase: Process folders and notes
    this.cy.batch(() => {
      // First process folders
      const folderNotes = notes.filter(note => note.type === 'folder');
      folderNotes.forEach(folder => {
        this.addFolder({
          id: folder.id,
          title: folder.title || folder.name,
          path: folder.path,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt
        }, folder.parentId);
      });

      // Then process regular notes
      const regularNotes = notes.filter(note => note.type !== 'folder');
      regularNotes.forEach(note => {
        const node = this.addNote({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          path: note.path
        }, note.parentId);
        
        // Set cluster without creating the edge yet - we'll create edges later
        if (note.clusterId) {
          node.data('cluster', note.clusterId);
        }
        
        note.tags?.forEach((tag: string) => {
          this.tagNote(note.id, tag);
        });
        
        if (note.content) {
          this.updateNoteRelations(note.id, JSON.stringify(note.content));
        }
      });
      
      // Finally, create cluster edges for all nodes that need them
      this.cy.nodes().forEach(node => {
        const nodeClusterId = node.data('cluster');
        if (nodeClusterId && processedClusterIds.has(nodeClusterId)) {
          this.createClusterEdge(node.id(), nodeClusterId);
        }
      });
    });

    this.queueNotify([]);
  }

  public exportToStore() {
    const notes: any[] = [];
    const clusters: any[] = [];

    this.cy.$(`node[type = "${NodeType.FOLDER}"]`).forEach(folder => {
      notes.push({
        id: folder.id(),
        title: folder.data('title'),
        content: [],
        createdAt: folder.data('createdAt'),
        updatedAt: folder.data('updatedAt'),
        path: folder.data('path'),
        parentId: folder.data('parent') || null,
        type: 'folder',
        clusterId: folder.data('cluster') || null
      });
    });

    this.cy.$(`node[type = "${NodeType.NOTE}"]`).forEach(note => {
      notes.push({
        id: note.id(),
        title: note.data('title'),
        content: note.data('content'),
        createdAt: note.data('createdAt'),
        updatedAt: note.data('updatedAt'),
        path: note.data('path'),
        parentId: note.data('parent') || null,
        type: 'note',
        clusterId: note.data('cluster') || null,
        tags: this.getNoteTags(note.id())
      });
    });

    this.cy.$(`node[type = "${NodeType.CLUSTER_DEFINITION}"]`).forEach(node => {
      clusters.push({
        id: node.id(),
        title: node.data('title'),
        createdAt: node.data('createdAt'),
        updatedAt: node.data('updatedAt')
      });
    });

    return { notes, clusters };
  }

  private getNoteTags(noteId: string): string[] {
    const tags: string[] = [];
    const note = this.cy.getElementById(noteId);
    if (note.empty()) return tags;
    
    note.outgoers(`edge[label = "${EdgeType.HAS_TAG}"]`).forEach(edge => {
      const target = edge.target();
      if (target.data('type') === NodeType.TAG) {
        tags.push(target.data('name'));
      }
    });
    
    return tags;
  }
}

export const graphService = new GraphService();
export default graphService;
