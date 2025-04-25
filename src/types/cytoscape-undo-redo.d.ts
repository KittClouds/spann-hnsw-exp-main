
import { Core, ElementDefinition, Collection } from 'cytoscape';

declare module 'cytoscape' {
  interface Core {
    undoRedo(): {
      do: (actionName: string, args?: any) => void;
      undo: () => void;
      redo: () => void;
      action: (
        name: string,
        doFn: (...args: any[]) => any,
        undoFn: (state: any) => void
      ) => void;
    };
  }
}

declare module 'cytoscape-undo-redo' {
  const undoRedo: any;
  export default undoRedo;
}
