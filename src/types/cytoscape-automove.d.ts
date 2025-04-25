
import { Core } from 'cytoscape';

// Extend the Core interface with the automove method provided by the cytoscape-automove plugin
declare module 'cytoscape' {
  interface Core {
    automove(options: {
      nodesMatching: string;
      reposition: 'drag' | 'mean' | 'viewport';
      dragWith?: string;
      when?: 'matching' | 'always' | 'custom';
    }): any;
  }
}

// Make sure the module can be imported
declare module 'cytoscape-automove' {
  const automove: any;
  export default automove;
}
