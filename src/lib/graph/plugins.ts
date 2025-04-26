
import cytoscape from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';

/**
 * Initialize Cytoscape plugins
 */
export const initPlugins = (): void => {
  if (!cytoscape.prototype.hasInitializedPlugins) {
    cytoscape.use(automove);
    cytoscape.use(undoRedo);
    
    // Flag to avoid registering plugins multiple times
    cytoscape.prototype.hasInitializedPlugins = true;
  }
};

/**
 * Setup automove functionality for a Cytoscape instance
 */
export const setupAutomove = (cy: cytoscape.Core): void => {
  (cy as any).automove({
    nodesMatching: 'node[type = "note"]',
    reposition: 'drag',
    dragWith: 'node[type = "folder"]'
  });
};
