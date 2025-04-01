
import Graph from 'graphology'; // Import graphology
import { Note, Folder } from './store'; // Keep existing imports

export const RelationshipTypes = {
  MENTIONS: 'Mentions', // Default
  RELATED_TO: 'Related To',
  SUPPORTS: 'Supports',
  CONTRADICTS: 'Contradicts',
  DEFINES: 'Defines',
  EXAMPLE_OF: 'Example Of',
} as const;

export type RelationshipType = typeof RelationshipTypes[keyof typeof RelationshipTypes];

// Define attribute interfaces for clarity
export interface FolderNodeAttributes {
  type: 'folder';
  title: string; // Use folder name as title
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteNodeAttributes {
  type: 'note';
  title: string;
  path: string; // Path of the folder containing the note
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

// Union type for node attributes
export type NodeAttributes = FolderNodeAttributes | NoteNodeAttributes;
// Union type for edge attributes
export type EdgeAttributes = ContainsEdgeAttributes | LinkEdgeAttributes;

export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'folder';
  path?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link' | 'contains';
  relationship?: RelationshipType;
}

// Rename this interface to avoid conflict with the graphology Graph
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
    // Initialize graphology instance with appropriate options
    this.graph = new Graph<NodeAttributes, EdgeAttributes>({
      type: 'directed', // We need directed edges for relationships
      multi: false, // No parallel edges between same nodes with same type
      allowSelfLoops: false // No self-referencing nodes
    });
    this.noteTitleToIdMap = new Map();
  }

  buildGraph(notes: Note[], folders: Folder[]): void {
    this._clearGraph();
    this._buildTitleMap(notes);

    // 1. Add Folder Nodes
    folders.forEach(folder => {
      if (!this.graph.hasNode(folder.id)) {
        this.graph.addNode(folder.id, {
          type: 'folder',
          title: folder.name,
          path: folder.path,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt
        });
      } else {
        // Update existing node attributes if needed
        this.graph.mergeNodeAttributes(folder.id, {
          title: folder.name,
          path: folder.path,
          updatedAt: folder.updatedAt
        });
      }
    });

    // 2. Add Folder Hierarchy Edges ('contains')
    folders.forEach(folder => {
      if (folder.parentId && this.graph.hasNode(folder.parentId) && this.graph.hasNode(folder.id)) {
        // Add folder containment edges
        this.graph.mergeDirectedEdge(folder.parentId, folder.id, {
          type: 'contains'
        });
      }
    });

    // 3. Add Note Nodes
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
        // Update existing node attributes if needed
        this.graph.mergeNodeAttributes(note.id, {
          title: note.title,
          path: note.path,
          updatedAt: note.updatedAt,
          tags: note.tags
        });
      }
    });

    // 4. Add Folder -> Note Edges ('contains')
    notes.forEach(note => {
      const parentFolder = folders.find(f => f.path === note.path);
      const parentFolderId = parentFolder ? parentFolder.id : (note.path === '/' ? 'root' : null);

      if (parentFolderId && this.graph.hasNode(parentFolderId) && this.graph.hasNode(note.id)) {
        this.graph.mergeDirectedEdge(parentFolderId, note.id, {
          type: 'contains'
        });
      }
    });

    // 5. Add Note -> Note Edges ('link') based on [[Title]]
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
    this.graph.clear(); // Clears nodes and edges
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
    
    // Extract all text from blocks to find [[links]]
    const text = this._extractTextFromBlocks(content);
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?(?:\|(.*?))?\]\]/g;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        const title = match[1].trim();
        const relationshipInput = match[3]?.trim();
        
        // Determine relationship type based on input or default to MENTIONS
        let relationship: RelationshipType = RelationshipTypes.MENTIONS;
        
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

  getOutgoingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const outgoingLinks: NodeWithRelationship[] = [];
    
    this.graph.forEachOutboundNeighbor(noteId, (targetId, targetAttributes) => {
      // Check if the edge type is 'link'
      if (this.graph.hasDirectedEdge(noteId, targetId)) {
        const edgeAttributes = this.graph.getDirectedEdgeAttributes(noteId, targetId);
        
        if (edgeAttributes.type === 'link' && targetAttributes.type === 'note') {
          const node: GraphNode = {
            id: targetId,
            title: targetAttributes.title,
            type: targetAttributes.type
          };
          
          outgoingLinks.push({
            node,
            relationship: edgeAttributes.relationship as RelationshipType
          });
        }
      }
    });
    
    return outgoingLinks;
  }

  getIncomingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const incomingLinks: NodeWithRelationship[] = [];
    
    this.graph.forEachInboundNeighbor(noteId, (sourceId, sourceAttributes) => {
      // Check if the edge type is 'link'
      if (this.graph.hasDirectedEdge(sourceId, noteId)) {
        const edgeAttributes = this.graph.getDirectedEdgeAttributes(sourceId, noteId);
        
        if (edgeAttributes.type === 'link' && sourceAttributes.type === 'note') {
          const node: GraphNode = {
            id: sourceId,
            title: sourceAttributes.title,
            type: sourceAttributes.type
          };
          
          incomingLinks.push({
            node,
            relationship: edgeAttributes.relationship as RelationshipType
          });
        }
      }
    });
    
    return incomingLinks;
  }

  toJSON(): GraphData {
    // Convert the graphology graph to our Graph format
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    this.graph.forEachNode((nodeId, attributes) => {
      nodes.push({
        id: nodeId,
        title: attributes.title,
        type: attributes.type,
        path: 'path' in attributes ? attributes.path : undefined
      });
    });
    
    this.graph.forEachEdge((edgeId, attributes, source, target) => {
      if (attributes.type === 'link') {
        edges.push({
          source,
          target,
          type: 'link',
          relationship: attributes.relationship
        });
      } else if (attributes.type === 'contains') {
        edges.push({
          source,
          target,
          type: 'contains'
        });
      }
    });
    
    return { nodes, edges };
  }

  static fromJSON(graphData: GraphData): KnowledgeGraph {
    const kg = new KnowledgeGraph();
    
    // Clear the graph first
    kg.graph.clear();
    
    // Add nodes
    graphData.nodes.forEach(node => {
      const nodeAttributes: NodeAttributes = node.type === 'folder' 
        ? {
            type: 'folder',
            title: node.title,
            path: node.path || '/',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } 
        : {
            type: 'note',
            title: node.title,
            path: node.path || '/',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: []
          };
          
      kg.graph.addNode(node.id, nodeAttributes);
    });
    
    // Add edges
    graphData.edges.forEach(edge => {
      if (edge.type === 'link') {
        kg.graph.addDirectedEdge(edge.source, edge.target, {
          type: 'link',
          relationship: edge.relationship || RelationshipTypes.MENTIONS
        });
      } else if (edge.type === 'contains') {
        kg.graph.addDirectedEdge(edge.source, edge.target, {
          type: 'contains'
        });
      }
    });
    
    return kg;
  }
}
