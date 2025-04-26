
import { Core, ElementDefinition, Collection } from 'cytoscape';

declare module 'cytoscape' {
  interface Core {
    undoRedo(): {
      do: (actionName: string, args?: any) => Collection;
      undo: () => void;
      redo: () => void;
      action: (
        name: string,
        doFn: (args: any) => any,
        undoFn: (args: any) => void
      ) => void;
      lastAction: () => { name: string; result: any } | undefined;
    };
  }
}

declare module 'cytoscape-undo-redo' {
  const undoRedo: any;
  export default undoRedo;
}
