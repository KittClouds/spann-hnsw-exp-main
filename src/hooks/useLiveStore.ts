
import { useStore } from '@livestore/react';
import { 
  activeNoteId$, 
  activeClusterId$, 
  activeThreadId$,
  activeNote$,
  notes$,
  clusters$,
  activeClusterNotes$,
  standardNotes$,
  activeNoteConnections$,
  entityAttributes$,
  blueprints$
} from '../livestore/queries';
import { events } from '../livestore/schema';

// Custom hooks that wrap LiveStore usage with proper typing
export function useActiveNoteId() {
  const { store } = useStore();
  const activeNoteId = store.useQuery(activeNoteId$);
  
  const setActiveNoteId = (id: string | null) => {
    store.commit(events.uiStateSet({ 
      activeNoteId: id,
      activeClusterId: store.query(activeClusterId$),
      activeThreadId: store.query(activeThreadId$),
      graphInitialized: false,
      graphLayout: 'dagre'
    }));
  };

  return [activeNoteId, setActiveNoteId] as const;
}

export function useActiveClusterId() {
  const { store } = useStore();
  const activeClusterId = store.useQuery(activeClusterId$);
  
  const setActiveClusterId = (id: string) => {
    store.commit(events.uiStateSet({ 
      activeNoteId: store.query(activeNoteId$),
      activeClusterId: id,
      activeThreadId: store.query(activeThreadId$),
      graphInitialized: false,
      graphLayout: 'dagre'
    }));
  };

  return [activeClusterId, setActiveClusterId] as const;
}

export function useActiveNote() {
  const { store } = useStore();
  return store.useQuery(activeNote$);
}

export function useNotes() {
  const { store } = useStore();
  const notes = store.useQuery(notes$);
  return Array.isArray(notes) ? notes : [];
}

export function useClusters() {
  const { store } = useStore();
  const clusters = store.useQuery(clusters$);
  return Array.isArray(clusters) ? clusters : [];
}

export function useActiveClusterNotes() {
  const { store } = useStore();
  const notes = store.useQuery(activeClusterNotes$);
  return Array.isArray(notes) ? notes : [];
}

export function useStandardNotes() {
  const { store } = useStore();
  const notes = store.useQuery(standardNotes$);
  return Array.isArray(notes) ? notes : [];
}

export function useActiveNoteConnections() {
  const { store } = useStore();
  return store.useQuery(activeNoteConnections$);
}

export function useEntityAttributes() {
  const { store } = useStore();
  const attrs = store.useQuery(entityAttributes$);
  return Array.isArray(attrs) ? attrs : [];
}

export function useBlueprintsArray() {
  const { store } = useStore();
  const blueprints = store.useQuery(blueprints$);
  return Array.isArray(blueprints) ? blueprints : [];
}

// Helper to commit note updates
export function useNoteActions() {
  const { store } = useStore();
  
  const updateNote = (id: string, updates: any) => {
    store.commit(events.noteUpdated({
      id,
      updates,
      updatedAt: new Date().toISOString()
    }));
  };

  // Silent persistence - updates data without triggering re-renders
  const persistNoteSilently = (id: string, content: any) => {
    // Check if the silent update event exists, otherwise fall back to regular update
    if (events.noteContentSilentlyUpdated) {
      store.commit(events.noteContentSilentlyUpdated({
        id,
        content,
        updatedAt: new Date().toISOString()
      }));
    } else {
      // Fallback to regular update if silent event doesn't exist
      console.warn('Silent update event not available, using regular update');
      store.commit(events.noteUpdated({
        id,
        updates: { content },
        updatedAt: new Date().toISOString()
      }));
    }
  };

  const createNote = (note: any) => {
    store.commit(events.noteCreated(note));
  };

  const deleteNote = (id: string) => {
    store.commit(events.noteDeleted({ id }));
  };

  const createCluster = (cluster: any) => {
    store.commit(events.clusterCreated(cluster));
  };

  const updateCluster = (id: string, updates: any) => {
    store.commit(events.clusterUpdated({
      id,
      updates,
      updatedAt: new Date().toISOString()
    }));
  };

  const deleteCluster = (id: string) => {
    store.commit(events.clusterDeleted({ id }));
  };

  return { 
    updateNote, 
    persistNoteSilently,
    createNote, 
    deleteNote,
    createCluster,
    updateCluster,
    deleteCluster
  };
}
