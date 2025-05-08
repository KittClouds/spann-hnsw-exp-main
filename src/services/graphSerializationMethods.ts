
import { Core } from 'cytoscape';
import { Document, GraphDocument } from '@/lib/langchain-lite';
import { GraphSerializer } from './GraphSerializer';
import { generateDocumentId } from '@/lib/utils/ids';

/**
 * Extension methods for GraphService to handle serialization and deserialization
 * of graph data to/from GraphDocument format
 */
export const graphSerializationMethods = {
  /**
   * Convert the current graph to a serializable GraphDocument
   * @param cy Cytoscape instance
   * @param sourceText Optional source document text content
   * @param sourceMetadata Optional source document metadata
   * @returns A GraphDocument containing the serialized graph
   */
  toSerializableGraph(
    cy: Core, 
    sourceText: string = "", 
    sourceMetadata: Record<string, any> = {}
  ): GraphDocument {
    // Create a Document to serve as the source for the GraphDocument
    const doc = new Document({
      id: generateDocumentId(),
      pageContent: sourceText,
      metadata: {
        createdAt: new Date().toISOString(),
        ...sourceMetadata
      }
    });
    
    // Use the serializer to convert to GraphDocument
    const serializer = new GraphSerializer(cy);
    return serializer.toGraphDocument(doc);
  },
  
  /**
   * Import a GraphDocument into the Cytoscape instance
   * @param cy Cytoscape instance
   * @param graphDoc The GraphDocument to import
   * @returns True if import was successful
   */
  fromSerializableGraph(cy: Core, graphDoc: GraphDocument): boolean {
    try {
      const serializer = new GraphSerializer(cy);
      serializer.fromGraphDocument(graphDoc);
      return true;
    } catch (error) {
      console.error("Error importing serializable graph:", error);
      return false;
    }
  }
};
