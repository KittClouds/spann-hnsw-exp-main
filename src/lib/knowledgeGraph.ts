
import Graph from 'graphology';
import { Note, Folder } from './store';

// Define attribute interfaces for clarity
export interface FolderNodeAttributes {
  type: 'folder';
  id: string;
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  clusterId: string;
}

export interface NoteNodeAttributes {
  type: 'note';
  id: string;
  title: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  clusterId: string;
}

export interface ContainsEdgeAttributes {
  type: 'contains';
}

export interface LinkEdgeAttributes {
  type: 'link';
  linkType: 'Mentions';
}

// Union type for node attributes
export type NodeAttributes = FolderNodeAttributes | NoteNodeAttributes;
// Union type for edge attributes
export type EdgeAttributes = ContainsEdgeAttributes | LinkEdgeAttributes;

export class KnowledgeGraph {
  // Use generic types for better type safety with graphology
  private graph: Graph<NodeAttributes, EdgeAttributes>;
  private noteTitleToIdMap: Map<string, string>; // Keep this for link resolution

  constructor() {
    // Initialize graphology instance.
    // Directed graph makes sense for hierarchy ('contains') and links.
    // Multi-graph not needed
    this.graph = new Graph<NodeAttributes, EdgeAttributes>({
       type: 'directed',
       multi: false, // Prevents adding the exact same edge type between two nodes twice
       allowSelfLoops: false
    });
    this.noteTitleToIdMap = new Map();
  }
  
