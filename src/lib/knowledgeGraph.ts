import Graph from 'graphology';
import { Note, Folder } from './store';

// Define interfaces for node attributes
export interface FolderNodeAttributes {
  type: 'folder';
  id: string;
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteNodeAttributes {
  type: 'note';
  id: string;
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// Define edge attributes interfaces
export interface ContainsEdgeAttributes {
  type: 'contains';
}

export interface LinkEdgeAttributes {
  type: 'link';
}

// Define union types
export type NodeAttributes = FolderNodeAttributes | NoteNodeAttributes;
export type EdgeAttributes = ContainsEdgeAttributes | LinkEdgeAttributes;

// Define relationship types for connections panel
export enum RelationshipType {
  LINK = 'link',
  CONTAINS = 'contains'
}

export interface NodeWithRelationship {
  id: string;
  title: string;
  relationshipType: RelationshipType;
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

    // 1. Add Folder Nodes
    folders.forEach(folder => {
      if (!this.graph.hasNode(folder.id)) {
        this.graph.addNode(folder.id, {
          type: 'folder',
          id: folder.id,
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

    // 2. Add Folder Hierarchy Edges ('contains')
    folders.forEach(folder => {
      if (folder.parentId && this.graph.hasNode(folder.parentId) && this.graph.hasNode(folder.id)) {
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
          id: note.id,
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
      links.forEach(targetTitle => {
        const targetId = this._findNoteIdByTitle(targetTitle);
        if (targetId && targetId !== note.id && this.graph.hasNode(note.id) && this.graph.hasNode(targetId)) {
           this.graph.mergeDirectedEdge(note.id, targetId, {
             type: 'link'
           });
        }
      });
    });
  }

  // Get outgoing links (notes that this note links to)
  getOutgoingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const links: NodeWithRelationship[] = [];
    this.graph.forEachOutboundNeighbor(noteId, (neighborId, neighborAttrs) => {
      // Only include 'link' type edges, not 'contains'
      if (this.graph.getDirectedEdgeAttribute(noteId, neighborId, 'type') === 'link') {
        if (neighborAttrs.type === 'note') {
          links.push({
            id: neighborId,
            title: neighborAttrs.title,
            relationshipType: RelationshipType.LINK
          });
        }
      }
    });
    return links;
  }

  // Get incoming links (notes that link to this note)
  getIncomingLinks(noteId: string): NodeWithRelationship[] {
    if (!this.graph.hasNode(noteId)) return [];
    
    const links: NodeWithRelationship[] = [];
    this.graph.forEachInboundNeighbor(noteId, (neighborId, neighborAttrs) => {
      if (this.graph.getDirectedEdgeAttribute(neighborId, noteId, 'type') === 'link') {
        if (neighborAttrs.type === 'note') {
          links.push({
            id: neighborId,
            title: neighborAttrs.title,
            relationshipType: RelationshipType.LINK
          });
        }
      }
    });
    return links;
  }

  // Keep the methods that were already in the class
  getLinkedNotes(noteId: string): NoteNodeAttributes[] {
    if (!this.graph.hasNode(noteId)) return [];
    const linkedNotes: NoteNodeAttributes[] = [];
    this.graph.forEachOutboundNeighbor(noteId, (neighborId, neighborAttrs) => {
      if (this.graph.getDirectedEdgeAttribute(noteId, neighborId, 'type') === 'link') {
        if (neighborAttrs.type === 'note') {
           linkedNotes.push(neighborAttrs as NoteNodeAttributes);
        }
      }
    });
    return linkedNotes;
  }

  getLinkingNotes(noteId: string): NoteNodeAttributes[] {
     if (!this.graph.hasNode(noteId)) return [];
     const linkingNotes: NoteNodeAttributes[] = [];
     this.graph.forEachInboundNeighbor(noteId, (neighborId, neighborAttrs) => {
       if (this.graph.getDirectedEdgeAttribute(neighborId, noteId, 'type') === 'link') {
         if (neighborAttrs.type === 'note') {
            linkingNotes.push(neighborAttrs as NoteNodeAttributes);
         }
       }
     });
     return linkingNotes;
  }

  // Helper to clear graph and title map before rebuild
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

  findLinksInContent(content: any[]): string[] {
    const links: Set<string> = new Set();
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
      // Handle string content
      if (block && typeof block.content === 'string') {
        text += ' ' + block.content;
        return;
      }
      
      // Handle array content
      if (block && Array.isArray(block.content)) {
        block.content.forEach((item: any) => {
          if (typeof item === 'string') {
            text += ' ' + item;
          } else if (typeof item === 'object') {
            processBlock(item);
          }
        });
        return;
      }
      
      // For other nested structures
      if (block && typeof block === 'object') {
        Object.values(block).forEach(value => {
          if (Array.isArray(value)) {
            value.forEach(processBlock);
          }
        });
      }
    };
    
    blocks.forEach(processBlock);
    return text;
  }

  // Export graph data for visualization
  exportGraph(): object {
    return this.graph.export();
  }

  // Convert to simple JSON format for API/visualization
  toJSON(): { nodes: (NodeAttributes & { id: string })[], edges: (EdgeAttributes & { id: string, source: string, target: string })[] } {
    const nodes = this.graph.mapNodes((nodeId, attributes) => ({
      id: nodeId,
      ...attributes
    }));
    const edges = this.graph.mapEdges((edgeId, attributes, sourceId, targetId) => ({
      id: edgeId,
      source: sourceId,
      target: targetId,
      ...attributes
    }));
    return { nodes, edges };
  }
}
