
import { Core, NodeSingular, NodeCollection, ElementDefinition, ElementGroup, SingularElementArgument } from 'cytoscape';
import { Note, Cluster } from '@/lib/store';
import { slug } from '@/lib/utils';
import { generateNodeId } from './utils';
import { cytoscape } from './plugins';
import { NodeType, EdgeType, CyElementJSON, GraphJSON } from './types';

export class GraphService {
  private cy: Core | null = null;
  private initialized = false;

  constructor() {
    // Initialize empty instance
  }

  // Initialize cytoscape instance with container
  initialize(container?: HTMLElement): Core {
    if (this.cy && container) {
      // Reinitialize with new container
      this.cy.mount(container);
      return this.cy;
    }

    this.cy = cytoscape({
      container,
      headless: !container,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#11479e',
            'label': 'data(title)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'node[type="folder"]',
          style: {
            'background-color': '#e8a87c',
            'shape': 'roundrectangle'
          }
        },
        {
          selector: 'node[type="tag"]',
          style: {
            'background-color': '#5d576b',
            'shape': 'tag'
          }
        },
        {
          selector: 'node[type="concept"]',
          style: {
            'background-color': '#84a9c0',
            'shape': 'diamond'
          }
        },
        {
          selector: 'node[type="cluster"]',
          style: {
            'background-color': '#8a817c',
            'shape': 'hexagon'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': '3px',
            'border-color': '#d4a373'
          }
        }
      ],
      layout: { name: 'preset' }
    });

    this.setupEvents();
    this.initialized = true;
    return this.cy;
  }

  // Get cytoscape instance
  getGraph(): Core {
    if (!this.cy) {
      this.initialize();
    }
    return this.cy!;
  }

  // Setup event listeners
  private setupEvents() {
    if (!this.cy) return;

    this.cy.on('select', 'node', (event) => {
      const node = event.target;
      console.log('Selected node:', node.id(), node.data());
    });
  }

  // Import notes and clusters from store
  importFromStore(notes: Note[], clusters: Cluster[]) {
    const cy = this.getGraph();
    cy.elements().remove(); // Clear existing elements

    // Add root nodes first
    this.addRootNodes();

    // Add cluster nodes
    clusters.forEach(cluster => {
      this.addCluster(cluster);
    });

    // Add notes and connect them
    notes.forEach(note => {
      this.addNote(note, note.parentId, note.clusterId);
    });

    // Run layout
    cy.layout({ name: 'dagre', rankDir: 'TB' }).run();
    
    return { notes, clusters };
  }

  // Export to store format
  exportToStore(): { notes: Note[], clusters: Cluster[] } {
    const notes: Note[] = [];
    const clusters: Cluster[] = [];
    const cy = this.getGraph();

    // Extract clusters
    cy.nodes(`[type = "${NodeType.CLUSTER_DEFINITION}"]`).forEach(node => {
      const cluster: Cluster = {
        id: node.data('id') as ClusterId,
        title: node.data('title') || 'Untitled Cluster',
        createdAt: node.data('createdAt') || new Date().toISOString(),
        updatedAt: node.data('updatedAt') || new Date().toISOString()
      };
      clusters.push(cluster);
    });

    // Extract notes
    cy.nodes(`[type = "${NodeType.NOTE}"], [type = "${NodeType.FOLDER}"]`).forEach(node => {
      const note: Note = {
        id: node.data('id') as NoteId,
        title: node.data('title') || 'Untitled',
        content: node.data('content') || [],
        createdAt: node.data('createdAt') || new Date().toISOString(),
        updatedAt: node.data('updatedAt') || new Date().toISOString(),
        parentId: node.data('parentId') || null,
        type: node.data('type') as 'note' | 'folder',
        clusterId: node.data('clusterId') || null
      };

      // Add tags
      const tagEdges = node.outgoers(`edge[type = "${EdgeType.HAS_TAG}"]`);
      if (tagEdges.length > 0) {
        note.tags = tagEdges.targets().map(tagNode => tagNode.data('name'));
      }

      // Add mentions
      const mentionEdges = node.outgoers(`edge[type = "${EdgeType.MENTIONS}"]`);
      if (mentionEdges.length > 0) {
        note.mentions = mentionEdges.targets().map(mentionNode => mentionNode.data('name'));
      }

      // Add concepts
      const conceptEdges = node.outgoers(`edge[type = "${EdgeType.HAS_CONCEPT}"]`);
      if (conceptEdges.length > 0) {
        note.concepts = conceptEdges.targets().map(conceptNode => ({
          type: conceptNode.data('conceptType'),
          name: conceptNode.data('name')
        }));
      }

      notes.push(note);
    });

    return { notes, clusters };
  }

  // Add root nodes
  private addRootNodes() {
    const cy = this.getGraph();
    
    // Standard root
    if (cy.getElementById('standard-root').empty()) {
      cy.add({
        group: 'nodes',
        data: {
          id: 'standard-root',
          type: NodeType.STANDARD_ROOT,
          title: 'Standard Root'
        },
        position: { x: 0, y: 0 }
      });
    }

    // Clusters root
    if (cy.getElementById('clusters-root').empty()) {
      cy.add({
        group: 'nodes',
        data: {
          id: 'clusters-root',
          type: NodeType.CLUSTERS_ROOT,
          title: 'Clusters Root'
        },
        position: { x: 500, y: 0 }
      });
    }
  }

  // Add a note node
  addNote(note: Partial<Note>, parentId: string | null = null, clusterId: string | null = null): NodeSingular {
    const cy = this.getGraph();
    const id = note.id || generateNodeId();
    const isFolder = note.type === 'folder';
    const type = isFolder ? NodeType.FOLDER : NodeType.NOTE;
    
    // Check if this note already exists
    let noteNode = cy.getElementById(id);
    
    if (noteNode.empty()) {
      // Create new node
      noteNode = cy.add({
        group: 'nodes',
        data: {
          id,
          type,
          title: note.title || 'Untitled',
          content: note.content || [],
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || new Date().toISOString(),
          parentId,
          clusterId
        }
      })[0];

      // Random position if no parent
      if (!parentId) {
        noteNode.position({
          x: Math.random() * 500,
          y: Math.random() * 500
        });
      }
    }

    // Connect to parent
    if (parentId) {
      const parentNode = cy.getElementById(parentId);
      if (!parentNode.empty()) {
        // Check if edge already exists
        const edgeId = `${parentId}->${id}`;
        if (cy.getElementById(edgeId).empty()) {
          cy.add({
            group: 'edges',
            data: {
              id: edgeId,
              source: parentId,
              target: id,
              type: EdgeType.CONTAINS
            }
          });
        }
      }
    } else {
      // Connect to standard root if no parent
      const rootId = 'standard-root';
      const edgeId = `${rootId}->${id}`;
      if (cy.getElementById(edgeId).empty()) {
        cy.add({
          group: 'edges',
          data: {
            id: edgeId,
            source: rootId,
            target: id,
            type: EdgeType.CONTAINS
          }
        });
      }
    }

    // Connect to cluster
    if (clusterId) {
      this.connectNoteToCluster(id, clusterId);
    }

    // Add tags if present
    if (note.tags) {
      note.tags.forEach(tag => this.tagNote(id, tag));
    }

    // Add mentions if present
    if (note.mentions) {
      note.mentions.forEach(mention => this.addMention(id, mention));
    }

    // Add concepts if present
    if (note.concepts) {
      note.concepts.forEach(concept => this.addConcept(id, concept.type, concept.name));
    }

    return noteNode;
  }

  // Update a note
  updateNote(id: string, updates: Partial<Note>): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(id);
    
    if (noteNode.empty()) return false;

    // Update node data
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'parentId' && key !== 'clusterId') {
        noteNode.data(key, value);
      }
    }

    // Update updatedAt
    noteNode.data('updatedAt', new Date().toISOString());

    // Handle parent change
    if (updates.parentId !== undefined) {
      this.moveNode(id, updates.parentId);
    }

    // Handle cluster change
    if (updates.clusterId !== undefined) {
      this.connectNoteToCluster(id, updates.clusterId);
    }

    return true;
  }

  // Delete a note
  deleteNote(id: string): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(id);
    
    if (noteNode.empty()) return false;

    // If it's a folder, delete all children recursively
    if (noteNode.data('type') === NodeType.FOLDER) {
      const children = noteNode.outgoers(`edge[type = "${EdgeType.CONTAINS}"]`).targets();
      children.forEach(child => {
        this.deleteNote(child.id());
      });
    }

    // Remove node and its edges
    noteNode.remove();
    return true;
  }

  // Add a cluster
  addCluster(cluster: Partial<Cluster>): NodeSingular {
    const cy = this.getGraph();
    const id = cluster.id || generateNodeId();
    
    // Check if cluster definition exists
    let clusterDefNode = cy.getElementById(id);
    if (clusterDefNode.empty()) {
      clusterDefNode = cy.add({
        group: 'nodes',
        data: {
          id,
          type: NodeType.CLUSTER_DEFINITION,
          title: cluster.title || 'Untitled Cluster',
          createdAt: cluster.createdAt || new Date().toISOString(),
          updatedAt: cluster.updatedAt || new Date().toISOString()
        }
      })[0];
    }

    // Check if cluster root exists
    const clusterRootId = `${id}-root`;
    let clusterRootNode = cy.getElementById(clusterRootId);
    if (clusterRootNode.empty()) {
      clusterRootNode = cy.add({
        group: 'nodes',
        data: {
          id: clusterRootId,
          type: NodeType.CLUSTER_ROOT,
          title: `${cluster.title || 'Untitled'} Root`,
          clusterId: id
        }
      })[0];

      // Connect cluster root to clusters root
      cy.add({
        group: 'edges',
        data: {
          id: `clusters-root->${clusterRootId}`,
          source: 'clusters-root',
          target: clusterRootId,
          type: EdgeType.CONTAINS
        }
      });

      // Connect cluster definition to cluster root
      cy.add({
        group: 'edges',
        data: {
          id: `${id}->${clusterRootId}`,
          source: id,
          target: clusterRootId,
          type: EdgeType.CONTAINS
        }
      });
    }

    return clusterDefNode;
  }

  // Update a cluster
  updateCluster(id: string, updates: Partial<Cluster>): boolean {
    const cy = this.getGraph();
    const clusterNode = cy.getElementById(id);
    
    if (clusterNode.empty()) return false;

    // Update cluster data
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        clusterNode.data(key, value);
      }
    }

    // Update title of root node if title was updated
    if (updates.title) {
      const rootNode = cy.getElementById(`${id}-root`);
      if (!rootNode.empty()) {
        rootNode.data('title', `${updates.title} Root`);
      }
    }

    // Update updatedAt
    clusterNode.data('updatedAt', new Date().toISOString());

    return true;
  }

  // Delete a cluster
  deleteCluster(id: string): boolean {
    const cy = this.getGraph();
    const clusterNode = cy.getElementById(id);
    
    if (clusterNode.empty()) return false;

    // Get all notes in this cluster and remove cluster reference
    cy.nodes(`[clusterId = "${id}"]`).forEach(node => {
      node.data('clusterId', null);
    });

    // Delete cluster root
    const rootNode = cy.getElementById(`${id}-root`);
    if (!rootNode.empty()) {
      rootNode.remove();
    }

    // Delete cluster definition
    clusterNode.remove();
    return true;
  }

  // Connect a note to a cluster
  connectNoteToCluster(noteId: string, clusterId: string | null): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(noteId);
    
    if (noteNode.empty()) return false;

    // Remove existing cluster connections
    cy.edges(`[source = "${noteId}"][type = "${EdgeType.IN_CLUSTER}"]`).remove();
    
    // Update clusterId in node data
    noteNode.data('clusterId', clusterId);

    // If no cluster, we're done
    if (!clusterId) return true;

    // Connect to cluster root
    const clusterRootId = `${clusterId}-root`;
    const clusterRootNode = cy.getElementById(clusterRootId);
    
    if (!clusterRootNode.empty()) {
      cy.add({
        group: 'edges',
        data: {
          id: `${noteId}->${clusterRootId}`,
          source: noteId,
          target: clusterRootId,
          type: EdgeType.IN_CLUSTER
        }
      });
      return true;
    }

    return false;
  }

  // Move a node to a new parent
  moveNode(nodeId: string, newParentId: string | null = null): boolean {
    const cy = this.getGraph();
    const node = cy.getElementById(nodeId);
    
    if (node.empty()) return false;

    // Remove current parent edge
    cy.edges(`[target = "${nodeId}"][type = "${EdgeType.CONTAINS}"]`).remove();

    // Update parentId
    node.data('parentId', newParentId);
    
    // If no parent specified, connect to standard root
    if (!newParentId) {
      cy.add({
        group: 'edges',
        data: {
          id: `standard-root->${nodeId}`,
          source: 'standard-root',
          target: nodeId,
          type: EdgeType.CONTAINS
        }
      });
      return true;
    }

    // Connect to new parent
    const parentNode = cy.getElementById(newParentId);
    if (parentNode.empty()) return false;

    cy.add({
      group: 'edges',
      data: {
        id: `${newParentId}->${nodeId}`,
        source: newParentId,
        target: nodeId,
        type: EdgeType.CONTAINS
      }
    });

    return true;
  }

  // Tag a note
  tagNote(noteId: string, tagName: string): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(noteId);
    
    if (noteNode.empty()) return false;

    // Create tag if it doesn't exist
    const tagId = `tag-${slug(tagName)}`;
    let tagNode = cy.getElementById(tagId);
    
    if (tagNode.empty()) {
      tagNode = cy.add({
        group: 'nodes',
        data: {
          id: tagId,
          type: NodeType.TAG,
          title: tagName,
          name: tagName
        }
      })[0];
    }

    // Connect note to tag if not already connected
    const edgeId = `${noteId}->${tagId}`;
    if (cy.getElementById(edgeId).empty()) {
      cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: noteId,
          target: tagId,
          type: EdgeType.HAS_TAG
        }
      });
    }

    return true;
  }

  // Add a mention to a note
  addMention(noteId: string, mentionName: string): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(noteId);
    
    if (noteNode.empty()) return false;

    // Create mention if it doesn't exist
    const mentionId = `mention-${slug(mentionName)}`;
    let mentionNode = cy.getElementById(mentionId);
    
    if (mentionNode.empty()) {
      mentionNode = cy.add({
        group: 'nodes',
        data: {
          id: mentionId,
          type: NodeType.NOTE,
          title: mentionName,
          name: mentionName
        }
      })[0];
    }

    // Connect note to mention
    const edgeId = `${noteId}->${mentionId}`;
    if (cy.getElementById(edgeId).empty()) {
      cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: noteId,
          target: mentionId,
          type: EdgeType.MENTIONS
        }
      });
    }

    return true;
  }

  // Add a concept to a note
  addConcept(noteId: string, conceptType: string, conceptName: string): boolean {
    const cy = this.getGraph();
    const noteNode = cy.getElementById(noteId);
    
    if (noteNode.empty()) return false;

    // Create concept if it doesn't exist
    const conceptId = `concept-${slug(conceptType)}-${slug(conceptName)}`;
    let conceptNode = cy.getElementById(conceptId);
    
    if (conceptNode.empty()) {
      conceptNode = cy.add({
        group: 'nodes',
        data: {
          id: conceptId,
          type: NodeType.CONCEPT,
          title: conceptName,
          name: conceptName,
          conceptType
        }
      })[0];
    }

    // Connect note to concept
    const edgeId = `${noteId}->${conceptId}`;
    if (cy.getElementById(edgeId).empty()) {
      cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: noteId,
          target: conceptId,
          type: EdgeType.HAS_CONCEPT
        }
      });
    }

    return true;
  }

  // Search nodes by title or content
  searchNodes(query: string, types: NodeType[] = []): NodeCollection {
    const cy = this.getGraph();
    const lowerQuery = query.toLowerCase();
    
    let selector = '';
    
    if (types.length > 0) {
      const typeSelector = types.map(t => `[type = "${t}"]`).join(',');
      selector = `node${typeSelector}`;
    } else {
      selector = 'node';
    }

    return cy.nodes(selector).filter(node => {
      const title = (node.data('title') || '').toLowerCase();
      const content = JSON.stringify(node.data('content') || '').toLowerCase();
      
      return title.includes(lowerQuery) || content.includes(lowerQuery);
    });
  }

  // Get related nodes (connected by any edge)
  getRelatedNodes(nodeId: string): NodeCollection {
    const cy = this.getGraph();
    const node = cy.getElementById(nodeId);
    
    if (node.empty()) return cy.collection();

    return node.neighborhood().nodes();
  }

  // Get backlinks (nodes that point to this node)
  getBacklinks(nodeId: string): NodeCollection {
    const cy = this.getGraph();
    const node = cy.getElementById(nodeId);
    
    if (node.empty()) return cy.collection();

    return cy.edges(`[target = "${nodeId}"][type = "${EdgeType.NOTE_LINK}"]`).sources();
  }

  // Get connections of a note
  getConnections(noteId: string): Record<'tag' | 'concept' | 'mention', NodeCollection> {
    const cy = this.getGraph();
    const node = cy.getElementById(noteId);
    
    if (node.empty()) {
      return {
        tag: cy.collection(),
        concept: cy.collection(),
        mention: cy.collection()
      };
    }

    return {
      tag: node.outgoers(`edge[type = "${EdgeType.HAS_TAG}"]`).targets(),
      concept: node.outgoers(`edge[type = "${EdgeType.HAS_CONCEPT}"]`).targets(),
      mention: node.outgoers(`edge[type = "${EdgeType.MENTIONS}"]`).targets()
    };
  }

  // Import graph from JSON
  importGraph(graphData: GraphJSON): void {
    const cy = this.getGraph();
    cy.elements().remove();

    // Add elements
    if (graphData.elements) {
      cy.add(graphData.elements);
    }

    // Apply layout if specified
    if (graphData.layout) {
      const layout = cy.layout(graphData.layout);
      layout.run();
    }

    // Apply viewport if specified
    if (graphData.viewport) {
      cy.zoom(graphData.viewport.zoom);
      cy.pan(graphData.viewport.pan);
    }

    // Apply style if specified
    if (graphData.style) {
      cy.style(graphData.style);
    }
  }

  // Export graph to JSON
  exportGraph(options: { includeStyle?: boolean } = {}): GraphJSON {
    const cy = this.getGraph();
    
    const graph: GraphJSON = {
      meta: {
        app: 'Galaxy Notes',
        version: 1,
        exportedAt: new Date().toISOString()
      },
      elements: cy.elements().map(ele => ele.json())
    };

    // Include layout state
    graph.layout = { name: 'preset' };
    
    // Include viewport state
    graph.viewport = {
      zoom: cy.zoom(),
      pan: cy.pan()
    };

    // Include style if requested
    if (options.includeStyle) {
      graph.style = cy.style().json();
    }

    return graph;
  }

  // Export a single element to JSON
  exportElement(element: SingularElementArgument): CyElementJSON {
    return this.getGraph().elements(element).first().json();
  }

  // Import a single element
  importElement(elementJson: CyElementJSON): void {
    this.getGraph().add(elementJson);
  }
}

// Export a singleton instance
export const graphService = new GraphService();
