
import { Note } from './store';

export const RelationshipTypes = {
  MENTIONS: 'Mentions', // Default
  RELATED_TO: 'Related To',
  SUPPORTS: 'Supports',
  CONTRADICTS: 'Contradicts',
  DEFINES: 'Defines',
  EXAMPLE_OF: 'Example Of',
} as const;

export type RelationshipType = typeof RelationshipTypes[keyof typeof RelationshipTypes];

export interface GraphNode {
  id: string;
  title: string;
  type: 'note';
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link';
  relationship: RelationshipType;
}

export interface Graph {
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
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge[]>;
  private incomingEdges: Map<string, GraphEdge[]>;
  private noteTitleToIdMap: Map<string, string>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.incomingEdges = new Map();
    this.noteTitleToIdMap = new Map();
  }

  buildFromNotes(notes: Note[]): void {
    this._clearGraph();
    this._buildTitleMap(notes);

    // First, add all notes as nodes
    notes.forEach(note => {
      this.nodes.set(note.id, {
        id: note.id,
        title: note.title,
        type: 'note'
      });
    });

    // Then parse links from content and create edges
    notes.forEach(note => {
      const links = this.findLinksInContent(note.content);
      
      links.forEach(linkInfo => {
        // Find the target note by title (case-insensitive)
        const targetId = this._findNoteIdByTitle(linkInfo.title);
        if (targetId) {
          this.addEdge(note.id, targetId, linkInfo.relationship);
        }
      });
    });
  }

  private _clearGraph(): void {
    this.nodes.clear();
    this.edges.clear();
    this.incomingEdges.clear();
    this.noteTitleToIdMap.clear();
  }

  private _buildTitleMap(notes: Note[]): void {
    notes.forEach(note => {
      this.noteTitleToIdMap.set(note.title.toLowerCase(), note.id);
    });
  }

  private _findNoteIdByTitle(title: string): string | undefined {
    return this.noteTitleToIdMap.get(title.toLowerCase());
  }

  findLinksInContent(content: any[]): LinkInfo[] {
    const links: LinkInfo[] = [];
    
    // Extract all text from blocks to find [[links]]
    const text = this._extractTextFromBlocks(content);
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?(?:\|(.*?))?\]\]/g;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        const title = match[1].trim();
        const relationshipInput = match[3]?.trim();
        
        // Determine relationship type based on input or default to MENTIONS
        let relationship = RelationshipTypes.MENTIONS;
        
        if (relationshipInput) {
          // Check if the relationship input matches any known relationship type
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
      
      // If block has content as string
      if (block.content && typeof block.content === 'string') {
        text += ' ' + block.content;
      }
      
      // If block has content as array (nested blocks)
      if (block.content && Array.isArray(block.content)) {
        block.content.forEach(processBlock);
      }
      
      // If block is an array itself
      if (Array.isArray(block)) {
        block.forEach(processBlock);
      }
      
      // Check for text property
      if (block.text && typeof block.text === 'string') {
        text += ' ' + block.text;
      }
    };
    
    blocks.forEach(processBlock);
    return text;
  }

  private addEdge(sourceId: string, targetId: string, relationship: RelationshipType): void {
    // Don't add self-references
    if (sourceId === targetId) return;
    
    const edge: GraphEdge = {
      source: sourceId,
      target: targetId,
      type: 'link',
      relationship
    };

    // Add to outgoing edges from source
    if (!this.edges.has(sourceId)) {
      this.edges.set(sourceId, []);
    }
    
    // Check if this edge already exists
    const existingEdges = this.edges.get(sourceId)!;
    const edgeExists = existingEdges.some(e => 
      e.source === sourceId && e.target === targetId && e.relationship === relationship
    );
    
    if (!edgeExists) {
      existingEdges.push(edge);
    }
    
    // Add to incoming edges to target
    if (!this.incomingEdges.has(targetId)) {
      this.incomingEdges.set(targetId, []);
    }
    
    // Check if this edge already exists in incoming
    const existingIncomingEdges = this.incomingEdges.get(targetId)!;
    const incomingEdgeExists = existingIncomingEdges.some(e => 
      e.source === sourceId && e.target === targetId && e.relationship === relationship
    );
    
    if (!incomingEdgeExists) {
      existingIncomingEdges.push(edge);
    }
  }

  getOutgoingLinks(noteId: string): NodeWithRelationship[] {
    const outgoingEdges = this.edges.get(noteId) || [];
    return outgoingEdges
      .map(edge => {
        const node = this.nodes.get(edge.target);
        return node ? { node, relationship: edge.relationship } : null;
      })
      .filter((item): item is NodeWithRelationship => item !== null);
  }

  getIncomingLinks(noteId: string): NodeWithRelationship[] {
    const incomingEdges = this.incomingEdges.get(noteId) || [];
    return incomingEdges
      .map(edge => {
        const node = this.nodes.get(edge.source);
        return node ? { node, relationship: edge.relationship } : null;
      })
      .filter((item): item is NodeWithRelationship => item !== null);
  }

  toJSON(): Graph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()).flat()
    };
  }

  static fromJSON(graphData: Graph): KnowledgeGraph {
    const graph = new KnowledgeGraph();
    
    graphData.nodes.forEach(node => {
      graph.nodes.set(node.id, node);
    });
    
    graphData.edges.forEach(edge => {
      if (!graph.edges.has(edge.source)) {
        graph.edges.set(edge.source, []);
      }
      graph.edges.get(edge.source)!.push(edge);
      
      // Also rebuild incoming edges
      if (!graph.incomingEdges.has(edge.target)) {
        graph.incomingEdges.set(edge.target, []);
      }
      graph.incomingEdges.get(edge.target)!.push(edge);
    });
    
    return graph;
  }
}
