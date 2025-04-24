
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';

export enum NodeType {
  NOTE = 'note',
  FOLDER = 'folder',
  CLUSTER = 'cluster',
  TAG = 'tag',
  CONCEPT = 'concept'
}

export enum EdgeType {
  CONTAINS = 'contains',
  NOTE_LINK = 'note_link',
  HAS_TAG = 'has_tag',
  MENTIONS = 'mentions',
  HAS_CONCEPT = 'has_concept'
}

export class GraphService {
  private cy: Core;
  private titleIndex = new Map<string, string>();

  constructor() {
    this.cy = cytoscape({ headless: true });
    this.initializeGraph();
  }

  private initializeGraph() {
    // Clear existing elements
    this.cy.elements().remove();
    this.titleIndex.clear();
  }

  public addNote(note: Partial<Note>, parentId?: string): NodeSingular {
    const nodeData = {
      id: note.id || `note-${Date.now()}`,
      type: NodeType.NOTE,
      title: note.title || 'Untitled',
      content: note.content || [],
      parent: parentId,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString()
    };

    const node = this.cy.add({ data: nodeData });
    this.titleIndex.set(slug(nodeData.title), nodeData.id);
    return node;
  }

  public addCluster(cluster: Partial<Cluster>): NodeSingular {
    return this.cy.add({
      data: {
        id: cluster.id || `cluster-${Date.now()}`,
        type: NodeType.CLUSTER,
        title: cluster.title || 'Untitled Cluster',
        createdAt: cluster.createdAt || new Date().toISOString(),
        updatedAt: cluster.updatedAt || new Date().toISOString()
      }
    });
  }

  public updateNote(id: string, updates: Partial<Note>): boolean {
    const node = this.cy.$id(id);
    if (node.empty()) return false;

    if (updates.title) {
      const oldTitle = node.data('title');
      this.titleIndex.delete(slug(oldTitle));
      this.titleIndex.set(slug(updates.title), id);
    }

    node.data(updates);
    return true;
  }

  public deleteNote(id: string): boolean {
    const node = this.cy.$id(id);
    if (node.empty()) return false;

    this.titleIndex.delete(slug(node.data('title')));
    node.remove();
    return true;
  }

  public moveNode(nodeId: string, newParentId?: string): boolean {
    const node = this.cy.$id(nodeId);
    if (node.empty()) return false;

    node.move({ parent: newParentId });
    return true;
  }

  public searchNodes(query: string): any[] {
    const q = query.toLowerCase();
    return this.cy.nodes().filter(node => {
      const title = (node.data('title') || '').toLowerCase();
      const content = JSON.stringify(node.data('content') || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    }).map(node => ({
      id: node.id(),
      title: node.data('title'),
      type: node.data('type')
    }));
  }

  public getRelatedNotes(noteId: string): any[] {
    const node = this.cy.$id(noteId);
    if (node.empty()) return [];

    return node.neighborhood().nodes().map(n => ({
      id: n.id(),
      title: n.data('title'),
      type: n.data('type')
    }));
  }

  public getBacklinks(noteId: string): any[] {
    return this.cy.edges(`[target = "${noteId}"]`).map(edge => ({
      id: edge.id(),
      sourceId: edge.source().id(),
      sourceTitle: edge.source().data('title'),
      type: edge.data('type')
    }));
  }

  public importFromStore(notes: Note[], clusters: Cluster[]) {
    this.initializeGraph();

    // Add clusters first
    clusters.forEach(cluster => this.addCluster(cluster));

    // Add notes and create relationships
    notes.forEach(note => {
      const node = this.addNote(note, note.clusterId || undefined);
      
      // Process tags
      note.tags?.forEach(tag => {
        const tagNode = this.ensureTagExists(tag);
        this.cy.add({
          data: {
            source: node.id(),
            target: tagNode.id(),
            type: EdgeType.HAS_TAG
          }
        });
      });

      // Process mentions and links from content
      if (note.content) {
        this.processNoteContent(note.id, JSON.stringify(note.content));
      }
    });
  }

  public exportToStore(): { notes: Note[], clusters: Cluster[] } {
    const notes: Note[] = [];
    const clusters: Cluster[] = [];

    this.cy.$(`node[type = "${NodeType.NOTE}"]`).forEach(node => {
      notes.push({
        id: node.id(),
        title: node.data('title'),
        content: node.data('content'),
        createdAt: node.data('createdAt'),
        updatedAt: node.data('updatedAt'),
        parentId: node.data('parent') || null,
        type: 'note',
        clusterId: null,
        tags: this.getNodeTags(node)
      });
    });

    this.cy.$(`node[type = "${NodeType.CLUSTER}"]`).forEach(node => {
      clusters.push({
        id: node.id(),
        title: node.data('title'),
        createdAt: node.data('createdAt'),
        updatedAt: node.data('updatedAt')
      });
    });

    return { notes, clusters };
  }

  private ensureTagExists(tagName: string): NodeSingular {
    const tagId = `tag-${slug(tagName)}`;
    let tagNode = this.cy.$id(tagId);
    
    if (tagNode.empty()) {
      tagNode = this.cy.add({
        data: {
          id: tagId,
          type: NodeType.TAG,
          name: tagName
        }
      });
    }

    return tagNode;
  }

  private processNoteContent(noteId: string, content: string) {
    // Extract mentions and create edges
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedTitle = match[1];
      const mentionedId = this.titleIndex.get(slug(mentionedTitle));
      if (mentionedId) {
        this.cy.add({
          data: {
            source: noteId,
            target: mentionedId,
            type: EdgeType.MENTIONS
          }
        });
      }
    }
  }

  private getNodeTags(node: NodeSingular): string[] {
    return node.outgoers(`edge[type = "${EdgeType.HAS_TAG}"]`)
      .targets()
      .map(tagNode => tagNode.data('name'));
  }
}

export const graphService = new GraphService();
export default graphService;
