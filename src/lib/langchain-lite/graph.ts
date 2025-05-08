
import { Serializable } from "./serializable";
import { Document } from "./document";
import { NodeId, generateNodeId, RelationshipId, generateRelationshipId } from "../utils/ids";

export class Node extends Serializable {
  id: NodeId;
  type: string;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;

  // Update namespace to reflect our app
  gn_namespace = ["graphion", "graph", "node"];

  constructor({
    id,
    type = "Node",
    properties = {},
  }: {
    id?: NodeId;
    type?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: Record<string, any>;
  }) {
    super();
    this.id = id || generateNodeId();
    this.type = type;
    this.properties = properties;
  }
}

export class Relationship extends Serializable {
  id: RelationshipId;
  source: Node;
  target: Node;
  type: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;

  // Update namespace to reflect our app
  gn_namespace = ["graphion", "graph", "relationship"];

  constructor({
    id,
    source,
    target,
    type,
    properties = {},
  }: {
    id?: RelationshipId;
    source: Node;
    target: Node;
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: Record<string, any>;
  }) {
    super();
    this.id = id || generateRelationshipId();
    this.source = source;
    this.target = target;
    this.type = type;
    this.properties = properties;
  }
}

export class GraphDocument extends Serializable {
  nodes: Node[];
  relationships: Relationship[];
  source: Document;

  // Update namespace to reflect our app
  gn_namespace = ["graphion", "graph", "document"];

  constructor({
    nodes,
    relationships,
    source,
  }: {
    nodes: Node[];
    relationships: Relationship[];
    source: Document;
  }) {
    super({
      nodes,
      relationships,
      source,
    });
    this.nodes = nodes;
    this.relationships = relationships;
    this.source = source;
  }
}
