
// Re-export all the graph-related types and functionality
import { GraphService } from './GraphService';
import { IGraphService } from './IGraphService';
import { 
  NodeType, 
  EdgeType, 
  CyElementJSON, 
  GraphJSON, 
  GraphMeta,
  ChangeListener,
  ConnectionTypes,
  ConnectionsResult
} from './types';

// Create and export the main graph service instance
export * from './context';
export * from './types';
export * from './utils';
export type { IGraphService };

// Create and export a singleton instance
export const graphService = new GraphService();

export default graphService;
