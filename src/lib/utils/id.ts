
// Generate new unique IDs for nodes in the graph
// This is a simple implementation for now, could be replaced with UUID v7 or similar

export function newNodeId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `node_${timestamp}_${random}`;
}
