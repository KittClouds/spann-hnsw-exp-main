
import cytoscape from 'cytoscape';
import automove from 'cytoscape-automove';
import undoRedo from 'cytoscape-undo-redo';

// Register plugins
cytoscape.use(automove);
cytoscape.use(undoRedo);

export { cytoscape };