  // Build the graph from notes and folders
  buildGraph(notes: Note[], folders: Folder[]): void {
    this._clearGraph();
    this._buildTitleMap(notes); // For resolving [[links]]

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
          clusterId: folder.clusterId,
        });
      } else {
        // Optionally update existing node attributes if needed
        this.graph.mergeNodeAttributes(folder.id, {
          title: folder.name,
          path: folder.path,
          updatedAt: folder.updatedAt,
          clusterId: folder.clusterId,
        });
      }
    });

    // 2. Add Folder Hierarchy Edges ('contains')
    folders.forEach(folder => {
      if (folder.parentId && this.graph.hasNode(folder.parentId) && this.graph.hasNode(folder.id)) {
        // Use mergeDirectedEdge to add or update edge attributes (idempotent)
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
          tags: note.tags,
          clusterId: note.clusterId,
        });
      } else {
        this.graph.mergeNodeAttributes(note.id, {
           title: note.title,
           path: note.path,
           updatedAt: note.updatedAt,
           tags: note.tags,
           clusterId: note.clusterId,
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
             type: 'link',
             linkType: 'Mentions'
           });
        }
      });
    });
  }

  // Helper to clear graph and title map before rebuild
  private _clearGraph(): void {
    this.graph.clear(); // Clears nodes and edges
    this.noteTitleToIdMap.clear();
  }

  // Build map of note titles to IDs for link resolution
  private _buildTitleMap(notes: Note[]): void {
    this.noteTitleToIdMap.clear(); // Ensure it's clear before building
    notes.forEach(note => {
      this.noteTitleToIdMap.set(note.title.toLowerCase(), note.id);
    });
  }

  // Find a note ID by its title (case-insensitive)
  private _findNoteIdByTitle(title: string): string | undefined {
    return this.noteTitleToIdMap.get(title.toLowerCase());
  }

  // Find wiki-style links [[Title]] in content blocks
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
  
  // Helper to extract text from complex content blocks
  private _extractTextFromBlocks(blocks: any[]): string {
    let text = '';
    
    const processBlock = (block: any): void => {
      if (!block) return;
      
      // Handle string content
      if (typeof block.content === 'string') {
        text += ' ' + block.content;
        return;
      }
      
      // Handle array content (recursively)
      if (Array.isArray(block.content)) {
        block.content.forEach(processBlock);
        return;
      }
      
      // Handle nested content or text
      if (block.text) {
        text += ' ' + block.text;
      }
      
      // Handle children recursively if available
      if (Array.isArray(block.children)) {
        block.children.forEach(processBlock);
      }
    };
    
    if (Array.isArray(blocks)) {
      blocks.forEach(processBlock);
    }
    
    return text;
  }

  // Get nodes linked *from* a given noteId (only 'link' type)
  getLinkedNotes(noteId: string): NoteNodeAttributes[] {
    if (!this.graph.hasNode(noteId)) return [];
    const linkedNotes: NoteNodeAttributes[] = [];
    
    this.graph.forEachOutboundNeighbor(noteId, (neighborId, neighborAttrs) => {
      // Check the edge type
      if (this.graph.hasDirectedEdge(noteId, neighborId)) {
        const edgeAttrs = this.graph.getDirectedEdgeAttributes(noteId, neighborId);
        if (edgeAttrs.type === 'link') {
          // Ensure the neighbor is actually a note
          if (neighborAttrs.type === 'note') {
             linkedNotes.push(neighborAttrs as NoteNodeAttributes);
          }
        }
      }
    });
    
    return linkedNotes;
  }

  // Get notes linking *to* a given noteId (only 'link' type)
  getLinkingNotes(noteId: string): NoteNodeAttributes[] {
    if (!this.graph.hasNode(noteId)) return [];
    const linkingNotes: NoteNodeAttributes[] = [];
    
    this.graph.forEachInboundNeighbor(noteId, (neighborId, neighborAttrs) => {
      if (this.graph.hasDirectedEdge(neighborId, noteId)) {
        const edgeAttrs = this.graph.getDirectedEdgeAttributes(neighborId, noteId);
        if (edgeAttrs.type === 'link') {
          if (neighborAttrs.type === 'note') {
             linkingNotes.push(neighborAttrs as NoteNodeAttributes);
          }
        }
      }
    });
    
    return linkingNotes;
  }

  // Get child folders and notes within a folder
  getFolderContents(folderId: string): { folders: FolderNodeAttributes[], notes: NoteNodeAttributes[] } {
    if (!this.graph.hasNode(folderId)) return { folders: [], notes: [] };

    const folders: FolderNodeAttributes[] = [];
    const notes: NoteNodeAttributes[] = [];

    this.graph.forEachOutboundNeighbor(folderId, (childId, childAttrs) => {
      if (this.graph.hasDirectedEdge(folderId, childId)) {
        const edgeAttrs = this.graph.getDirectedEdgeAttributes(folderId, childId);
        if (edgeAttrs.type === 'contains') {
          if (childAttrs.type === 'folder') {
            folders.push(childAttrs as FolderNodeAttributes);
          } else if (childAttrs.type === 'note') {
            notes.push(childAttrs as NoteNodeAttributes);
          }
        }
      }
    });
    
    return { folders, notes };
  }

  // Get parent folder of a note or folder
  getParentFolder(nodeId: string): FolderNodeAttributes | null {
    if (!this.graph.hasNode(nodeId)) return null;
    let parentFolder: FolderNodeAttributes | null = null;
    
    this.graph.forEachInboundNeighbor(nodeId, (parentId, parentAttrs) => {
      // Find the edge connecting them
      if (this.graph.hasDirectedEdge(parentId, nodeId)) {
        const edgeAttrs = this.graph.getDirectedEdgeAttributes(parentId, nodeId);
        if (edgeAttrs.type === 'contains') {
          if (parentAttrs.type === 'folder') {
            parentFolder = parentAttrs as FolderNodeAttributes;
            return true; // Stop iteration
          }
        }
      }
      return false;
    });
    
    return parentFolder;
  }

  // Export graph data in graphology's standard format
  exportGraph(): object {
    return this.graph.export();
  }

  // Import graph data
  importGraph(serializedGraph: object): void {
    this.graph.import(serializedGraph);
    // Rebuild the noteTitleToIdMap separately
    this._buildTitleMapFromGraph();
  }

  // Rebuild title map from graph data
  private _buildTitleMapFromGraph(): void {
    this.noteTitleToIdMap.clear();
    
    this.graph.forEachNode((nodeId, attributes) => {
      if (attributes.type === 'note') {
        this.noteTitleToIdMap.set(attributes.title.toLowerCase(), nodeId);
      }
    });
  }

  // Simple toJSON for easy consumption by visualization or simple APIs
  toJSON(): { nodes: (NodeAttributes & { id: string })[], edges: (EdgeAttributes & { id: string, source: string, target: string })[] } {
    const nodes = this.graph.mapNodes((nodeId, attributes) => ({
      id: nodeId,
      ...attributes
    }));
    
    const edges = this.graph.mapEdges((edgeId, attributes, sourceId, targetId) => ({
      id: edgeId, // graphology internal edge key
      source: sourceId,
      target: targetId,
      ...attributes
    }));
    
    return { nodes, edges };
  }

  // For testing and debugging
  getStats(): { nodeCount: number, edgeCount: number, noteCount: number, folderCount: number, linkCount: number } {
    let noteCount = 0;
    let folderCount = 0;
    let linkCount = 0;
    
    this.graph.forEachNode((_, attrs) => {
      if (attrs.type === 'note') noteCount++;
      else if (attrs.type === 'folder') folderCount++;
    });
    
    this.graph.forEachEdge((_, attrs) => {
      if (attrs.type === 'link') linkCount++;
    });
    
    return {
      nodeCount: this.graph.order,
      edgeCount: this.graph.size,
      noteCount,
      folderCount,
      linkCount
    };
  }
}
