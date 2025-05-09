
import { Serializable } from "./serializable";
import { GraphDocument } from "./graph";

/**
 * Abstract class for graph operations.
 * Concrete stores (e.g., Kuzu, Neo4j) should extend this and implement all
 * methods/getters.
 */
export abstract class GraphStore extends Serializable {
  /** Namespace tags (kept for symmetry with the rest of your graphion objects) */
  gn_namespace = ["graphion", "graph", "store"];

  /** Return the textual schema of the backing graph database. */
  abstract get schema(): string;

  /** Return a structured (JSON) view of the schema. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract get structuredSchema(): Record<string, any>;

  /**
   * Run an arbitrary query against the graph.
   * @param query  Cypher/KuzuQL/Gremlin/… depending on the implementation.
   * @param params Named parameters for the query.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract query(
    query: string,
    params?: Record<string, any>,
  ): Promise<Array<Record<string, any>>>;

  /** Refresh any cached schema metadata. */
  abstract refreshSchema(): Promise<void>;

  /**
   * Ingest one or more GraphDocument objects into the store.
   * @param graphDocuments Array of GraphDocument instances.
   * @param includeSource  If true, also persist the "source" Document payload.
   */
  abstract addGraphDocuments(
    graphDocuments: GraphDocument[],
    includeSource?: boolean,
  ): Promise<void>;
}
