
import { Note } from './store';

export interface GraphNode {
  id: string;
  title: string;
  type: 'note';
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link';
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge[]>;
  private noteTitleToIdMap: Map<string, string>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
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
      
      links.forEach(targetTitle => {
        // Find the target note by title (case-insensitive)
        const targetId = this._findNoteIdByTitle(targetTitle);
        if (targetId) {
          this.addEdge(note.id, targetId);
        }
      });
    });
  }

  private _clearGraph(): void {
    this.nodes.clear();
    this.edges.clear();
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

  findLinksInContent(content: any[]): string[] {
    const links: Set<string> = new Set();
    
    // Extract all text from blocks to find [[links]]
    const text = this._extractTextFromBlocks(content);
    const linkRegex = /\[\[(.*?)\]\]/g;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        links.add(match[1].trim());
      }
    }
    
    return Array.from(links);
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

  private addEdge(sourceId: string, targetId: string): void {
    // Don't add self-references
    if (sourceId === targetId) return;
    
    const edge: GraphEdge = {
      source: sourceId,
      target: targetId,
      type: 'link'
    };

    // Add to outgoing edges from source
    if (!this.edges.has(sourceId)) {
      this.edges.set(sourceId, []);
    }
    
    // Check if this edge already exists
    const existingEdges = this.edges.get(sourceId)!;
    const edgeExists = existingEdges.some(e => 
      e.source === sourceId && e.target === targetId
    );
    
    if (!edgeExists) {
      existingEdges.push(edge);
    }
  }

  getOutgoingLinks(noteId: string): GraphNode[] {
    const outgoingEdges = this.edges.get(noteId) || [];
    return outgoingEdges
      .map(edge => this.nodes.get(edge.target))
      .filter((node): node is GraphNode => node !== undefined);
  }

  getIncomingLinks(noteId: string): GraphNode[] {
    const incomingNodes: GraphNode[] = [];
    
    this.edges.forEach((edges, sourceId) => {
      edges.forEach(edge => {
        if (edge.target === noteId) {
          const sourceNode = this.nodes.get(sourceId);
          if (sourceNode) {
            incomingNodes.push(sourceNode);
          }
        }
      });
    });
    
    return incomingNodes;
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
    });
    
    return graph;
  }
}
