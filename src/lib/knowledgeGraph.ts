
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

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  buildFromNotes(notes: Note[]): void {
    this.nodes.clear();
    this.edges.clear();

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
      const links = this.parseLinks(note.content);
      
      links.forEach(targetTitle => {
        // Find the target note by title
        const targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
        if (targetNote) {
          this.addEdge(note.id, targetNote.id);
        }
      });
    });
  }

  private parseLinks(content: any[]): string[] {
    const links: string[] = [];
    
    const extractLinksFromText = (text: string) => {
      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        links.push(match[1]);
      }
    };

    const processBlock = (block: any) => {
      if (typeof block.content === 'string') {
        extractLinksFromText(block.content);
      } else if (Array.isArray(block.content)) {
        block.content.forEach(processBlock);
      }

      // Handle special link blocks if they exist
      if (block.type === 'link' && block.target) {
        links.push(block.target);
      }
    };

    content.forEach(block => processBlock(block));
    
    return links;
  }

  private addEdge(sourceId: string, targetId: string): void {
    const edge: GraphEdge = {
      source: sourceId,
      target: targetId,
      type: 'link'
    };

    // Add to outgoing edges from source
    if (!this.edges.has(sourceId)) {
      this.edges.set(sourceId, []);
    }
    this.edges.get(sourceId)!.push(edge);
  }

  getOutgoingLinks(noteId: string): GraphNode[] {
    const outgoingEdges = this.edges.get(noteId) || [];
    return outgoingEdges.map(edge => this.nodes.get(edge.target)!).filter(Boolean);
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
