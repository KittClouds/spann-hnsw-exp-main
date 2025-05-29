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
    // Use a special event that doesn't trigger reactive updates during active editing
    // This mutates the underlying data but keeps the same object reference
    const currentNotes = store.query(notes$);
    const noteIndex = currentNotes.findIndex(note => note.id === id);
    
    if (noteIndex !== -1) {
      // Direct mutation to avoid triggering reactive subscriptions
      const note = currentNotes[noteIndex];
      note.content = content;
      note.updatedAt = new Date().toISOString();
      
      // Commit a silent update that won't cause component re-renders
      store.commit(events.noteContentSilentlyUpdated({
        id,
        content,
        updatedAt: note.updatedAt
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
