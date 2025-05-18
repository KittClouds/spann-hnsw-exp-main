
import { Core, ElementDefinition } from 'cytoscape';
import { 
  GraphDocument,
  Document
} from '@/lib/langchain-lite';
import { toNodeId, toRelationshipId, toDocumentId } from '@/lib/langchain-lite/adapters';

// Define Node and Relationship types locally since they're not exported from langchain-lite
interface Node {
  id: string;
  type: string;
  properties: Record<string, any>;
}

interface Relationship {
  id: string;
  source: Node;
  target: Node;
  type: string;
  properties: Record<string, any>;
}

/**
 * GraphSerializer adapter handles conversion between Cytoscape's graph format
 * and the LangChain-inspired serializable graph format (GraphDocument).
 */
export class GraphSerializer {
  constructor(private cy: Core) {}

  /**
   * Convert a Cytoscape graph to a GraphDocument
   * @param doc Source document that will be associated with the graph
   * @returns A GraphDocument containing the graph data
   */
  public toGraphDocument(doc: Document): GraphDocument {
    try {
      // Create Node objects from Cytoscape nodes
      const nodes: Node[] = this.cy.nodes().map(n => {
        const nodeData = n.data();
        const nodePosition = n.position();
        
        // Extract type or use default
        const nodeType = nodeData.type || "Node";
        
        // Create properties object with all node data and position
        const properties = {
          ...nodeData,
          position: nodePosition
        };
        
        // Create Node object
        return {
          id: toNodeId(n.id()),
          type: nodeType,
          properties
        };
      });
      
      // Get a Map of node IDs to Node objects for quick lookup when creating relationships
      const nodeMap = new Map<string, Node>();
      nodes.forEach(node => nodeMap.set(node.id, node));
      
      // Create Relationship objects from Cytoscape edges
      const relationships: Relationship[] = this.cy.edges().map(e => {
        const edgeData = e.data();
        
        // Get source and target nodes
        const sourceId = toNodeId(edgeData.source);
        const targetId = toNodeId(edgeData.target);
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);
        
        if (!sourceNode || !targetNode) {
          throw new Error(`Could not find source or target node for edge ${e.id()}`);
        }
        
        // Create properties object with all edge data
        const properties = { ...edgeData };
        
        // Create Relationship object
        return {
          id: toRelationshipId(e.id()),
          source: sourceNode,
          target: targetNode,
          type: edgeData.label || "RELATED_TO",
          properties
        };
      });
      
      // Create and return GraphDocument with the appropriate structure
      return new GraphDocument(
        nodes.map(node => ({
          id: node.id,
          type: node.type,
          properties: node.properties
        })), 
        relationships.map(rel => ({
          source: rel.source.id,
          target: rel.target.id,
          type: rel.type,
          properties: rel.properties
        })),
        {},
        doc
      );
    } catch (error) {
      console.error("Error converting graph to GraphDocument:", error);
      throw error;
    }
  }
  
  /**
   * Import a GraphDocument into the Cytoscape instance
   * @param gd The GraphDocument to import
   */
  public fromGraphDocument(gd: GraphDocument): void {
    try {
      this.cy.startBatch();
      
      // Store original root nodes to preserve them
      const rootNodeIds = ["standard_root", "clusters_root"].filter(
        id => this.cy.getElementById(id).length > 0
      );
      const rootNodes = rootNodeIds.map(id => this.cy.getElementById(id).json());
      
      // Clear existing elements
      this.cy.elements().remove();
      
      // Re-add root nodes if they existed
      rootNodes.forEach(rootNode => {
        if (rootNode) this.cy.add(rootNode as ElementDefinition);
      });
      
      // Add nodes from vertices
      gd.vertices.forEach(n => {
        const nodeId = n.id.startsWith("node-") ? n.id.substring(5) : n.id;
        const { position, ...otherProperties } = n.properties;
        
        const nodeDefinition: ElementDefinition = {
          group: 'nodes',
          data: {
            id: nodeId,
            type: n.type,
            ...otherProperties
          },
          position: position
        };
        
        this.cy.add(nodeDefinition);
      });
      
      // Add edges from the graph document
      gd.edges.forEach(r => {
        const sourceId = r.source.startsWith("node-") ? r.source.substring(5) : r.source;
        const targetId = r.target.startsWith("node-") ? r.target.substring(5) : r.target;
        const edgeId = r.type + "-" + sourceId + "-" + targetId;
        
        const edgeDefinition: ElementDefinition = {
          group: 'edges',
          data: {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: r.type,
            ...(r.properties || {})
          }
        };
        
        this.cy.add(edgeDefinition);
      });
      
      this.cy.endBatch();
    } catch (error) {
      console.error("Error importing GraphDocument into Cytoscape:", error);
      throw error;
    }
  }
}

export default GraphSerializer;
