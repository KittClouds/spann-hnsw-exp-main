
import { Document } from "./document";
import { Serializable } from "./serializable";
import { mapKeys } from "./map_keys";

/**
 * An edge between two named vertices
 */
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

/**
 * A vertex (node) in a graph
 */
export interface GraphVertex {
  id: string;
  type: string;
  properties: Record<string, any>;
}

/**
 * A document containing a graph representation
 */
export class GraphDocument extends Serializable {
  gn_namespace = ["graphion", "graph", "document"];
  
  /**
   * The source document this graph was created from, if any
   */
  source?: Document;
  
  /**
   * Vertices (nodes) in the graph
   */
  vertices: GraphVertex[] = [];
  
  /**
   * Edges in the graph
   */
  edges: GraphEdge[] = [];
  
  /**
   * Metadata about the graph
   */
  metadata: Record<string, any> = {};

  /**
   * Create a new GraphDocument
   */
  constructor(vertices: GraphVertex[] = [], edges: GraphEdge[] = [], metadata: Record<string, any> = {}, source?: Document) {
    super();
    this.vertices = vertices;
    this.edges = edges;
    this.metadata = metadata;
    this.source = source;
  }

  /**
   * Convert a GraphDocument to a JSON object
   */
  toJSON(): Record<string, any> {
    return {
      gn_id: this.gn_id,
      gn_namespace: this.gn_namespace,
      vertices: this.vertices,
      edges: this.edges,
      metadata: this.metadata,
      source: this.source ? this.source : undefined
    };
  }

  /**
   * Create a GraphDocument from a JSON object
   */
  static fromJSON(data: Record<string, any>): GraphDocument {
    const vertices = data.vertices || [];
    const edges = data.edges || [];
    const metadata = data.metadata || {};
    let source: Document | undefined;
    
    if (data.source) {
      // Fix: Create a new Document manually since Document.fromJSON doesn't exist
      source = new Document({
        pageContent: data.source.pageContent || "",
        metadata: data.source.metadata || {},
        id: data.source.id
      });
    }
    
    const result = new GraphDocument(vertices, edges, metadata, source);
    if (data.gn_id) {
      result.gn_id = data.gn_id;
    }
    
    return result;
  }
  
  /**
   * Get a vertex by ID
   */
  getVertex(id: string): GraphVertex | undefined {
    return this.vertices.find(v => v.id === id);
  }
  
  /**
   * Add a vertex to the graph
   */
  addVertex(vertex: GraphVertex): GraphVertex {
    // Check if vertex with this ID already exists
    const existing = this.getVertex(vertex.id);
    if (existing) {
      // Update properties of existing vertex
      existing.properties = { ...existing.properties, ...vertex.properties };
      return existing;
    }
    
    // Add new vertex
    this.vertices.push(vertex);
    return vertex;
  }
  
  /**
   * Add an edge to the graph
   */
  addEdge(edge: GraphEdge): GraphEdge {
    // We don't check for duplicates for simplicity, but could be added
    this.edges.push(edge);
    return edge;
  }
  
  /**
   * Return a copy of this graph document with renamed property keys according to the mapping
   */
  renameProperties(mapping: Record<string, string>): GraphDocument {
    const result = this.copy() as GraphDocument;
    
    // Create a key mapper function that uses the mapping record
    const keyMapper = (key: string) => mapping[key] || key;
    
    // Map vertex properties
    result.vertices = this.vertices.map(v => ({
      ...v,
      properties: mapKeys(v.properties, keyMapper)
    }));
    
    // Map edge properties
    result.edges = this.edges.map(e => ({
      ...e,
      properties: e.properties ? mapKeys(e.properties, keyMapper) : undefined
    }));
    
    // Map metadata
    result.metadata = mapKeys(this.metadata, keyMapper);
    
    return result;
  }
  
  /**
   * Check if the graph document is valid
   * A valid graph has vertices for all edge sources and targets
   */
  validate(): boolean {
    // First check if superclass validation passes
    if (!super.validate()) return false;
    
    // Get all vertex IDs
    const vertexIds = new Set(this.vertices.map(v => v.id));
    
    // Check if all edges reference valid vertices
    for (const edge of this.edges) {
      if (!vertexIds.has(edge.source) || !vertexIds.has(edge.target)) {
        return false;
      }
    }
    
    return true;
  }
}
