import Graph from 'graphology';
import { Note, Folder } from './store';

export const RelationshipTypes = {
  MENTIONS: 'Mentions',
  RELATED_TO: 'Related To',
  SUPPORTS: 'Supports',
  CONTRADICTS: 'Contradicts',
  DEFINES: 'Defines',
  EXAMPLE_OF: 'Example Of',
} as const;

export type RelationshipType = typeof RelationshipTypes[keyof typeof RelationshipTypes];

export interface FolderNodeAttributes {
  type: 'folder';
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteNodeAttributes {
  type: 'note';
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface ContainsEdgeAttributes {
  type: 'contains';
}

export interface LinkEdgeAttributes {
  type: 'link';
  relationship: RelationshipType;
}

export type NodeAttributes = FolderNodeAttributes | NoteNodeAttributes;
export type EdgeAttributes = ContainsEdgeAttributes | LinkEdgeAttributes;

export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'folder';
  path?: string;
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link' | 'contains';
  relationship?: RelationshipType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface LinkInfo {
  title: string;
  relationship: RelationshipType;
}

export interface NodeWithRelationship {
  node: GraphNode;
  relationship: RelationshipType;
}

export class KnowledgeGraph {
  private graph: Graph<NodeAttributes, EdgeAttributes>;
  private noteTitleToIdMap: Map<string, string>;

  constructor() {
    this.graph = new Graph<NodeAttributes, EdgeAttributes>({
      type: 'directed',
      multi: false,
      allowSelfLoops: false
    });
    this.noteTitleToIdMap = new Map();
  }

  buildGraph(notes: Note[], folders: Folder[]): void {
    this._clearGraph();
    this._buildTitleMap(notes);

    folders.forEach(folder => {
      if (!this.graph.hasNode(folder.id)) {
        this.graph.addNode(folder.id, {
          type: 'folder',
          title: folder.name,
          path: folder.path,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        });
      } else {
        this.graph.mergeNodeAttributes(folder.id, {
          title: folder.name,
          path: folder.path,
          updatedAt: folder.updatedAt,
        });
      }
    });

    folders.forEach(folder => {
      if (folder.parentId && this.graph.hasNode(folder.parentId) && this.graph.hasNode(folder.id)) {
        this.graph.mergeDirectedEdge(folder.parentId, folder.id, {
          type: 'contains'
        });
      }
    });

    notes.forEach(note => {
      if (!this.graph.hasNode(note.id)) {
        this.graph.addNode(note.id, {
          type: 'note',
          title: note.title,
          path: note.path,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          tags: note.tags
        });
      } else {
        this.graph.mergeNodeAttributes(note.id, {
          title: note.title,
          path: note.path,
          updatedAt: note.updatedAt,
          tags: note.tags
        });
      }
    });

    notes.forEach(note => {
      folders.forEach(folder => {
        if (folder.path === note.path) {
          this.graph.mergeDirectedEdge(folder.id, note.id, {
            type: 'contains'
          });
        }
      });

      if (note.path === '/' && folders.some(f => f.id === 'root')) {
        this.graph.mergeDirectedEdge('root', note.id, {
          type: 'contains'
        });
      }
    });

    notes.forEach(note => {
      const links = this.findLinksInContent(note.content);
      links.forEach(linkInfo => {
        const targetId = this._findNoteIdByTitle(linkInfo.title);
        if (targetId && targetId !== note.id && this.graph.hasNode(note.id) && this.graph.hasNode(targetId)) {
          this.graph.mergeDirectedEdge(note.id, targetId, {
            type: 'link',
            relationship: linkInfo.relationship
          });
        }
      });
    });
  }

  private _clearGraph(): void {
    this.graph.clear();
    this.noteTitleToIdMap.clear();
  }

  private _buildTitleMap(notes: Note[]): void {
    this.noteTitleToIdMap.clear();
    notes.forEach(note => {
      this.noteTitleToIdMap.set(note.title.toLowerCase(), note.id);
    });
  }

  private _findNoteIdByTitle(title: string): string | undefined {
    return this.noteTitleToIdMap.get(title.toLowerCase());
  }

  findLinksInContent(content: any[]): LinkInfo[] {
    const links: LinkInfo[] = [];
    
    const text = this._extractTextFromBlocks(content);
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?(?:\|(.*?))?\]\]/g;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        const title = match[1].trim();
        const relationshipInput = match[3]?.trim();
        
        let relationship = RelationshipTypes.MENTIONS;
        
        if (relationshipInput) {
          const matchedRelationship = Object.values(RelationshipTypes).find(
            r => r.toLowerCase() === relationshipInput.toLowerCase()
          );
          if (matchedRelationship) {
            relationship = matchedRelationship;
          }
        }
        
        links.push({ title, relationship });
      }
    }
    
    return links;
  }

  private _extractTextFromBlocks(blocks: any[]): string {
    let text = '';
    
    const processBlock = (block: any): void => {
      if (!block) return;
      
      if (block.content && typeof block.content === 'string') {
        text += ' ' + block.content;
      }
      
      if (block.content && Array.isArray(block.content)) {
        block.content.forEach(processBlock);
      }
      
      if (Array.isArray(block)) {
        block.forEach(processBlock);
      }
      
      if (block.text && typeof block.text === 'string') {
        text += ' ' + block.text;
      }
    };
    
    blocks.forEach(processBlock);
    return text;
  }

  getOutgoingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const outgoingLinks: NodeWithRelationship[] = [];
    
    this.graph.forEachOutboundNeighbor(noteId, (targetId, targetAttrs) => {
      const edgeAttributes = this.graph.getEdgeAttributes(
        this.graph.edge(noteId, targetId)
      ) as EdgeAttributes;
      
      if (edgeAttributes.type === 'link') {
        outgoingLinks.push({
          node: {
            id: targetId,
            title: targetAttrs.title,
            type: targetAttrs.type,
            path: 'path' in targetAttrs ? targetAttrs.path : undefined,
            tags: 'tags' in targetAttrs ? targetAttrs.tags : undefined
          },
          relationship: (edgeAttributes as LinkEdgeAttributes).relationship
        });
      }
    });
    
    return outgoingLinks;
  }

  getIncomingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const incomingLinks: NodeWithRelationship[] = [];
    
    this.graph.forEachInboundNeighbor(noteId, (sourceId, sourceAttrs) => {
      const edgeAttributes = this.graph.getEdgeAttributes(
        this.graph.edge(sourceId, noteId)
      ) as EdgeAttributes;
      
      if (edgeAttributes.type === 'link') {
        incomingLinks.push({
          node: {
            id: sourceId,
            title: sourceAttrs.title,
            type: sourceAttrs.type,
            path: 'path' in sourceAttrs ? sourceAttrs.path : undefined,
            tags: 'tags' in sourceAttrs ? sourceAttrs.tags : undefined
          },
          relationship: (edgeAttributes as LinkEdgeAttributes).relationship
        });
      }
    });
    
    return incomingLinks;
  }

  toJSON(): GraphData {
    const nodes = this.graph.mapNodes((nodeId, attributes) => ({
      id: nodeId,
      title: attributes.title,
      type: attributes.type,
      path: 'path' in attributes ? attributes.path : undefined,
      tags: 'tags' in attributes ? attributes.tags : undefined
    }));

    const edges = this.graph.mapEdges((edgeId, attributes, sourceId, targetId) => {
      const edge: GraphEdge = {
        source: sourceId,
        target: targetId,
        type: attributes.type
      };
      
      if (attributes.type === 'link') {
        edge.relationship = (attributes as LinkEdgeAttributes).relationship;
      }
      
      return edge;
    });

    return { nodes, edges };
  }

  static fromJSON(graphData: GraphData): KnowledgeGraph {
    const graph = new KnowledgeGraph();
    
    graphData.nodes.forEach(node => {
      if (node.type === 'note') {
        graph.graph.addNode(node.id, {
          type: 'note',
          title: node.title,
          path: node.path || '/',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: node.tags || []
        });
      } else if (node.type === 'folder') {
        graph.graph.addNode(node.id, {
          type: 'folder',
          title: node.title,
          path: node.path || '/',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    graphData.edges.forEach(edge => {
      if (graph.graph.hasNode(edge.source) && graph.graph.hasNode(edge.target)) {
        if (edge.type === 'link') {
          graph.graph.addDirectedEdge(edge.source, edge.target, {
            type: 'link',
            relationship: edge.relationship || RelationshipTypes.MENTIONS
          });
        } else if (edge.type === 'contains') {
          graph.graph.addDirectedEdge(edge.source, edge.target, {
            type: 'contains'
          });
        }
      }
    });
    
    const noteNodes = graphData.nodes.filter(node => node.type === 'note');
    graph._buildTitleMap(noteNodes.map(node => ({
      id: node.id,
      title: node.title,
      content: [],
      createdAt: '',
      updatedAt: '',
      path: node.path || '/',
      tags: node.tags || []
    })));
    
    return graph;
  }
}
