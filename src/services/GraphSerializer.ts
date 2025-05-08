
import { Core } from 'cytoscape';
import { 
  Node, 
  Relationship, 
  GraphDocument,
  Document
} from '@/lib/langchain-lite';
import { toNodeId, toRelationshipId, toDocumentId } from '@/lib/langchain-lite/adapters';

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
        return new Node({
          id: toNodeId(n.id()),
          type: nodeType,
          properties
        });
      }).toArray();
      
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
        return new Relationship({
          id: toRelationshipId(e.id()),
          source: sourceNode,
          target: targetNode,
          type: edgeData.label || "RELATED_TO",
          properties
        });
      }).toArray();
      
      // Create and return GraphDocument
      return new GraphDocument({
        nodes,
        relationships,
        source: doc
      });
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
        if (rootNode) this.cy.add(rootNode);
      });
      
      // Add nodes
      gd.nodes.forEach(n => {
        const nodeId = n.id.startsWith("node-") ? n.id.substring(5) : n.id;
        const { position, ...otherProperties } = n.properties;
        
        const nodeDefinition = {
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
      
      // Add edges
      gd.relationships.forEach(r => {
        const sourceId = r.source.id.startsWith("node-") ? r.source.id.substring(5) : r.source.id;
        const targetId = r.target.id.startsWith("node-") ? r.target.id.substring(5) : r.target.id;
        const edgeId = r.id.startsWith("rel-") ? r.id.substring(4) : r.id;
        
        const edgeDefinition = {
          group: 'edges',
          data: {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: r.type,
            ...r.properties
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
